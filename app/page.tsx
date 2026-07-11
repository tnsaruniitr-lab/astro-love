import type { Metadata } from "next";
import CoupleExperience from "@/components/CoupleExperience";
import { computeChart } from "@/lib/astro/chart";
import { computeSynastry } from "@/lib/astro/synastry";
import { coupleArchetype } from "@/lib/astro/insights";
import { coupleScoreRange } from "@/lib/astro/uncertainty";
import { decodeReading } from "@/lib/astro/share";
import { decodeShare } from "@/lib/server/sharetoken";
import type { BirthFormValues } from "@/components/BirthFields";
import type { ChartInput } from "@/lib/astro/types";

const BASE_TITLE = "Astro-Love · Love Compatibility";
const BASE_DESC = "Math-based love compatibility from real synastry, every point explained.";

// A fresh visitor starts with empty panels, no sample reading. Neutral date so
// the spinners aren't at year zero; name + place stay blank placeholders.
const BLANK: BirthFormValues = { name: "", place: null, year: 2000, month: 1, day: 1, hour: 12, minute: 0, timeKnown: true };

function toInput(f: BirthFormValues): ChartInput {
  const p = f.place!;
  return {
    name: f.name || undefined, place: p.label,
    year: f.year, month: f.month, day: f.day, hour: f.hour, minute: f.minute,
    timeKnown: f.timeKnown, lat: p.lat, lon: p.lon, tz: p.tz,
  };
}

/** Resolve a shared reading from either the encrypted (?s=) or legacy (?r=)
 *  token. ?s= is PII-safe (opaque ciphertext); ?r= is the old cleartext form,
 *  still honored so existing links don't break. */
function resolveShared(sp?: { r?: string; s?: string }): { a: BirthFormValues; b: BirthFormValues } | null {
  const legacy = sp?.s ? decodeShare(sp.s) : sp?.r;
  if (!legacy) return null;
  const decoded = decodeReading(legacy);
  return decoded?.a.place && decoded?.b.place ? decoded : null;
}

export function generateMetadata({ searchParams }: { searchParams?: { r?: string; s?: string } }): Metadata {
  const shared = resolveShared(searchParams);
  const ogParam = searchParams?.s
    ? `s=${encodeURIComponent(searchParams.s)}`
    : searchParams?.r
      ? `r=${encodeURIComponent(searchParams.r)}`
      : "";

  if (shared && ogParam) {
    const A = shared.a, B = shared.b;
    const syn = computeSynastry(
      computeChart(toInput(A)), computeChart(toInput(B)),
      A.name || "Person A", B.name || "Person B",
    );
    const arch = coupleArchetype(syn);
    const title = `${syn.names.a} & ${syn.names.b} — ${syn.score}/100`;
    const desc = `${syn.band.label}. Couple type: ${arch.name}. See your own match free on Astro-Love.`;
    const img = `/api/og/?${ogParam}`;
    return {
      title,
      description: desc,
      openGraph: { title, description: desc, images: [{ url: img, width: 1200, height: 630 }], type: "website" },
      twitter: { card: "summary_large_image", title, description: desc, images: [img] },
    };
  }

  return {
    title: BASE_TITLE,
    description: BASE_DESC,
    openGraph: { title: BASE_TITLE, description: BASE_DESC, images: ["/api/og/"], type: "website" },
    twitter: { card: "summary_large_image", title: BASE_TITLE, description: BASE_DESC, images: ["/api/og/"] },
  };
}

export default function Page({ searchParams }: { searchParams?: { r?: string; s?: string } }) {
  // A shared link carries both people's inputs, so the recipient sees the same
  // reading (computeSynastry is deterministic, no backend needed). Without one,
  // the page renders empty until the visitor calculates, and a returning
  // visitor's own last reading is restored client-side from storage.
  const shared = resolveShared(searchParams);
  if (shared) {
    const A = shared.a, B = shared.b;
    const inA = toInput(A), inB = toInput(B);
    const chartA = computeChart(inA);
    const chartB = computeChart(inB);
    const syn = computeSynastry(chartA, chartB, A.name || "Person A", B.name || "Person B");
    const range = coupleScoreRange(inA, inB);
    return <CoupleExperience initialA={A} initialB={B} initialResult={{ a: chartA, b: chartB, syn, inputs: { a: inA, b: inB }, range }} />;
  }

  return <CoupleExperience initialA={{ ...BLANK }} initialB={{ ...BLANK }} initialResult={null} />;
}
