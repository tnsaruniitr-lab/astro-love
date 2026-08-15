// Conversions API sender (server-only). The access token never reaches the
// browser — every server-side event goes through here.
//
// Env:
//   NEXT_PUBLIC_META_PIXEL_ID  dataset id (doubles as the pixel id)
//   META_CAPI_ACCESS_TOKEN     server-only token from Events Manager
//   META_CAPI_TEST_CODE        Test Events code — REMOVE before go-live, it
//                              routes events to the test stream only
//   META_GRAPH_VERSION         pin override (default v21.0)

import { createHash } from "crypto";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";

export function capiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID && process.env.META_CAPI_ACCESS_TOKEN);
}

/** Meta requires SHA-256 of the normalised (trimmed, lower-cased) value. */
export function hashPii(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface MetaUserData {
  email?: string | null;
  phone?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
}

export interface MetaEventInput {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string | null;
  actionSource?: "website" | "system_generated";
  customData?: Record<string, unknown>;
  user: MetaUserData;
}

function buildUserData(u: MetaUserData): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  if (u.email) d.em = [hashPii(u.email)];
  // Phone numbers must be digits only, country code included, before hashing.
  if (u.phone) {
    const digits = u.phone.replace(/[^\d]/g, "");
    if (digits) d.ph = [hashPii(digits)];
  }
  if (u.ip) d.client_ip_address = u.ip;
  if (u.userAgent) d.client_user_agent = u.userAgent;
  if (u.fbp) d.fbp = u.fbp;
  if (u.fbc) d.fbc = u.fbc;
  return d;
}

/** POST one event. Resolves to a result object; never throws — a marketing
 *  pixel must not be able to fail a payment verification or a page render. */
export async function sendMetaEvent(
  ev: MetaEventInput,
): Promise<{ ok: boolean; status: number; body?: unknown; skipped?: string }> {
  if (!capiConfigured()) return { ok: false, status: 0, skipped: "not_configured" };

  const payload = {
    data: [
      {
        event_name: ev.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.eventId, // MUST match the browser leg's eventID
        ...(ev.eventSourceUrl ? { event_source_url: ev.eventSourceUrl } : {}),
        action_source: ev.actionSource ?? "website",
        user_data: buildUserData(ev.user),
        custom_data: ev.customData ?? {},
      },
    ],
    ...(process.env.META_CAPI_TEST_CODE ? { test_event_code: process.env.META_CAPI_TEST_CODE } : {}),
  };

  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/` +
    `${process.env.NEXT_PUBLIC_META_PIXEL_ID}/events` +
    `?access_token=${encodeURIComponent(process.env.META_CAPI_ACCESS_TOKEN as string)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      // The token/dataset URL is never logged — only Meta's error text.
      console.error(`[meta] ${ev.eventName} rejected (${res.status}):`, JSON.stringify(body).slice(0, 400));
    }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    console.error("[meta] send failed:", e instanceof Error ? e.message : e);
    return { ok: false, status: 0 };
  }
}
