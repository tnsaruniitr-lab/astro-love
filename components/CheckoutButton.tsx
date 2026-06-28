"use client";

import { buildCheckoutUrl, newOrderRef, NEXT_KEY } from "@/lib/checkout";
import { useT } from "./LocaleProvider";

/** Top-level redirect to the verified checkout domain. No iframe, no popup, so
 *  Apple Pay runs first-party exactly as it does today. `next` is the in-app
 *  path to return to after a confirmed payment (carries the reading); it is
 *  stashed in localStorage so the contract's return_url stays query-free. */
export default function CheckoutButton({
  label,
  priceLabel = "$2",
  next,
  title,
}: { label?: string; priceLabel?: string; next?: string; title?: string }) {
  const t = useT();
  const go = () => {
    const ref = newOrderRef();
    try { sessionStorage.setItem("am_pay_ref", ref); } catch { /* ignore */ }
    try { localStorage.setItem(NEXT_KEY, next && next.startsWith("/") ? next : "/"); } catch { /* ignore */ }
    window.location.assign(buildCheckoutUrl({ ref, title }));
  };
  return (
    <button onClick={go} className="btn-gold px-8 py-3 text-sm inline-flex items-center gap-2.5">
      <span>{label ?? t.pay.cta}</span>
      <span aria-hidden className="opacity-50">·</span>
      <span className="tabular-nums">{priceLabel}</span>
    </button>
  );
}
