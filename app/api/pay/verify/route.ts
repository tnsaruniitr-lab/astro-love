import { NextResponse } from "next/server";

// Server-side verification of a payment by its order ref. The return query
// string is only a trigger; entitlement is decided here. Configure with env:
//   CARECOMPASS_VERIFY_URL    override the verify endpoint (defaults to the live
//                             CareCompass /api/status below)
//   CARECOMPASS_VERIFY_TOKEN  optional bearer token
//   CARECOMPASS_EXPECT_AMOUNT expected minor units (default 200 = $2.00)
//   CARECOMPASS_EXPECT_CURRENCY expected currency (default USD)
//   CARECOMPASS_EXPECT_PRODUCT expected product (default astromatch)
//   ALLOW_TEST_UNLOCK=1       grant on return WITHOUT a real check (testing only)
//
// Upstream shape (CareCompass /api/status):
//   { found, paid, status, ref, product, payment_id, order_id, amount, currency }
// Grant only when paid === true AND amount/currency/product match expectations.
// While the payment is still settling (found:false or paid:false) we report
// pending:true so the client can re-poll for a few seconds.

export const dynamic = "force-dynamic";

// The verify endpoint is live and stable, so default to it — no env var needed
// for the round-trip to confirm. Override via CARECOMPASS_VERIFY_URL if it moves.
const DEFAULT_VERIFY_URL = "https://pay.carecompass.me/api/status";
const testMode = () => process.env.ALLOW_TEST_UNLOCK === "1";

export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref");
  if (!ref) return NextResponse.json({ verified: false, pending: false, reason: "missing_ref" }, { status: 400 });

  // Explicit opt-in preview unlock (no real check) — for exercising the UX only.
  if (testMode()) return NextResponse.json({ verified: true, test: true, ref });

  const base = process.env.CARECOMPASS_VERIFY_URL || DEFAULT_VERIFY_URL;

  try {
    const url = `${base}${base.includes("?") ? "&" : "?"}ref=${encodeURIComponent(ref)}`;
    const headers: Record<string, string> = {};
    if (process.env.CARECOMPASS_VERIFY_TOKEN) headers.Authorization = `Bearer ${process.env.CARECOMPASS_VERIFY_TOKEN}`;
    const r = await fetch(url, { headers, cache: "no-store" });
    const data = await r.json().catch(() => ({} as Record<string, unknown>));

    const paid = data.paid === true || data.status === "paid";

    const expectAmount = Number(process.env.CARECOMPASS_EXPECT_AMOUNT ?? 200);
    const expectCurrency = (process.env.CARECOMPASS_EXPECT_CURRENCY ?? "USD").toUpperCase();
    const expectProduct = process.env.CARECOMPASS_EXPECT_PRODUCT ?? "astromatch";

    // Only enforce a field when the upstream actually returned it.
    const amountOk = data.amount == null || Number(data.amount) === expectAmount;
    const currencyOk = data.currency == null || String(data.currency).toUpperCase() === expectCurrency;
    const productOk = data.product == null || String(data.product) === expectProduct;
    const matchesExpected = amountOk && currencyOk && productOk;

    const verified = paid && matchesExpected;
    // Keep polling only while the payment hasn't landed yet; a paid-but-mismatched
    // result is a hard reject, not pending.
    const pending = !verified && !paid;
    const reason = verified ? undefined : paid ? "amount_or_product_mismatch" : data.found === false ? "not_found_yet" : "not_paid_yet";

    return NextResponse.json({ verified, paid: !!paid, found: data.found !== false, pending, reason, ref, upstream: data });
  } catch {
    // Network/parse hiccup — let the client retry.
    return NextResponse.json({ verified: false, pending: true, reason: "verify_error", ref }, { status: 502 });
  }
}
