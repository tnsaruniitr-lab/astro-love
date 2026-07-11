import { NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { computeSynastry } from "@/lib/astro/synastry";
import { loveQuestions } from "@/lib/astro/natalReading";
import { verifyEntitlement } from "@/lib/server/entitlement";
import { proseCacheGet, proseCacheKey, proseCacheSet } from "@/lib/server/prosecache";
import { loadProse, recordReading } from "@/lib/server/db";
import { wherePlaces } from "@/lib/astro/astrocartography";
import { proseAvailable, writeCoupleProse, writeNatalProse, type CoupleProse, type NatalProse } from "@/lib/server/writer";
import type { ChartInput } from "@/lib/astro/types";

// The premium gate, server-side. The client may compute the deterministic
// engine locally (the code is public — that math was never a secret), but
// premium content unlocks only when THIS route confirms a signed entitlement
// token, and the AI-written reading exists ONLY here. Planting a fake
// localStorage flag no longer opens anything: the gate asks the server.
//
// POST body:
//   { mode: "couple", a: ChartInput, b: ChartInput, locale?, entitlement?: {ref, token}, wantProse? }
//   { mode: "natal",  a: ChartInput,               locale?, entitlement?: {ref, token}, wantProse? }
//
// Response: { entitled, proseAvailable, prose? } — prose only when entitled
// AND wantProse (the client first confirms the gate fast, then fetches prose).

export const dynamic = "force-dynamic";
export const maxDuration = 120; // prose generation can take a while

const PRODUCT = process.env.CARECOMPASS_EXPECT_PRODUCT ?? "astromatch";
const LOCALES = new Set(["en", "ru", "uk", "de", "es", "pl", "sk", "ar"]);
const testMode = () => process.env.ALLOW_TEST_UNLOCK === "1";

function validInput(x: unknown): x is ChartInput {
  if (!x || typeof x !== "object") return false;
  const i = x as Record<string, unknown>;
  return (
    typeof i.year === "number" && i.year >= 1550 && i.year <= 2650 &&
    typeof i.month === "number" && i.month >= 1 && i.month <= 12 &&
    typeof i.day === "number" && i.day >= 1 && i.day <= 31 &&
    typeof i.hour === "number" && i.hour >= 0 && i.hour <= 23 &&
    typeof i.minute === "number" && i.minute >= 0 && i.minute <= 59 &&
    typeof i.timeKnown === "boolean" &&
    typeof i.lat === "number" && i.lat >= -90 && i.lat <= 90 &&
    typeof i.lon === "number" && i.lon >= -180 && i.lon <= 180 &&
    typeof i.tz === "string" && i.tz.length > 0 && i.tz.length < 64 &&
    (i.name === undefined || (typeof i.name === "string" && i.name.length <= 80)) &&
    (i.place === undefined || (typeof i.place === "string" && i.place.length <= 160))
  );
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const mode = body.mode === "natal" ? "natal" : body.mode === "love" ? "love" : "couple";
  const locale = typeof body.locale === "string" && LOCALES.has(body.locale) ? body.locale : "en";
  const wantProse = body.wantProse === true;

  // "love" is chart-less (the love-language quiz has no birth data); it only
  // needs a server-confirmed entitlement so the client can gate rendering.
  if (mode !== "love") {
    if (!validInput(body.a) || (mode === "couple" && !validInput(body.b))) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
  }

  // Entitlement: a signed token minted by /api/pay/verify, or explicit test mode.
  const ent = body.entitlement as { ref?: unknown; token?: unknown } | undefined;
  const claims = verifyEntitlement(typeof ent?.token === "string" ? ent.token : null, PRODUCT);
  const entitled = testMode() || claims !== null;

  if (!entitled) {
    // Stale/absent token. If the client still holds the paid ref, it should
    // re-verify via /api/pay/verify to mint a fresh token, then retry.
    return NextResponse.json({ entitled: false, proseAvailable: proseAvailable() }, { status: 200 });
  }

  if (mode === "love") {
    return NextResponse.json({ entitled: true, proseAvailable: proseAvailable() });
  }

  const purchaseRef = claims?.ref ?? null;

  try {
    if (mode === "natal") {
      const chart = computeChart(body.a as ChartInput);
      // Serve the deterministic love answers from the SERVER (not the browser)
      // so the premium payload only exists after entitlement is confirmed.
      const natalAnswers = loveQuestions(chart);
      const places = wherePlaces(body.a as ChartInput);
      let prose: NatalProse | null = null;
      if (wantProse) {
        // Cost guard: memory cache → durable DB cache → generate once.
        const key = proseCacheKey(["natal", body.a, locale]);
        prose = proseCacheGet<NatalProse>(key) ?? (await loadProse<NatalProse>(key));
        if (!prose) {
          prose = await writeNatalProse(chart, locale);
        }
        proseCacheSet(key, prose);
        // Outcome record (fire-and-forget): the reading + prose, durable.
        void recordReading({
          kind: "natal",
          inputHash: key,
          locale,
          inputs: body.a,
          summary: { sun: chart.planets[0]?.sign, moon: chart.planets[1]?.sign, asc: chart.asc?.sign ?? null },
          prose,
          proseModel: prose?.model ?? null,
          purchaseRef,
        });
      }
      return NextResponse.json({ entitled: true, proseAvailable: proseAvailable(), natalAnswers, places, prose });
    }
    if (!wantProse) {
      return NextResponse.json({ entitled: true, proseAvailable: proseAvailable() });
    }
    const chartA = computeChart(body.a as ChartInput);
    const chartB = computeChart(body.b as ChartInput);
    const syn = computeSynastry(
      chartA,
      chartB,
      (body.a as ChartInput).name || "Person A",
      (body.b as ChartInput).name || "Person B",
    );
    const key = proseCacheKey(["couple", body.a, body.b, locale]);
    let prose = proseCacheGet<CoupleProse>(key) ?? (await loadProse<CoupleProse>(key));
    if (!prose) {
      prose = await writeCoupleProse(syn, locale);
    }
    proseCacheSet(key, prose);
    void recordReading({
      kind: "couple",
      inputHash: key,
      locale,
      inputs: { a: body.a, b: body.b },
      summary: { score: syn.score, band: syn.band.key, axes: syn.axes, names: syn.names },
      prose,
      proseModel: prose?.model ?? null,
      purchaseRef,
    });
    return NextResponse.json({ entitled: true, proseAvailable: proseAvailable(), prose });
  } catch (err) {
    console.error("[reading] compute/prose error:", err instanceof Error ? err.message : err);
    // Entitlement stands; prose just isn't available — client keeps templates.
    return NextResponse.json({ entitled: true, proseAvailable: proseAvailable(), prose: null });
  }
}
