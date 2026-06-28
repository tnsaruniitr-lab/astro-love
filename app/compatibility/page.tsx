import CoupleExperience from "@/components/CoupleExperience";
import { computeChart } from "@/lib/astro/chart";
import { computeSynastry } from "@/lib/astro/synastry";
import { placeForCity } from "@/lib/geo/cities";
import type { BirthFormValues } from "@/components/BirthFields";
import type { ChartInput } from "@/lib/astro/types";

export const metadata = {
  title: "Astro-Love · Compatibility",
  description: "Math-based love compatibility from real synastry — every point explained.",
};

const A: BirthFormValues = { name: "Anna", place: placeForCity("moscow"), year: 1990, month: 5, day: 14, hour: 6, minute: 30, timeKnown: true };
const B: BirthFormValues = { name: "Dmitri", place: placeForCity("spb"), year: 1988, month: 8, day: 22, hour: 14, minute: 15, timeKnown: true };

function toInput(f: BirthFormValues): ChartInput {
  const p = f.place!;
  return {
    name: f.name || undefined,
    place: p.label,
    year: f.year, month: f.month, day: f.day, hour: f.hour, minute: f.minute,
    timeKnown: f.timeKnown, lat: p.lat, lon: p.lon, tz: p.tz,
  };
}

export default function Page() {
  const chartA = computeChart(toInput(A));
  const chartB = computeChart(toInput(B));
  const syn = computeSynastry(chartA, chartB, A.name, B.name);
  return <CoupleExperience initialA={A} initialB={B} initialResult={{ a: chartA, b: chartB, syn }} />;
}
