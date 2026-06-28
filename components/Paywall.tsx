"use client";

import CheckoutButton from "./CheckoutButton";
import { useT } from "./LocaleProvider";

/** The unlock moment. A blurred, veiled peek of the locked content sits behind
 *  a centered glass call-to-action, so the user can see there is more without
 *  reading it. One $2 unlock opens every flow on the device. */
export default function PaywallGate({
  blurb,
  peek,
  next,
}: {
  blurb: string;
  peek?: React.ReactNode;
  next?: string;
}) {
  const t = useT();
  return (
    <div className="relative overflow-hidden rounded-3xl border border-gold/15">
      {peek && (
        <div
          aria-hidden
          className="absolute inset-0 scale-[1.04] blur-[8px] opacity-40 pointer-events-none select-none [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        >
          {peek}
        </div>
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/80 to-ink/95" />

      <div className="relative px-5 py-12 sm:py-16 flex flex-col items-center text-center">
        <div className="text-3xl gold-text" aria-hidden style={{ textShadow: "0 0 18px rgb(var(--c-gold) / 0.4)" }}>✦</div>
        <h3 className="font-display text-2xl sm:text-3xl text-cream mt-2">{t.pay.title}</h3>
        <p className="text-haze text-sm sm:text-[15px] max-w-md mx-auto mt-2.5 leading-relaxed">{blurb}</p>

        <div className="mt-6">
          <CheckoutButton next={next} priceLabel={t.pay.price} />
        </div>

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-haze/70">
          <li className="inline-flex items-center gap-1.5"><span className="text-gold/80" aria-hidden>✓</span>{t.pay.perkOnce}</li>
          <li className="inline-flex items-center gap-1.5"><span className="text-gold/80" aria-hidden>✓</span>{t.pay.perkInstant}</li>
          <li className="inline-flex items-center gap-1.5"><span className="text-gold/80" aria-hidden>✓</span>{t.pay.perkAll}</li>
        </ul>
      </div>
    </div>
  );
}
