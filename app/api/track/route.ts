import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { recordEvent } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The funnel vocabulary. Anything else is dropped — this endpoint must never
// become a free-form data sink.
const ALLOWED = new Set([
  "page_view",
  "sample_view",
  "form_start",
  "calculate",
  "card_reveal",
  "reveal_all",
  "paywall_view",
  "cta_click",
  "checkout_redirect",
  "return_landed",
  "verified",
  "restore_landed",
  "share_click",
  "quiz_complete",
]);

/** Anonymous daily visitor bucket: lets funnels count uniques without storing
 *  IP or UA. Salted with the day + server secret, so it can't be reversed and
 *  rotates every 24h. */
function visitorBucket(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const ua = req.headers.get("user-agent") || "";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ENTITLEMENT_SECRET || "astro-love";
  return createHash("sha256").update(`${day}|${salt}|${ip}|${ua}`).digest("hex").slice(0, 16);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const b = body as { e?: unknown; p?: unknown; l?: unknown; path?: unknown };
  const event = typeof b.e === "string" ? b.e : "";
  if (!ALLOWED.has(event)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  // Props stay tiny and structural (card names, product ids) — never free text.
  let props: Record<string, unknown> | undefined;
  if (b.p && typeof b.p === "object" && !Array.isArray(b.p)) {
    const raw = JSON.stringify(b.p);
    if (raw.length <= 512) props = b.p as Record<string, unknown>;
  }
  const locale = typeof b.l === "string" ? b.l.slice(0, 8) : null;
  const path = typeof b.path === "string" ? b.path.slice(0, 128) : null;

  // Single greppable log line — the zero-infra fallback when there is no DB.
  console.log(`[track] ${event} path=${path ?? "-"} locale=${locale ?? "-"} props=${props ? JSON.stringify(props) : "-"}`);

  // Fire-and-forget; the beacon never waits on Postgres.
  void recordEvent({ event, props, locale, path, visitor: visitorBucket(req) });

  return new NextResponse(null, { status: 204 });
}
