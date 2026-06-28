"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { grantUnlock } from "@/lib/entitlement";
import { NEXT_KEY } from "@/lib/checkout";

type State = "checking" | "paid" | "cancel" | "unverified" | "error";

export default function PayReturn() {
  const [state, setState] = useState<State>("checking");
  const [ref, setRef] = useState("");
  const [next, setNext] = useState("/");
  const [detail, setDetail] = useState("");
  const [test, setTest] = useState(false);
  const runRef = useRef(0); // bumped each verify run so stale polls self-cancel

  // Verify a ref server-side, re-polling while the payment is still settling.
  // Safe to call again (e.g. a "Check again" tap) — the latest run wins.
  const verify = useCallback((r: string) => {
    const myRun = ++runRef.current;
    let attempts = 0;
    const MAX_ATTEMPTS = 5; // ~10s total at 2s spacing, for the async webhook
    setState("checking");

    const poll = () => {
      fetch(`/api/pay/verify/?ref=${encodeURIComponent(r)}`)
        .then((res) => res.json())
        .then((d) => {
          if (myRun !== runRef.current) return; // superseded by a newer run
          if (d.verified) {
            grantUnlock();
            setTest(!!d.test);
            setState("paid");
            try { localStorage.removeItem(NEXT_KEY); } catch { /* ignore */ }
            return;
          }
          attempts += 1;
          if (d.pending && attempts < MAX_ATTEMPTS) { setTimeout(poll, 2000); return; }
          setState("unverified");
          setDetail(
            d.reason === "amount_or_product_mismatch"
              ? "This payment didn't match the expected product or amount."
              : "We couldn't confirm this payment yet. If you were charged, it can take a moment — check again shortly.",
          );
        })
        .catch(() => {
          if (myRun !== runRef.current) return;
          attempts += 1;
          if (attempts < MAX_ATTEMPTS) { setTimeout(poll, 2000); return; }
          setState("error");
          setDetail("Verification request failed.");
        });
    };
    poll();
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("ref") || "";
    const status = sp.get("status");
    setRef(r);

    let n = "/";
    try { n = localStorage.getItem(NEXT_KEY) || "/"; } catch { /* ignore */ }
    if (n.startsWith("/")) setNext(n);

    // The return params are only a trigger; never trust them for entitlement.
    if (status && status !== "success") { setState("cancel"); return; }
    if (!r) { setState("error"); return; }
    verify(r);
  }, [verify]);

  const COPY: Record<State, { title: string; body: string; tone: string }> = {
    checking: { title: "Confirming your payment…", body: "One moment while we verify with the payment service.", tone: "text-haze" },
    paid: {
      title: test ? "Unlocked (test mode) ✓" : "Payment confirmed ✓",
      body: test ? "Test unlock granted. Your full reading is open on this device." : "Thank you. Your full reading is unlocked.",
      tone: "text-goldbright",
    },
    cancel: { title: "Checkout cancelled", body: "No payment was taken. You can try again whenever you like.", tone: "text-cream" },
    unverified: { title: "Almost there", body: detail || "Payment received, finishing verification.", tone: "text-cream" },
    error: { title: "Something went wrong", body: detail || "We couldn't read this return. Please try again.", tone: "text-rose/90" },
  };
  const c = COPY[state];
  const canRecheck = (state === "unverified" || state === "error") && !!ref;

  // A portable, savable link to the unlocked reading. It carries ?paid=<ref> so
  // opening it on any device re-verifies the payment and unlocks there too.
  const keepLink = (() => {
    if (state !== "paid" || !ref || typeof window === "undefined") return "";
    const base = `${window.location.origin}${next}`;
    return `${base}${next.includes("?") ? "&" : "?"}paid=${encodeURIComponent(ref)}`;
  })();

  return (
    <main className="relative mx-auto max-w-lg px-4 py-20 text-center">
      <div className="glass p-8 sm:p-10">
        <div className="text-3xl text-gold mb-3" aria-hidden>✦</div>
        <h1 className={`font-display text-3xl ${c.tone}`}>{c.title}</h1>
        <p className="text-haze mt-3 leading-relaxed">{c.body}</p>
        {ref && <p className="text-[11px] text-haze/50 mt-4 tabular-nums">ref {ref}</p>}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {state === "paid"
            ? <Link href={next} className="btn-gold px-7 py-2.5 text-sm">Open my full reading →</Link>
            : <Link href="/" className="btn-gold px-7 py-2.5 text-sm">← Back to Astro-Love</Link>}
          {canRecheck && (
            <button
              onClick={() => verify(ref)}
              className="text-xs uppercase tracking-[0.18em] text-gold/80 hover:text-gold underline underline-offset-4"
            >
              Check again
            </button>
          )}
        </div>

        {keepLink && <KeepLink url={keepLink} />}
      </div>
    </main>
  );
}

// Save / send the unlocked reading. Works on any device the link is opened on.
function KeepLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };
  const mail = `mailto:?subject=${encodeURIComponent("My Astro-Love reading")}&body=${encodeURIComponent(`Here's my full reading, unlocked: ${url}`)}`;
  return (
    <div className="mt-7 pt-6 border-t border-cream/10 text-left">
      <div className="text-[10px] uppercase tracking-[0.24em] text-haze/85 mb-2 text-center">Keep your reading</div>
      <p className="text-xs text-haze/80 text-center mb-3">Save this link to reopen the full reading on any device, or send it to your partner.</p>
      <div className="flex items-center gap-2 rounded-xl border border-cream/10 bg-cream/[0.03] px-3 py-2">
        <span className="flex-1 min-w-0 truncate text-[12px] text-cream/80 tabular-nums">{url}</span>
        <button onClick={copy} className="shrink-0 text-xs rounded-full px-3 py-1 border border-gold/30 bg-gold/[0.08] text-cream/90 hover:border-gold/55 transition-colors">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-2 text-center">
        <a href={mail} className="text-xs uppercase tracking-[0.18em] text-gold/80 hover:text-gold underline underline-offset-4">Email it to me</a>
      </div>
    </div>
  );
}
