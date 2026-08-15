"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "./LocaleProvider";
import { CONSENT_EVENT, readConsent, writeConsent, type Consent } from "@/lib/consent";
import { FB_PIXEL_ID } from "@/lib/meta";

/** Opt-in bar for advertising cookies. Shown only while the decision is unset,
 *  and only when there is actually a pixel to gate. Declining is one tap and
 *  as prominent as accepting — a pre-ticked or hidden "no" is not consent. */
export function ConsentBanner() {
  const t = useT();
  const [state, setState] = useState<Consent | null>(null); // null until hydrated

  useEffect(() => {
    const sync = () => setState(readConsent());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!FB_PIXEL_ID || state === null || state !== "unset") return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t.consent.title}
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="glass mx-auto max-w-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <p className="flex-1 text-xs leading-relaxed text-haze">
          {t.consent.body}{" "}
          <Link href="/privacy/" className="text-gold/85 hover:text-gold underline underline-offset-4">
            {t.consent.privacy}
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => writeConsent("denied")}
            className="rounded-full border border-cream/20 px-4 py-2 text-xs text-cream/85 hover:border-cream/40 transition-colors"
          >
            {t.consent.decline}
          </button>
          <button onClick={() => writeConsent("granted")} className="btn-gold px-5 py-2 text-xs">
            {t.consent.accept}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Standing control (privacy page): change the decision at any time. */
export function ConsentSettings() {
  const t = useT();
  const [state, setState] = useState<Consent | null>(null);

  useEffect(() => {
    const sync = () => setState(readConsent());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (state === null) return null;

  const label =
    state === "granted" ? t.consent.stateOn : state === "denied" ? t.consent.stateOff : t.consent.stateUnset;

  return (
    <div className="mt-3 rounded-xl border border-cream/10 bg-cream/[0.03] px-4 py-3 flex flex-wrap items-center gap-3">
      <span className="text-xs text-haze/85">{label}</span>
      <span className="flex-1" />
      {state !== "granted" && (
        <button onClick={() => writeConsent("granted")} className="btn-gold px-4 py-1.5 text-xs">
          {t.consent.accept}
        </button>
      )}
      {state !== "denied" && (
        <button
          onClick={() => writeConsent("denied")}
          className="rounded-full border border-cream/20 px-4 py-1.5 text-xs text-cream/85 hover:border-cream/40 transition-colors"
        >
          {t.consent.withdraw}
        </button>
      )}
    </div>
  );
}
