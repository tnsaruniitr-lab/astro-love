// Server-side entitlement tokens (HMAC-signed, stateless).
//
// The durable proof of purchase is the payment REF — it can always be
// re-verified against the payment service. A token is a signed CACHE of
// "this ref was verified paid", so premium endpoints don't have to call the
// payment service on every request. Tokens are revocable by rotating
// ENTITLEMENT_SECRET; losing one is harmless (re-verify the ref).
//
// Without ENTITLEMENT_SECRET set, a per-boot random secret is used: tokens
// then expire on restart, and clients transparently re-verify their stored
// ref to get a fresh one. Set the env var in production to avoid that hop.

import crypto from "crypto";

// Fail fast at RUNTIME (server start / first request), never during
// `next build` — the build collects route metadata with NODE_ENV=production but
// no secrets, and should not require them. An ephemeral secret in production
// means tokens minted on one instance (or before a restart) are rejected
// everywhere else, flapping the paywall and hammering the upstream verify, so a
// stable shared secret is required to actually serve traffic.
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";
if (!process.env.ENTITLEMENT_SECRET && process.env.NODE_ENV === "production" && !IS_BUILD) {
  throw new Error("ENTITLEMENT_SECRET must be set in production (a stable, shared secret across all instances).");
}

const secret: string =
  process.env.ENTITLEMENT_SECRET || crypto.randomBytes(32).toString("hex");

if (!process.env.ENTITLEMENT_SECRET) {
  console.warn("[entitlement] ENTITLEMENT_SECRET not set (dev) — tokens won't survive a restart.");
}

// Entitlement tokens are bearer credentials (localStorage + request bodies), so
// they must not grant premium forever if leaked. A stale token self-heals: the
// client re-verifies its stored payment ref to mint a fresh one.
const MAX_AGE_MS = Number(process.env.ENTITLEMENT_MAX_AGE_MS ?? 180 * 24 * 60 * 60 * 1000); // 180 days

export interface EntitlementClaims {
  ref: string;
  product: string;
  iat: number; // epoch ms
}

const b64u = (b: Buffer) => b.toString("base64url");

export function mintEntitlement(ref: string, product: string): string {
  const payload = b64u(Buffer.from(JSON.stringify({ ref, product, iat: Date.now() } satisfies EntitlementClaims)));
  const sig = b64u(crypto.createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

/** Returns the claims when the token is authentic and for this product; null otherwise. */
export function verifyEntitlement(token: string | null | undefined, product: string): EntitlementClaims | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = b64u(crypto.createHmac("sha256", secret).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as EntitlementClaims;
    if (!claims || typeof claims.ref !== "string" || claims.product !== product) return null;
    if (typeof claims.iat !== "number" || !Number.isFinite(claims.iat)) return null;
    if (Date.now() - claims.iat > MAX_AGE_MS) return null; // expired — client re-verifies the ref
    return claims;
  } catch {
    return null;
  }
}
