"use client";

import { buildCheckoutUrl, newOrderRef } from "@/lib/checkout";

/** Top-level redirect to the verified checkout domain. No iframe, no popup, so
 *  Apple Pay runs first-party exactly as it does today. */
export default function CheckoutButton({
  product = "full_report",
  label = "✦ Unlock the full reading",
}: { product?: string; label?: string }) {
  const go = () => {
    const ref = newOrderRef();
    try { sessionStorage.setItem("am_pay_ref", ref); } catch { /* ignore */ }
    window.location.assign(buildCheckoutUrl({ ref, product }));
  };
  return (
    <button onClick={go} className="btn-gold px-8 py-3 text-sm">
      {label}
    </button>
  );
}
