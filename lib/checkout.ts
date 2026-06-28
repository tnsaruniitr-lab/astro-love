// Redirect checkout (Option A): astromatch sends the browser to the verified
// payment domain (pay.carecompass.me) where Apple Pay already works, then the
// checkout redirects back to /pay/return. Entitlement is confirmed server-side
// (see app/api/pay/verify), never trusted from the return query string.

export const CHECKOUT_URL = "https://pay.carecompass.me/checkout.html";

/** Build the outbound checkout URL. return_url is derived from the live origin,
 *  so it works on localhost, astromatch.app, or anywhere it's deployed. */
export function buildCheckoutUrl(opts: { ref: string; product?: string }): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://astromatch.app";
  const returnUrl = `${origin}/pay/return/?ref=${encodeURIComponent(opts.ref)}`;
  const cancelUrl = `${origin}/pay/return/?ref=${encodeURIComponent(opts.ref)}&status=cancel`;

  const p = new URLSearchParams();
  // Send the return target under several common param names so the round-trip
  // works regardless of which one checkout.html happens to read. Extra params
  // are harmless if ignored.
  for (const k of ["return_url", "redirect_url", "redirect", "success_url"]) p.set(k, returnUrl);
  p.set("cancel_url", cancelUrl);
  p.set("ref", opts.ref);
  p.set("client_reference_id", opts.ref);
  if (opts.product) p.set("product", opts.product);
  return `${CHECKOUT_URL}?${p.toString()}`;
}

/** A unique order reference to reconcile the payment to this checkout. */
export function newOrderRef(): string {
  const rand = Math.floor(Math.random() * 1e9).toString(36);
  return `am_${Date.now().toString(36)}_${rand}`;
}
