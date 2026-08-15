import { NextRequest, NextResponse } from "next/server";
import { parseConsent, CONSENT_COOKIE } from "@/lib/consent";
import { sendMetaEvent, capiConfigured } from "@/lib/server/meta";
import { buildFbc, parseAttrCookie } from "@/lib/server/fbc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server leg of the browser conversions. The browser posts here (same origin,
// so the _fbp/_fbc cookies and the real client IP/UA are available) and this
// route forwards to Meta with the access token, which never leaves the server.
//
// The event id is minted by the browser and echoed unchanged — that is what
// lets Meta deduplicate this against the pixel's copy of the same event.

// Closed vocabulary. This endpoint must not become a way to write arbitrary
// events into the ad account.
const ALLOWED = new Set(["ViewContent", "Lead", "InitiateCheckout", "AddToCart", "CompleteRegistration"]);
// Purchase is deliberately absent: it is authoritative only from the server
// (see app/api/pay/verify) and must never be mintable by a browser POST.

const MAX_BODY = 4096;

export async function POST(req: NextRequest) {
  // GDPR: no server-side event without the same opt-in that gates the pixel.
  if (parseConsent(req.cookies.get(CONSENT_COOKIE)?.value) !== "granted") {
    return new NextResponse(null, { status: 204 });
  }
  if (!capiConfigured()) return new NextResponse(null, { status: 204 });

  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > MAX_BODY) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  let body: { eventName?: unknown; eventId?: unknown; eventSourceUrl?: unknown; customData?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const eventName = typeof body.eventName === "string" ? body.eventName : "";
  const eventId = typeof body.eventId === "string" ? body.eventId.slice(0, 128) : "";
  if (!ALLOWED.has(eventName) || !eventId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Only same-origin URLs are accepted as the event source.
  let eventSourceUrl: string | null = null;
  if (typeof body.eventSourceUrl === "string") {
    try {
      const u = new URL(body.eventSourceUrl);
      if (u.host === req.nextUrl.host) eventSourceUrl = u.toString().slice(0, 512);
    } catch {
      /* ignore a malformed url */
    }
  }

  const customData =
    body.customData && typeof body.customData === "object" && !Array.isArray(body.customData)
      ? (body.customData as Record<string, unknown>)
      : {};

  // When the pixel is blocked, Meta never writes _fbc — but we kept the fbclid
  // at landing, so the click can still be named. This is the strongest match
  // signal available for exactly the visitor the server leg exists to recover.
  const attr = parseAttrCookie(req.cookies.get("am_attr")?.value);
  const fbc =
    req.cookies.get("_fbc")?.value ??
    buildFbc(attr.fbclid as string | undefined, attr.ts as number | undefined);

  const result = await sendMetaEvent({
    eventName,
    eventId,
    eventSourceUrl,
    customData,
    user: {
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: req.headers.get("user-agent"),
      externalId: req.cookies.get("am_vid")?.value ?? null,
      fbp: req.cookies.get("_fbp")?.value ?? null,
      fbc,
    },
  });

  // The browser never needs Meta's response body; keep it opaque.
  return new NextResponse(null, { status: result.ok ? 204 : 502 });
}
