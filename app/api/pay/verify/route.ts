import { NextResponse } from "next/server";

// Server-side verification of a payment by its order ref. The return query
// string is only a hint; entitlement is decided here. Configure with env:
//   CARECOMPASS_VERIFY_URL   e.g. https://pay.carecompass.me/api/status
//   CARECOMPASS_VERIFY_TOKEN optional bearer token
// Until CARECOMPASS_VERIFY_URL is set, this reports verify_not_configured so
// the redirect round-trip can still be tested without granting access.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref");
  if (!ref) return NextResponse.json({ verified: false, reason: "missing_ref" }, { status: 400 });

  const base = process.env.CARECOMPASS_VERIFY_URL;
  if (!base) return NextResponse.json({ verified: false, reason: "verify_not_configured", ref });

  try {
    const url = `${base}${base.includes("?") ? "&" : "?"}ref=${encodeURIComponent(ref)}`;
    const headers: Record<string, string> = {};
    if (process.env.CARECOMPASS_VERIFY_TOKEN) headers.Authorization = `Bearer ${process.env.CARECOMPASS_VERIFY_TOKEN}`;
    const r = await fetch(url, { headers, cache: "no-store" });
    const data = await r.json().catch(() => ({}));
    // Accept a few common "paid" shapes.
    const paid = data.status === "paid" || data.paid === true || data.verified === true || data.state === "completed";
    return NextResponse.json({ verified: !!paid, ref, upstream: data });
  } catch {
    return NextResponse.json({ verified: false, reason: "verify_error", ref }, { status: 502 });
  }
}
