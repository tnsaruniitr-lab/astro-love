// Redirect checkout (Option A): astromatch sends the browser to the verified
// payment domain (pay.carecompass.me) where Apple Pay already works, then the
// checkout redirects back to /pay/return. Entitlement is confirmed server-side
// (see app/api/pay/verify), never trusted from the return query string.
//
// Contract (CareCompass Pay): GET checkout.html?return_url&ref&product&title.
// The pay page returns to <return_url>?status=success&ref=<ref>&payment_id=<id>,
// so return_url is kept query-free here; the in-app "next" destination is stashed
// in localStorage instead (same device, survives the round-trip).

export const CHECKOUT_URL = "https://pay.carecompass.me/checkout.html";
export const PRODUCT = "astromatch";
export const PRODUCT_TITLE = "AstroMatch Full Reading";
export const NEXT_KEY = "am_pay_next";

/** Build the outbound checkout URL per the CareCompass contract. return_url is
 *  derived from the live origin, so it works on localhost or in production. */
export function buildCheckoutUrl(opts: { ref: string; title?: string }): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://astromatch.app";
  const returnUrl = `${origin}/pay/return/`;

  const p = new URLSearchParams();
  p.set("return_url", returnUrl);
  p.set("ref", opts.ref);
  p.set("product", PRODUCT);
  p.set("title", opts.title || PRODUCT_TITLE);
  return `${CHECKOUT_URL}?${p.toString()}`;
}

/** A unique, unguessable order reference. Prefer a UUID; fall back to two random
 *  base-36 runs where crypto is unavailable. NOTE: generated client-side and not
 *  bound to a server-side user record (astromatch has no accounts) — see the
 *  integration notes; entitlement is per-device. */
export function newOrderRef(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `am_${crypto.randomUUID()}`;
    }
  } catch { /* ignore */ }
  const rnd = () => Math.floor(Math.random() * 1e9).toString(36);
  return `am_${rnd()}${rnd()}`;
}
