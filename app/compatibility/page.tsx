import CoupleExperience from "@/components/CoupleExperience";
import { computeChart } from "@/lib/astro/chart";
import { computeSynastry } from "@/lib/astro/synastry";
import { placeForCity } from "@/lib/geo/cities";
import { decodeReading } from "@/lib/astro/share";
import type { BirthFormValues } from "@/components/BirthFields";
import type { ChartInput } from "@/lib/astro/types";

export const metadata = {
  title: "Astro-Love · Compatibility",
  description: "Math-based love compatibility from real synastry, every point explained.",
};

const DEFAULT_A: BirthFormValues = { name: "Anna", place: placeForCity("moscow"), year: 1990, month: 5, day: 14, hour: 6, minute: 30, timeKnown: true };
const DEFAULT_B: BirthFormValues = { name: "Dmitri", place: placeForCity("spb"), year: 1988, month: 8, day: 22, hour: 14, minute: 15, timeKnown: true };

function toInput(f: BirthFormValues): ChartInput {
  const p = f.place!;
  return {
    name: f.name || undefined, place: p.label,
    year: f.year, month: f.month, day: f.day, hour: f.hour, minute: f.minute,
    timeKnown: f.timeKnown, lat: p.lat, lon: p.lon, tz: p.tz,
  };
}

export default function Page({ searchParams }: { searchParams?: { r?: string } }) {
  let A = DEFAULT_A;
  let B = DEFAULT_B;
  // A shared link carries both people's inputs, so the recipient sees the same
  // reading (computeSynastry is deterministic, no backend needed).
  const token = searchParams?.r;
  if (token) {
    const decoded = decodeReading(token);
    if (decoded?.a.place && decoded?.b.place) { A = decoded.a; B = decoded.b; }
  }

  const chartA = computeChart(toInput(A));
  const chartB = computeChart(toInput(B));
  const syn = computeSynastry(chartA, chartB, A.name || "Person A", B.name || "Person B");
  return <CoupleExperience initialA={A} initialB={B} initialResult={{ a: chartA, b: chartB, syn }} />;
}
