// Client-side funnel beacon. Fire-and-forget: never throws, never blocks
// navigation (sendBeacon survives page unloads, e.g. the checkout redirect).

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
  | "quiz_complete";

export function track(event: TrackEvent, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      e: event,
      p: props,
      l: document.documentElement.getAttribute("lang") || undefined,
      path: window.location.pathname,
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
}
