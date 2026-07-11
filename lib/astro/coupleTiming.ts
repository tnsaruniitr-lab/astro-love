// Couple timing — "your year together", dated.
//
// Three honest sources, clearly labeled:
//  - SHARED windows: date ranges where a supportive love-theme transit lights
//    BOTH charts at once (intersection of each person's windows).
//  - BOND windows: transits to the COMPOSITE chart (the relationship's own
//    midpoint planets) — the bond itself having a moment.
//  - Personal love windows for each, when there's nothing shared to show.
//
// Honesty guards: windows that depend on a natal Moon are dropped when that
// person's birth time is unknown (the Moon's degree is approximate that day).
// Deterministic given `from`.

import { transitTiming, type TransitWindow } from "./transits";
import { compositePlanets } from "./composite";
import type { ChartFacts } from "./types";

export interface CoupleWindow {
  start: string; // YYYY-MM-DD
  end: string;
  kind: "shared" | "bond" | "a" | "b";
  label: string;     // e.g. "Lights both charts" / "The bond's own sky" / name
  headline: string;
  blurb: string;
}

export interface CoupleTiming {
  available: boolean;
  note?: string;
  windows: CoupleWindow[]; // sorted by start, max 6
  /** Days from `from` until the first window starts (0 = open right now). */
  nextInDays: number | null;
  nextKind: CoupleWindow["kind"] | null;
}

const dayMs = 86_400_000;

/** Drop windows that lean on an unreliable natal Moon (unknown birth time). */
const reliable = (w: TransitWindow, chart: ChartFacts) =>
  w.natalPoint !== "Moon" || chart.subject.timeKnown;

const loveWindows = (chart: ChartFacts, from: Date) =>
  transitTiming(chart, from).windows.filter((w) => w.theme === "love" && reliable(w, chart));

function overlap(a: TransitWindow, b: TransitWindow): { start: string; end: string } | null {
  const s = a.start > b.start ? a.start : b.start;
  const e = a.end < b.end ? a.end : b.end;
  return s <= e ? { start: s, end: e } : null;
}

export function coupleTiming(a: ChartFacts, b: ChartFacts, nameA: string, nameB: string, from: Date): CoupleTiming {
  const aw = loveWindows(a, from);
  const bw = loveWindows(b, from);

  const out: CoupleWindow[] = [];

  // Shared: any overlap between one of A's and one of B's love windows.
  for (const wa of aw) {
    for (const wb of bw) {
      const o = overlap(wa, wb);
      if (!o) continue;
      out.push({
        ...o,
        kind: "shared",
        label: "Lights both charts",
        headline: `The sky lifts ${nameA}'s chart and ${nameB}'s at once (${wa.transiter} → ${nameA}, ${wb.transiter} → ${nameB})`,
        blurb: "The same stretch of sky supports you both at once — the rare kind of window worth planning around.",
      });
    }
  }

  // The bond's own chart: transits to the composite midpoints.
  const comp = compositePlanets(a, b);
  if (comp.length > 0) {
    const bondChart = {
      planets: comp, asc: null, mc: null,
      subject: { timeKnown: true },
    } as unknown as ChartFacts;
    for (const w of transitTiming(bondChart, from).windows.filter((x) => x.theme === "love" || x.theme === "growth")) {
      out.push({
        start: w.start, end: w.end,
        kind: "bond",
        label: "The bond's own sky",
        headline: w.headline.replace("your", "your composite"),
        blurb: "A transit to the relationship's own chart — the two of you as a third thing, having its moment.",
      });
    }
  }

  // If the shared+bond list is thin, surface each person's next love window.
  if (out.length < 3) {
    for (const [ws, name, kind] of [[aw, nameA, "a"], [bw, nameB, "b"]] as const) {
      const first = ws[0];
      if (!first) continue;
      out.push({
        start: first.start, end: first.end,
        kind,
        label: `${name}'s window`,
        headline: first.headline,
        blurb: `${name}'s side of the bond gets the lift here — a good stretch for the other to make the move.`,
      });
    }
  }

  // Dedupe identical ranges, sort, cap.
  const seen = new Set<string>();
  const windows = out
    .sort((x, y) => (x.start < y.start ? -1 : x.start > y.start ? 1 : 0))
    .filter((w) => {
      const k = `${w.kind}:${w.start}:${w.end}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 6);

  // Countdown to the first window (0 when we're already inside one).
  let nextInDays: number | null = null;
  let nextKind: CoupleWindow["kind"] | null = null;
  const today = new Date(from.getTime());
  const todayISO = today.toISOString().slice(0, 10);
  for (const w of windows) {
    if (w.end < todayISO) continue;
    if (w.start <= todayISO) { nextInDays = 0; nextKind = w.kind; break; }
    const days = Math.ceil((new Date(w.start + "T00:00:00Z").getTime() - from.getTime()) / dayMs);
    nextInDays = Math.max(0, days);
    nextKind = w.kind;
    break;
  }

  return {
    available: windows.length > 0,
    note: windows.length === 0 ? "A quiet stretch — no standout shared windows in the next year. Steady skies have their own advantages." : undefined,
    windows,
    nextInDays,
    nextKind,
  };
}
