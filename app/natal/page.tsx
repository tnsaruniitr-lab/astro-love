import Experience from "@/components/Experience";
import type { BirthFormValues } from "@/components/BirthForm";

export const metadata = {
  title: "Astro-Love · Natal Chart",
  description: "Your real birth chart, computed from astronomy, the foundation of math-based love compatibility.",
};

// Fresh visitor: blank form, no sample chart. A returning visitor's last chart
// is restored client-side from storage (see Experience).
const BLANK_FORM: BirthFormValues = {
  name: "",
  place: null,
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  timeKnown: true,
};

export default function Page() {
  return <Experience initialChart={null} initialForm={BLANK_FORM} />;
}
