"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type State = "checking" | "paid" | "cancel" | "unverified" | "error";

export default function PayReturn() {
  const [state, setState] = useState<State>("checking");
  const [ref, setRef] = useState("");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("ref") || "";
    setRef(r);
    if (sp.get("status") === "cancel") { setState("cancel"); return; }
    if (!r) { setState("error"); return; }

    fetch(`/api/pay/verify/?ref=${encodeURIComponent(r)}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.verified) {
          try { localStorage.setItem("am_unlocked", "1"); } catch { /* ignore */ }
          setState("paid");
        } else {
          setState("unverified");
          setDetail(d.reason === "verify_not_configured"
            ? "The redirect worked. Server verification isn't configured yet (set CARECOMPASS_VERIFY_URL)."
            : "We couldn't confirm this payment yet.");
        }
      })
      .catch(() => { setState("error"); setDetail("Verification request failed."); });
  }, []);

  const COPY: Record<State, { title: string; body: string; tone: string }> = {
    checking: { title: "Confirming your payment…", body: "One moment while we verify with the payment service.", tone: "text-haze" },
    paid: { title: "Payment confirmed ✓", body: "Thank you. Your full reading is unlocked.", tone: "text-goldbright" },
    cancel: { title: "Checkout cancelled", body: "No payment was taken. You can try again whenever you like.", tone: "text-cream" },
    unverified: { title: "Almost there", body: detail || "Payment received, finishing verification.", tone: "text-cream" },
    error: { title: "Something went wrong", body: detail || "We couldn't read this return. Please try again.", tone: "text-rose/90" },
  };
  const c = COPY[state];

  return (
    <main className="relative mx-auto max-w-lg px-4 py-20 text-center">
      <div className="glass p-8 sm:p-10">
        <div className="text-3xl text-gold mb-3" aria-hidden>✦</div>
        <h1 className={`font-display text-3xl ${c.tone}`}>{c.title}</h1>
        <p className="text-haze mt-3 leading-relaxed">{c.body}</p>
        {ref && <p className="text-[11px] text-haze/50 mt-4 tabular-nums">ref {ref}</p>}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-gold px-7 py-2.5 text-sm">← Back to Astro-Love</Link>
          {(state === "cancel" || state === "unverified" || state === "error") && (
            <Link href="/" className="text-xs uppercase tracking-[0.18em] text-gold/80 hover:text-gold underline underline-offset-4">Try again</Link>
          )}
        </div>
      </div>
    </main>
  );
}
