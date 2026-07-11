// Love decoders — "what you each need" + the Moon Match.
//
// Nobody runs a couple check to learn about herself: the core job is decoding
// THE OTHER PERSON. These cards answer it deterministically, receipts-first:
// each person's Moon (what they need to feel safe), Venus (how they love and
// what they crave), Mars (how desire shows), with dignity notes when a
// placement runs strong or strained — and the Moon-to-Moon angle that decides
// whether daily emotional life syncs automatically or needs translation.
//
// Copy registers in loveCopy.ts; dignity logic shared with enrich.ts.

import { SIGNS, signIndexFromLon, degInSign } from "./zodiac";
import { matchAspect, pairValence } from "./aspects";
import { dignityOf } from "./enrich";
import { MOON_NEEDS, VENUS_STYLE, MARS_SPARK, MOON_ELEMENT_MATCH, MOON_ASPECT_READ } from "./loveCopy";
import type { SignKey, AspectKey } from "./loveCopy";
import type { ChartFacts } from "./types";
import type { AspectName } from "./types";

const fmt = (lon: number) => {
  const si = signIndexFromLon(lon);
  const within = degInSign(lon);
  const d = Math.floor(within);
  const m = Math.round((within - d) * 60);
  return `${m === 60 ? d + 1 : d}°${String(m === 60 ? 0 : m).padStart(2, "0")}′ ${SIGNS[si].en}`;
};

const DIGNITY_NOTE: Record<string, string> = {
  domicile: "in its home sign — this side of them is settled and generous",
  exaltation: "exalted — this side of them runs at its brilliant best",
  detriment: "in detriment — this side of them works harder than it looks",
  fall: "in fall — this side of them is tender and easily bruised",
};

export interface NeedsPerson {
  name: string;
  moon: { sign: SignKey; glyph: string; needs: string; tell: string; dignity: string | null; proof: string; timeSensitive: boolean };
  venus: { sign: SignKey; glyph: string; gives: string; craves: string; dignity: string | null; proof: string };
  mars: { sign: SignKey; glyph: string; spark: string; proof: string };
}

export interface NeedsProfile {
  available: boolean;
  a: NeedsPerson | null;
  b: NeedsPerson | null;
}

function personNeeds(chart: ChartFacts, name: string): NeedsPerson | null {
  const moon = chart.planets.find((p) => p.body === "Moon");
  const venus = chart.planets.find((p) => p.body === "Venus");
  const mars = chart.planets.find((p) => p.body === "Mars");
  if (!moon || !venus || !mars) return null;
  const dig = (body: string, signIndex: number) => {
    const d = dignityOf(body, signIndex);
    return d ? DIGNITY_NOTE[d] ?? null : null;
  };
  const moonSign = SIGNS[moon.signIndex].en as SignKey;
  const venusSign = SIGNS[venus.signIndex].en as SignKey;
  const marsSign = SIGNS[mars.signIndex].en as SignKey;
  return {
    name,
    moon: {
      sign: moonSign, glyph: SIGNS[moon.signIndex].glyph,
      needs: MOON_NEEDS[moonSign].needs, tell: MOON_NEEDS[moonSign].tell,
      dignity: dig("Moon", moon.signIndex),
      proof: `☾ ${fmt(moon.lon)}`,
      timeSensitive: !chart.subject.timeKnown && (chart.moonRange?.crossesSign ?? false),
    },
    venus: {
      sign: venusSign, glyph: SIGNS[venus.signIndex].glyph,
      gives: VENUS_STYLE[venusSign].gives, craves: VENUS_STYLE[venusSign].craves,
      dignity: dig("Venus", venus.signIndex),
      proof: `♀ ${fmt(venus.lon)}`,
    },
    mars: {
      sign: marsSign, glyph: SIGNS[mars.signIndex].glyph,
      spark: MARS_SPARK[marsSign],
      proof: `♂ ${fmt(mars.lon)}`,
    },
  };
}

/** Both people's love needs, decoded. Order matches (nameA, nameB). */
export function needsProfile(a: ChartFacts, b: ChartFacts, nameA: string, nameB: string): NeedsProfile {
  const pa = personNeeds(a, nameA);
  const pb = personNeeds(b, nameB);
  return { available: pa !== null && pb !== null, a: pa, b: pb };
}

// ── Moon Match ──

export interface MoonMatch {
  available: boolean;
  aSign: SignKey; bSign: SignKey;
  aElement: string; bElement: string;
  elementRead: string;   // how the two nervous systems read safety
  aspect: AspectKey;     // moon-to-moon angle (or "none")
  aspectRead: string;
  valence: "harmonious" | "tension" | "blending" | null;
  orb: number | null;
  proof: string;
  timeSensitive: boolean;
}

/** The Moon-to-Moon read: elements + the exact angle between the two Moons. */
export function moonMatch(a: ChartFacts, b: ChartFacts): MoonMatch | null {
  const ma = a.planets.find((p) => p.body === "Moon");
  const mb = b.planets.find((p) => p.body === "Moon");
  if (!ma || !mb) return null;
  const aSign = SIGNS[ma.signIndex].en as SignKey;
  const bSign = SIGNS[mb.signIndex].en as SignKey;
  const aEl = SIGNS[ma.signIndex].element;
  const bEl = SIGNS[mb.signIndex].element;

  const sep = Math.abs(((ma.lon - mb.lon + 540) % 360) - 180);
  const m = matchAspect(sep, "Moon", "Moon");
  const aspect: AspectKey = m ? (m.def.name as AspectKey) : "none";
  const valence = m ? pairValence(m.def.name as AspectName, "Moon", "Moon") : null;

  return {
    available: true,
    aSign, bSign, aElement: aEl, bElement: bEl,
    elementRead: MOON_ELEMENT_MATCH[aEl as keyof typeof MOON_ELEMENT_MATCH][bEl as "fire" | "earth" | "air" | "water"],
    aspect,
    aspectRead: MOON_ASPECT_READ[aspect],
    valence,
    orb: m ? Math.round(m.orb * 10) / 10 : null,
    proof: m
      ? `☾ ${fmt(ma.lon)} ${m.def.name} ☾ ${fmt(mb.lon)} · orb ${m.orb.toFixed(1)}°`
      : `☾ ${fmt(ma.lon)} · ☾ ${fmt(mb.lon)} · no major angle (${sep.toFixed(0)}° apart)`,
    timeSensitive: (!a.subject.timeKnown && (a.moonRange?.crossesSign ?? false)) ||
                   (!b.subject.timeKnown && (b.moonRange?.crossesSign ?? false)),
  };
}
