"use client";

import { useState } from "react";

// Every localStorage key the app writes. Kept as prefixes so future
// am_*/astro-* keys are swept too.
const EXACT_KEYS = ["am_compat", "am_unlocked", "am_entitlement", "astro-theme", "astro-locale"];
const PREFIXES = ["am_", "astro-"];

/** Wipes everything the app stored on this device: birth data, readings,
 *  entitlement, theme and language choices. */
export default function ClearDataButton() {
  const [done, setDone] = useState(false);

  const clear = () => {
    try {
      const doomed: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (EXACT_KEYS.includes(k) || PREFIXES.some((p) => k.startsWith(p))) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
      try { sessionStorage.clear(); } catch { /* ignore */ }
      setDone(true);
    } catch {
      setDone(true);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={clear}
        className="rounded-full border border-white/15 px-5 py-2 text-sm text-haze hover:text-cream hover:border-white/30 transition-colors"
      >
        {done ? "Done — this device is clean" : "Clear all my data on this device"}
      </button>
      {done && (
        <p className="mt-2 text-xs text-haze/70">
          Birth data, readings, unlock status, theme and language have been removed from this browser.
          A paid unlock can be restored later with the link from your payment confirmation.
        </p>
      )}
    </div>
  );
}
