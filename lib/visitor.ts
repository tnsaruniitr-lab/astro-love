// A first-party visitor id, used as Meta's `external_id` matching parameter.
//
// Why this exists: Meta REJECTS conversions whose customer-information is too
// thin (error_subcode 2804050). In practice `_fbp` + IP + user agent passes and
// IP + user agent alone does not — which means the visitor whose ad blocker
// stopped `_fbp` from ever being written is exactly the visitor whose CAPI
// event gets thrown away. That is backwards: recovering her is the whole reason
// the server leg exists.
//
// This id is ours, set from our own origin, so it survives blockers and ITP. It
// is a random UUID with no meaning and no link to a person — and it is only
// minted once marketing consent is granted, so it never becomes a tracking
// identifier for someone who declined.
//
// The raw value goes to the pixel (Meta hashes it in the browser) and its
// SHA-256 goes to the CAPI. Both legs therefore describe the same visitor.

import { readConsent } from "./consent";

export const VISITOR_COOKIE = "am_vid";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days, matching the consent lifetime

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)am_vid=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function mint(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** The visitor id for this browser, creating one if needed. Returns null
 *  without consent — no consent, no identifier, first-party or not. */
export function getVisitorId(): string | null {
  if (typeof document === "undefined") return null;
  if (readConsent() !== "granted") return null;
  const existing = readCookie();
  if (existing) return existing;
  const id = mint();
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${VISITOR_COOKIE}=${id}; path=/; max-age=${MAX_AGE}; SameSite=Lax${secure}`;
  } catch {
    return null;
  }
  return id;
}

/** Drop the id — called when consent is withdrawn. */
export function clearVisitorId(): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${VISITOR_COOKIE}=; path=/; max-age=0`;
  } catch {
    /* ignore */
  }
}
