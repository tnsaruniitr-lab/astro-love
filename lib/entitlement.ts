"use client";

// Single global unlock for the whole device. One $2 purchase opens the full
// reading across every flow (compatibility, natal, love language). The flag is
// only ever set after the return page confirms the payment server-side; the gate
// reads it reactively so a successful unlock reveals content without a reload.

import { useEffect, useState } from "react";

const KEY = "am_unlocked";

export function readUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function grantUnlock(): void {
  try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event("am-unlock")); } catch { /* ignore */ }
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
    window.addEventListener("am-unlock", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("am-unlock", sync);
    };
  }, []);
  return unlocked;
}
