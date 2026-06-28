import Experience from "@/components/Experience";
import { computeChart } from "@/lib/astro/chart";
import { findCity } from "@/lib/geo/cities";
import type { BirthFormValues } from "@/components/BirthForm";

// Default sample so the page renders a beautiful, populated chart on first load.
const DEFAULT_FORM: BirthFormValues = {
  name: "",
  cityId: "moscow",
  year: 1990,
  month: 5,
  day: 14,
  hour: 6,
  minute: 30,
  timeKnown: true,
};

export default function Page() {
  const city = findCity(DEFAULT_FORM.cityId)!;
  const chart = computeChart({
    name: DEFAULT_FORM.name || undefined,
    place: city.name,
    year: DEFAULT_FORM.year,
    month: DEFAULT_FORM.month,
    day: DEFAULT_FORM.day,
    hour: DEFAULT_FORM.hour,
    minute: DEFAULT_FORM.minute,
    timeKnown: DEFAULT_FORM.timeKnown,
    lat: city.lat,
    lon: city.lon,
    tz: city.tz,
  });

  return <Experience initialChart={chart} initialForm={DEFAULT_FORM} />;
}
