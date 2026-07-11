import { NextResponse } from "next/server";
import { verifyEntitlement } from "@/lib/server/entitlement";
import { scoreLocation } from "@/lib/astro/astrocartography";
import type { ChartInput } from "@/lib/astro/types";

// "Is this city good for me?" — score an arbitrary location against the natal
// planetary lines. Entitlement-gated (astrocartography is premium) and cheap
// (no LLM). Body: { a: ChartInput, lat, lon, entitlement }.

export const dynamic = "force-dynamic";

const PRODUCT = process.env.CARECOMPASS_EXPECT_PRODUCT ?? "astromatch";
const testMode = () => process.env.ALLOW_TEST_UNLOCK === "1";

// Range/length bounds mirror /api/reading so a huge tz string or absurd date
// can't be pushed into Luxon (defense-in-depth; the compute is try/caught too).
function validInput(i: unknown): i is ChartInput {
  if (!i || typeof i !== "object") return false;
  const x = i as Record<string, unknown>;
  return (
    typeof x.year === "number" && x.year >= 1550 && x.year <= 2650 &&
    typeof x.month === "number" && x.month >= 1 && x.month <= 12 &&
    typeof x.day === "number" && x.day >= 1 && x.day <= 31 &&
    typeof x.hour === "number" && x.hour >= 0 && x.hour <= 23 &&
    typeof x.minute === "number" && x.minute >= 0 && x.minute <= 59 &&
    typeof x.timeKnown === "boolean" &&
    typeof x.lat === "number" && x.lat >= -90 && x.lat <= 90 &&
    typeof x.lon === "number" && x.lon >= -180 && x.lon <= 180 &&
    typeof x.tz === "string" && x.tz.length > 0 && x.tz.length < 64
  );
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const lat = Number(body.lat), lon = Number(body.lon);
  if (!validInput(body.a) || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const ent = body.entitlement as { token?: unknown } | undefined;
  const entitled = testMode() || verifyEntitlement(typeof ent?.token === "string" ? ent.token : null, PRODUCT) !== null;
  if (!entitled) return NextResponse.json({ entitled: false }, { status: 200 });

  try {
    const score = scoreLocation(body.a as ChartInput, lat, lon);
    return NextResponse.json({ entitled: true, score });
  } catch (err) {
    console.error("[place] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ entitled: true, score: null });
  }
}
