// Transit timing — "your best windows over the next year."
//
// Where the moving sky (transiting Venus, Jupiter, Mars, Sun) forms a
// supportive aspect to your fixed natal points, that theme of life gets a lift.
// Fully deterministic given a `from` date: we sample each transiting planet's
// real position day by day (our verified ephemeris) and detect the windows.
// This is the product's reason to return — the reading changes with the sky.

import { eclipticOfDateLon } from "./ephemeris";
import { separation } from "./aspects";
import { bodyMeta } from "./zodiac";
import type { ChartFacts, PlanetName } from "./types";

const TRANSITERS: PlanetName[] = ["Venus", "Mars", "Jupiter", "Sun"];
const ASPECTS = [
  { name: "conjunction", angle: 0, orb: 2, verb: "meets" },
  { name: "sextile", angle: 60, orb: 1.5, verb: "supports" },
  { name: "trine", angle: 120, orb: 2, verb: "flows to" },
];

// (transiting planet → natal points it lights up) grouped by life theme.
interface ThemeRule { theme: string; label: string; blurb: string; trans: PlanetName; natal: string[] }
const RULES: ThemeRule[] = [
  { theme: "love", label: "Love & connection", blurb: "warmth, attraction and openness are favoured", trans: "Venus", natal: ["Venus", "Moon", "Sun", "Ascendant", "Descendant"] },
  { theme: "love", label: "Love & connection", blurb: "a lucky, generous window for the heart", trans: "Jupiter", natal: ["Venus", "Moon"] },
  { theme: "growth", label: "Luck & growth", blurb: "doors open and it pays to say yes", trans: "Jupiter", natal: ["Sun", "Jupiter", "Midheaven"] },
  { theme: "drive", label: "Energy & drive", blurb: "momentum and courage run high, good for bold moves", trans: "Mars", natal: ["Sun", "Mars", "Ascendant"] },
  { theme: "spotlight", label: "Recognition", blurb: "you are more visible, good for launches and asks", trans: "Sun", natal: ["Midheaven", "Sun"] },
];

export interface TransitWindow {
  theme: string; label: string; blurb: string;
  transiter: string; aspect: string; natalPoint: string;
  start: string; peak: string; end: string; // YYYY-MM-DD
  headline: string;
}
export interface TransitTiming {
  available: boolean;
  note?: string;
  fromISO: string;
  windows: TransitWindow[];
}

interface NatalPoint { key: string; lon: number }

function natalPoints(chart: ChartFacts): NatalPoint[] {
  const pts: NatalPoint[] = chart.planets
    .filter((p) => ["Sun", "Moon", "Venus", "Mars", "Jupiter"].includes(p.body))
    .map((p) => ({ key: p.body, lon: p.lon }));
  if (chart.asc) pts.push({ key: "Ascendant", lon: chart.asc.lon });
  if (chart.asc) pts.push({ key: "Descendant", lon: (chart.asc.lon + 180) % 360 });
  if (chart.mc) pts.push({ key: "Midheaven", lon: chart.mc.lon });
  return pts;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dayMs = 86_400_000;

/** Scan the next `days` for supportive transits. Deterministic given `from`. */
export function transitTiming(chart: ChartFacts, from: Date, days = 365): TransitTiming {
  const points = natalPoints(chart);
  // Precompute each transiter's daily longitude once.
  const transLon = new Map<PlanetName, number[]>();
  for (const t of TRANSITERS) {
    const arr: number[] = [];
    for (let d = 0; d <= days; d++) arr.push(eclipticOfDateLon(t, new Date(from.getTime() + d * dayMs)));
    transLon.set(t, arr);
  }

  const windows: TransitWindow[] = [];
  for (const rule of RULES) {
    const lons = transLon.get(rule.trans)!;
    for (const np of points) {
      if (!rule.natal.includes(np.key)) continue;
      for (const asp of ASPECTS) {
        // Signed distance from exact aspect, day by day; a contiguous in-orb run = a window.
        let runStart = -1;
        let peakDay = -1;
        let peakOrb = 999;
        const closeRun = (endDay: number) => {
          if (runStart < 0) return;
          windows.push(mkWindow(from, runStart, peakDay, endDay, rule, asp, np));
          runStart = -1; peakOrb = 999; peakDay = -1;
        };
        for (let d = 0; d <= days; d++) {
          // Distance from EXACT aspect. `separation` is the shortest-arc angle
          // (0–180), so |sep − angle| catches the aspect on BOTH sides of the
          // natal point — a trine forms at +120° AND −120° (i.e. 240°). The
          // earlier `sep(lons, np+angle)` only caught the leading side, silently
          // dropping ~half of all trine/sextile windows.
          const orb = Math.abs(separation(lons[d], np.lon) - asp.angle);
          const inOrb = orb <= asp.orb;
          if (inOrb) {
            if (runStart < 0) runStart = d;
            if (orb < peakOrb) { peakOrb = orb; peakDay = d; }
          } else if (runStart >= 0) {
            closeRun(d - 1);
          }
        }
        closeRun(days);
      }
    }
  }

  // Sort by start date, dedupe near-identical windows, cap the list.
  windows.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const seen = new Set<string>();
  const out: TransitWindow[] = [];
  for (const w of windows) {
    // Key on the full identity so two genuinely different windows that happen to
    // share a theme/start/point (e.g. Venus-trine-Venus vs Jupiter-conj-Venus)
    // aren't collapsed into one.
    const k = `${w.transiter}:${w.aspect}:${w.natalPoint}:${w.start}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
    if (out.length >= 8) break;
  }

  return {
    available: out.length > 0,
    note: out.length === 0 ? "No standout supportive windows in the next year — a steady stretch." : undefined,
    fromISO: iso(from),
    windows: out,
  };
}

function mkWindow(from: Date, startDay: number, peakDay: number, endDay: number, rule: ThemeRule, asp: (typeof ASPECTS)[number], np: NatalPoint): TransitWindow {
  const d = (n: number) => iso(new Date(from.getTime() + n * dayMs));
  const enT = bodyMeta(rule.trans as never)?.en ?? rule.trans;
  const enN = np.key;
  return {
    theme: rule.theme, label: rule.label, blurb: rule.blurb,
    transiter: rule.trans, aspect: asp.name, natalPoint: np.key,
    start: d(startDay), peak: d(peakDay), end: d(endDay),
    headline: `Transiting ${enT} ${asp.verb} your ${enN}`,
  };
}
