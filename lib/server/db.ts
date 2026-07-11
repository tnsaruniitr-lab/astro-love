// Postgres persistence (Railway) — the purchase ledger + reading outcomes.
//
// Philosophy: the DB is an ENHANCEMENT, never a dependency. Every call here is
// wrapped so a missing DATABASE_URL or a db hiccup degrades to the previous
// stateless behavior (HMAC entitlement, in-memory prose cache) instead of
// breaking a payment or a reading. Schema is created lazily on first use.
//
// Tables:
//   purchases  — who paid: one row per verified payment ref, with the payment
//                processor ids echoed by the CareCompass/Apple Pay verify.
//                (Buyer email/name aren't exposed by the upstream yet.)
//   readings   — outcomes: every computed reading (couple/natal), inputs,
//                score summary, and the AI prose once written — which also
//                makes the prose cache durable across deploys/instances.

import { Pool } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): Pool | null {
  if (!dbAvailable()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    pool.on("error", (e) => console.error("[db] pool error:", e.message));
  }
  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS purchases (
  ref            text PRIMARY KEY,
  product        text NOT NULL,
  amount         integer,
  currency       text,
  payment_id     text,
  order_id       text,
  first_paid_at  timestamptz NOT NULL DEFAULT now(),
  redeem_count   integer NOT NULL DEFAULT 1,
  last_redeemed  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS readings (
  id             bigserial PRIMARY KEY,
  kind           text NOT NULL,            -- 'couple' | 'natal'
  input_hash     text NOT NULL,            -- sha256 of (kind, inputs, locale)
  locale         text NOT NULL,
  inputs         jsonb NOT NULL,           -- birth inputs (server-side only)
  summary        jsonb,                    -- score/band/axes/archetype
  prose          jsonb,                    -- AI prose when generated
  prose_model    text,
  purchase_ref   text,                     -- set when an entitled ref was used
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS readings_hash_idx ON readings (input_hash);
CREATE INDEX IF NOT EXISTS readings_purchase_idx ON readings (purchase_ref);
`;

async function ready(): Promise<Pool | null> {
  const p = getPool();
  if (!p) return null;
  if (!schemaReady) {
    schemaReady = p
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        console.error("[db] schema init failed:", e.message);
        schemaReady = null; // retry on next call
        throw e;
      });
  }
  try {
    await schemaReady;
    return p;
  } catch {
    return null;
  }
}

/** Record (or re-record) a verified payment. Idempotent on ref; re-verifies
 *  bump redeem_count so unusual replay patterns are visible in the ledger. */
export async function recordPurchase(rec: {
  ref: string;
  product: string;
  amount?: number | null;
  currency?: string | null;
  paymentId?: string | null;
  orderId?: string | null;
}): Promise<void> {
  try {
    const p = await ready();
    if (!p) return;
    await p.query(
      `INSERT INTO purchases (ref, product, amount, currency, payment_id, order_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (ref) DO UPDATE
         SET redeem_count = purchases.redeem_count + 1,
             last_redeemed = now(),
             payment_id = COALESCE(purchases.payment_id, EXCLUDED.payment_id),
             order_id = COALESCE(purchases.order_id, EXCLUDED.order_id)`,
      [rec.ref, rec.product, rec.amount ?? null, rec.currency ?? null, rec.paymentId ?? null, rec.orderId ?? null],
    );
  } catch (e) {
    console.error("[db] recordPurchase failed:", e instanceof Error ? e.message : e);
  }
}

/** Upsert a reading outcome; keeps the first row per input_hash and fills in
 *  prose/summary/purchase_ref as they become available. */
export async function recordReading(rec: {
  kind: "couple" | "natal";
  inputHash: string;
  locale: string;
  inputs: unknown;
  summary?: unknown;
  prose?: unknown;
  proseModel?: string | null;
  purchaseRef?: string | null;
}): Promise<void> {
  try {
    const p = await ready();
    if (!p) return;
    await p.query(
      `INSERT INTO readings (kind, input_hash, locale, inputs, summary, prose, prose_model, purchase_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (input_hash) DO UPDATE
         SET prose = COALESCE(EXCLUDED.prose, readings.prose),
             prose_model = COALESCE(EXCLUDED.prose_model, readings.prose_model),
             summary = COALESCE(EXCLUDED.summary, readings.summary),
             purchase_ref = COALESCE(readings.purchase_ref, EXCLUDED.purchase_ref),
             updated_at = now()`,
      [
        rec.kind,
        rec.inputHash,
        rec.locale,
        JSON.stringify(rec.inputs),
        rec.summary != null ? JSON.stringify(rec.summary) : null,
        rec.prose != null ? JSON.stringify(rec.prose) : null,
        rec.proseModel ?? null,
        rec.purchaseRef ?? null,
      ],
    );
  } catch (e) {
    console.error("[db] recordReading failed:", e instanceof Error ? e.message : e);
  }
}

/** Durable prose lookup — survives deploys, shared across instances. */
export async function loadProse<T>(inputHash: string): Promise<T | null> {
  try {
    const p = await ready();
    if (!p) return null;
    const r = await p.query(`SELECT prose FROM readings WHERE input_hash = $1 AND prose IS NOT NULL`, [inputHash]);
    return (r.rows[0]?.prose as T) ?? null;
  } catch {
    return null;
  }
}
