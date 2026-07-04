"use client";

// Server-confirmed premium access + AI prose, per reading.
//
// The gate never trusts a local flag for what it RENDERS: with an entitlement
// present it asks /api/reading to validate the signed token, and the premium
// payloads (AI prose, and the deterministic natal answers) come from that
// server response — not from client computation. If the token went stale (e.g.
// the server rotated its secret), the stored payment REF is re-verified via
// /api/pay/verify to mint a fresh token; the purchase is the durable proof.

import { useEffect, useRef, useState } from "react";
import { readEntitlement, refreshEntitlementToken, useEntitlement } from "./entitlement";
import type { ChartInput } from "./astro/types";
import type { LoveAnswer } from "./astro/natalReading";
import type { CoupleProse, NatalProse } from "./server/writer";

export type GateState = "locked" | "checking" | "open";

export interface ReadingRequest {
  mode: "couple" | "natal" | "love";
  a?: ChartInput;
  b?: ChartInput;
  locale: string;
}

interface ReadingResponse {
  entitled: boolean;
  proseAvailable: boolean;
  prose?: CoupleProse | NatalProse | null;
  natalAnswers?: LoveAnswer[] | null;
}

const PROSE_TIMEOUT_MS = 118_000; // just under the route's maxDuration
const GATE_TIMEOUT_MS = 15_000;

async function callReading(req: ReadingRequest, wantProse: boolean, timeoutMs: number): Promise<ReadingResponse | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("/api/reading/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, entitlement: readEntitlement() ?? undefined, wantProse }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // network error or timeout → caller falls back to templates
  } finally {
    clearTimeout(timer);
  }
}

/** Try to mint a fresh token from the stored ref (post secret-rotation). */
async function reverify(): Promise<boolean> {
  const ent = readEntitlement();
  if (!ent?.ref) return false;
  try {
    const res = await fetch(`/api/pay/verify/?ref=${encodeURIComponent(ent.ref)}`);
    const d = await res.json();
    if (d?.verified && d?.token) {
      refreshEntitlementToken(String(d.token));
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

export interface ReadingResult {
  gate: GateState;
  prose: CoupleProse | NatalProse | null;
  proseLoading: boolean;
  natalAnswers: LoveAnswer[] | null;
}

/** Server-confirmed gate + prose for the current reading. `req` must be
 *  reference-stable per reading (memoize upstream via a key). */
export function useReading(req: ReadingRequest | null): ReadingResult {
  const ent = useEntitlement();
  // Seed optimistically so an entitled returning visitor doesn't see the
  // paywall flash before the async confirm resolves (fix: paywall flash). The
  // server still has final say — we downgrade to "locked" only if it rejects.
  const [gate, setGate] = useState<GateState>(() => (typeof window !== "undefined" && readEntitlement() ? "checking" : "locked"));
  const [prose, setProse] = useState<CoupleProse | NatalProse | null>(null);
  const [proseLoading, setProseLoading] = useState(false);
  const [natalAnswers, setNatalAnswers] = useState<LoveAnswer[] | null>(null);
  const runRef = useRef(0);

  const reqKey = req ? JSON.stringify([req.mode, req.a ?? null, req.b ?? null, req.locale]) : null;

  useEffect(() => {
    const myRun = ++runRef.current;
    setProse(null);
    setNatalAnswers(null);
    if (!req || !ent) {
      setGate("locked");
      setProseLoading(false);
      return;
    }
    setGate("checking");
    (async () => {
      // 1. Fast gate check (no prose) so premium cards open promptly.
      let d = await callReading(req, false, GATE_TIMEOUT_MS);
      if (myRun !== runRef.current) return;
      if (d && !d.entitled) {
        // Token stale? Re-verify the paid ref once, then retry.
        if (await reverify()) d = await callReading(req, false, GATE_TIMEOUT_MS);
        if (myRun !== runRef.current) return;
      }
      if (!d || !d.entitled) {
        setGate("locked");
        return;
      }
      setGate("open");
      if (d.natalAnswers) setNatalAnswers(d.natalAnswers);

      // 2. Fetch the AI reading in the background (may take a while; the
      //    deterministic cards are already open). The chart-less "love" mode
      //    has no prose, so skip the second call for it.
      if (d.proseAvailable && req.mode !== "love") {
        setProseLoading(true);
        const withProse = await callReading(req, true, PROSE_TIMEOUT_MS);
        if (myRun !== runRef.current) return;
        setProseLoading(false);
        if (withProse?.entitled) {
          if (withProse.prose) setProse(withProse.prose);
          if (withProse.natalAnswers) setNatalAnswers(withProse.natalAnswers);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqKey, ent?.token]);

  return { gate, prose, proseLoading, natalAnswers };
}
