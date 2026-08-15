// Meta (Facebook) pixel + Conversions API helpers — browser side.
//
// Every conversion is sent TWICE on purpose: once from the browser (pixel) and
// once from our server (CAPI), because ad blockers and ITP eat a large share of
// browser events. Meta collapses the pair back into one conversion ONLY when
// both carry the same `event_name` AND the same `event_id`. Get that wrong and
// every sale is counted twice, which corrupts campaign optimisation — so the
// id is minted once here and passed to both legs.
//
// Nothing fires unless the visitor has granted marketing consent; see
// lib/consent.ts.

import { readConsent } from "./consent";

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/** Configured AND consented — the single gate for anything Meta-bound. */
export function metaReady(): boolean {
  return Boolean(FB_PIXEL_ID) && readConsent() === "granted";
}

export function newEventId(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Browser leg. `eventId` must match the CAPI leg for deduplication. */
export function pixelTrack(
  event: string,
  params: Record<string, unknown> = {},
  eventId?: string,
): void {
  if (typeof window === "undefined" || !window.fbq || !metaReady()) return;
  try {
    if (eventId) window.fbq("track", event, params, { eventID: eventId });
    else window.fbq("track", event, params);
  } catch {
    /* marketing tags must never break the product */
  }
}

/** Server leg, proxied through our own origin so the access token stays server-only.
 *  keepalive: this often fires immediately before a checkout redirect. */
export function capiTrack(
  event: string,
  eventId: string,
  customData: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined" || !metaReady()) return;
  try {
    void fetch("/api/meta-capi/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: event,
        eventId,
        eventSourceUrl: window.location.href,
        customData,
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/** Both legs, sharing one event id. The normal way to report a conversion. */
export function metaEvent(event: string, customData: Record<string, unknown> = {}): void {
  if (!metaReady()) return;
  const id = newEventId();
  pixelTrack(event, customData, id);
  capiTrack(event, id, customData);
}
