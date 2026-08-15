// Marketing-consent state, shared by the browser and the server.
//
// The site serves EU markets (pl/sk/de/uk/ru), so under GDPR/ePrivacy the Meta
// pixel must not run — and no server-side event may be sent — until the visitor
// opts in. Consent lives in a COOKIE (not localStorage) precisely so the server
// routes (/api/meta-capi, /api/pay/verify) can honor the same decision.
//
// Default is "unset", which is treated as denied everywhere.

export const CONSENT_COOKIE = "am_consent";
export const CONSENT_EVENT = "am:consent"; // window event fired on change
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 180 days, then re-ask

export type Consent = "granted" | "denied" | "unset";

export function parseConsent(value: string | undefined | null): Consent {
  return value === "granted" ? "granted" : value === "denied" ? "denied" : "unset";
}

/** Browser: read the current decision. Never throws. */
export function readConsent(): Consent {
  if (typeof document === "undefined") return "unset";
  try {
    const m = document.cookie.match(/(?:^|;\s*)am_consent=([^;]*)/);
    return parseConsent(m ? decodeURIComponent(m[1]) : null);
  } catch {
    return "unset";
  }
}

/** Browser: record a decision and notify listeners (the pixel mounts/unmounts). */
export function writeConsent(value: "granted" | "denied"): void {
  if (typeof document === "undefined") return;
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
    // Withdrawing consent must also drop the identifiers already set.
    if (value === "denied") clearMetaCookies();
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  } catch {
    /* consent UI must never break the product */
  }
}

/** Expire Meta's first-party identifiers on withdrawal. */
function clearMetaCookies(): void {
  for (const name of ["_fbp", "_fbc"]) {
    document.cookie = `${name}=; path=/; max-age=0`;
    // Also try the registrable domain, where fbevents.js writes them.
    const parts = location.hostname.split(".");
    if (parts.length > 2) {
      document.cookie = `${name}=; path=/; domain=.${parts.slice(-2).join(".")}; max-age=0`;
    }
  }
}
