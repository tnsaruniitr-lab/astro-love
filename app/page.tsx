import Experience from "@/components/Experience";
import { computeChart } from "@/lib/astro/chart";
import { placeForCity } from "@/lib/geo/cities";
import type { BirthFormValues } from "@/components/BirthForm";

// Default sample so the page renders a beautiful, populated chart on first load.
const DEFAULT_FORM: BirthFormValues = {
  name: "",
  place: placeForCity("moscow"),
  year: 1990,
  month: 5,
  day: 14,
  hour: 6,
  minute: 30,
  timeKnown: true,
};

export default function Page() {
  const place = DEFAULT_FORM.place!;
  const chart = computeChart({
    name: DEFAULT_FORM.name || undefined,
    place: place.label,
    year: DEFAULT_FORM.year,
    month: DEFAULT_FORM.month,
    day: DEFAULT_FORM.day,
    hour: DEFAULT_FORM.hour,
    minute: DEFAULT_FORM.minute,
    timeKnown: DEFAULT_FORM.timeKnown,
    lat: place.lat,
    lon: place.lon,
    tz: place.tz,
  });

  return <Experience initialChart={chart} initialForm={DEFAULT_FORM} />;
}
