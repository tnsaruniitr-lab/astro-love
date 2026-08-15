// Client-side funnel beacon. Fire-and-forget: never throws, never blocks
// navigation (sendBeacon survives page unloads, e.g. the checkout redirect).
//
// A few of these steps are also ad-platform conversions. Rather than sprinkling
// Meta calls through the components, the mapping lives here (META_MAP) so every
// funnel step has exactly one call site and one consent gate.

import { metaEvent } from "./meta";
import { captureAttribution, readAttribution } from "./attribution";

export type TrackEvent =
  | "page_view"
  | "sample_view"
  | "form_start"
  | "calculate"
  | "card_reveal"
  | "reveal_all"
  | "paywall_view"
  | "cta_click"
  | "checkout_redirect"
  | "return_landed"
  | "verified"
  | "restore_landed"
  | "share_click"
  | "result_view"
  | "quiz_complete";

// Funnel step → Meta standard event. Meta's optimiser only understands its own
// vocabulary, so the mapping is explicit and small. Purchase is NOT here: it is
// sent server-side from /api/pay/verify, where a payment is actually confirmed.
const META_MAP: Partial<Record<TrackEvent, { event: string; data: Record<string, unknown> }>> = {
  result_view: {
    event: "ViewContent",
    data: { content_name: "compatibility_result", content_category: "synastry" },
  },
  quiz_complete: {
    event: "Lead",
    data: { content_name: "love_language_quiz" },
  },
  cta_click: {
    event: "InitiateCheckout",
    data: { value: 2.0, currency: "USD" },
  },
};

export function track(event: TrackEvent, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  try {
    // Cheap and idempotent: first touch wins, so this only writes once.
    const attr = captureAttribution() ?? readAttribution();
    const body = JSON.stringify({
      e: event,
      p: props,
      l: document.documentElement.getAttribute("lang") || undefined,
      path: window.location.pathname,
      a: attr ?? undefined,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track/", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/track/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    /* analytics must never break the product */
  }

  const meta = META_MAP[event];
  if (meta) metaEvent(meta.event, meta.data);
}
