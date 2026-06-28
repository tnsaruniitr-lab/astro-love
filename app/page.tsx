import CoupleExperience from "@/components/CoupleExperience";
import { computeChart } from "@/lib/astro/chart";
import { computeSynastry } from "@/lib/astro/synastry";
import { decodeReading } from "@/lib/astro/share";
import type { BirthFormValues } from "@/components/BirthFields";
import type { ChartInput } from "@/lib/astro/types";

export const metadata = {
  title: "Astro-Love · Love Compatibility",
  description: "Math-based love compatibility from real synastry, every point explained.",
};

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

export default function Page({ searchParams }: { searchParams?: { r?: string } }) {
  // A shared link carries both people's inputs, so the recipient sees the same
  // reading (computeSynastry is deterministic, no backend needed). Without one,
  // there's no demo: the page renders empty until the visitor calculates, and a
  // returning visitor's own last reading is restored client-side from storage.
  const token = searchParams?.r;
  if (token) {
    const decoded = decodeReading(token);
    if (decoded?.a.place && decoded?.b.place) {
      const A = decoded.a, B = decoded.b;
      const chartA = computeChart(toInput(A));
      const chartB = computeChart(toInput(B));
      const syn = computeSynastry(chartA, chartB, A.name || "Person A", B.name || "Person B");
      return <CoupleExperience initialA={A} initialB={B} initialResult={{ a: chartA, b: chartB, syn }} />;
    }
  }

  return <CoupleExperience initialA={{ ...BLANK }} initialB={{ ...BLANK }} initialResult={null} />;
}
