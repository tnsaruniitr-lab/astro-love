"use client";

import { useEffect } from "react";
import { readUnlocked, grantUnlock } from "@/lib/entitlement";

// Makes a paid reading portable. Any link that carries ?paid=<ref> (handed out
// on the success screen, savable / shareable) re-verifies that ref server-side
// on load and, if it really was paid, unlocks this device too. Secure because
// entitlement is decided by /api/pay/verify, never by the URL alone. The param
// is stripped afterward so it isn't kept or re-shared by accident.
export default function UnlockOnReturn() {
  useEffect(() => {
    if (readUnlocked()) { stripParam(); return; }
    const ref = new URLSearchParams(window.location.search).get("paid");
    if (!ref) return;

    let done = false;
    fetch(`/api/pay/verify/?ref=${encodeURIComponent(ref)}`)
      .then((r) => r.json())
      .then((d) => { if (!done && d.verified) grantUnlock(); })
      .catch(() => { /* ignore; the gate simply stays up */ })
      .finally(() => { done = true; stripParam(); });

    return () => { done = true; };
  }, []);

  return null;
}

function stripParam() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("paid")) return;
    url.searchParams.delete("paid");
    window.history.replaceState({}, "", url.toString());
  } catch { /* ignore */ }
}
