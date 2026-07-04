import { NextResponse } from "next/server";
import { mintEntitlement } from "@/lib/server/entitlement";

// Server-side verification of a payment by its order ref. The return query
// string is only a trigger; entitlement is decided here — FAIL-CLOSED.
//
// Upstream (CareCompass /api/status) echoes the fields recorded at
// /create-order: { found, paid, status, ref, product, payment_id, order_id,
// amount, currency }. A payment only verifies when ALL of these hold:
//   found === true, paid, amount === expected, currency === expected,
//   product === expected.
// A missing/null field is a REJECTION, not a pass — the old null-permissive
// check made the guard vacuous for exactly the shapes the upstream returns
// while settling.
//
// On success we mint a signed entitlement token; premium endpoints accept the
// token instead of re-calling the payment service on every request.
//
// Env:
//   CARECOMPASS_VERIFY_URL      override the verify endpoint
//   CARECOMPASS_VERIFY_TOKEN    optional bearer token
//   CARECOMPASS_EXPECT_AMOUNT   expected minor units (default 200 = $2.00)
//   CARECOMPASS_EXPECT_CURRENCY expected currency (default USD)
//   CARECOMPASS_EXPECT_PRODUCT  expected product (default astromatch)
//   ENTITLEMENT_SECRET          HMAC secret for minted tokens
//   ALLOW_TEST_UNLOCK=1         grant WITHOUT a real check (local testing only)

export const dynamic = "force-dynamic";

const DEFAULT_VERIFY_URL = "https://pay.carecompass.me/api/status";
const testMode = () => process.env.ALLOW_TEST_UNLOCK === "1";

const REF_MAX = 128;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ref");
  const ref = raw?.trim() ?? "";
  if (!ref || ref.length > REF_MAX) {
    return NextResponse.json({ verified: false, pending: false, reason: "missing_ref" }, { status: 400 });
  }

  const expectProduct = process.env.CARECOMPASS_EXPECT_PRODUCT ?? "astromatch";

  // Explicit opt-in preview unlock (no real check) — for exercising the UX only.
  if (testMode()) {
    return NextResponse.json({ verified: true, test: true, ref, token: mintEntitlement(ref, expectProduct) });
  }

  const base = process.env.CARECOMPASS_VERIFY_URL || DEFAULT_VERIFY_URL;

  try {
    const url = `${base}${base.includes("?") ? "&" : "?"}ref=${encodeURIComponent(ref)}`;
    const headers: Record<string, string> = {};
    if (process.env.CARECOMPASS_VERIFY_TOKEN) headers.Authorization = `Bearer ${process.env.CARECOMPASS_VERIFY_TOKEN}`;
    const r = await fetch(url, { headers, cache: "no-store" });
    const data = await r.json().catch(() => ({} as Record<string, unknown>));

    const found = data.found === true;
    const paid = data.paid === true || data.status === "paid";

    const expectAmount = Number(process.env.CARECOMPASS_EXPECT_AMOUNT ?? 200);
    const expectCurrency = (process.env.CARECOMPASS_EXPECT_CURRENCY ?? "USD").toUpperCase();

    // FAIL-CLOSED: every expectation must be present AND match.
    const amountOk = data.amount != null && Number(data.amount) === expectAmount;
    const currencyOk = data.currency != null && String(data.currency).toUpperCase() === expectCurrency;
    const productOk = data.product != null && String(data.product) === expectProduct;
    const matchesExpected = amountOk && currencyOk && productOk;

    const verified = found && paid && matchesExpected;
    // Keep polling only while the payment hasn't landed yet; a paid-but-
    // mismatched result is a hard reject, not pending.
    const pending = !verified && !paid;
    const reason = verified
      ? undefined
      : paid
        ? "amount_or_product_mismatch"
        : !found
          ? "not_found_yet"
          : "not_paid_yet";

    return NextResponse.json({
      verified,
      paid,
      found,
      pending,
      reason,
      ref,
      ...(verified ? { token: mintEntitlement(ref, expectProduct) } : {}),
    });
  } catch {
    // Network/parse hiccup — let the client retry.
    return NextResponse.json({ verified: false, pending: true, reason: "verify_error", ref }, { status: 502 });
  }
}
