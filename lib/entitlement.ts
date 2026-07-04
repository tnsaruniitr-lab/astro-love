"use client";

// Client-side entitlement state. One $2 purchase opens the full reading
// across every flow on the device.
//
// What is stored is a signed {ref, token} pair handed out by
// /api/pay/verify AFTER a fail-closed server-side check — not a bare
// boolean. The token is what premium endpoints (/api/reading) accept; the
// ref is the durable proof that can always be re-verified upstream (e.g.
// after the server rotates its secret), so losing a token self-heals.
//
// The legacy "am_unlocked" boolean is deliberately IGNORED — honoring it
// would preserve the one-line devtools bypass this design exists to close.
// A legacy purchaser restores by opening their keep-link (?paid=<ref>),
// which re-verifies the payment server-side and mints a real token.

import { useEffect, useState } from "react";

const ENT_KEY = "am_entitlement";
const EVENT = "am-unlock";

export interface Entitlement {
  ref: string;
  token: string;
}

export function readEntitlement(): Entitlement | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ENT_KEY);
    if (!raw) return null;
    const ent = JSON.parse(raw) as Entitlement;
    if (typeof ent?.ref === "string" && typeof ent?.token === "string") return ent;
    return null;
  } catch {
    return null;
  }
}

export function grantEntitlement(ent: Entitlement): void {
  try { localStorage.setItem(ENT_KEY, JSON.stringify(ent)); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* ignore */ }
}

/** Replace a stale token (e.g. after a server secret rotation) for the same ref. */
export function refreshEntitlementToken(token: string): void {
  const ent = readEntitlement();
  if (ent) grantEntitlement({ ...ent, token });
}

export function readUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return readEntitlement() !== null;
}

/** Reactive unlock state. Renders `false` on the server and the first client
 *  paint so SSR markup matches (premium content never ships in the HTML), then
 *  resolves from localStorage after mount and on any later unlock event. */
export function useUnlocked(): boolean {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    const sync = () => setUnlocked(readUnlocked());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  return unlocked;
}

/** Reactive entitlement (null until granted). */
export function useEntitlement(): Entitlement | null {
  const [ent, setEnt] = useState<Entitlement | null>(null);
  useEffect(() => {
    const sync = () => setEnt(readEntitlement());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  return ent;
}
