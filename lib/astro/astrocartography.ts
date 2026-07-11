// Astrocartography — "where in the world you should live."
//
// A planet is ANGULAR (on the horizon or meridian) along specific lines across
// the globe; living on a planet's line amplifies that planet in your life.
// This is real, classical relocation astrology, and it's fully DETERMINISTIC:
// from each planet's equatorial position at birth + the sidereal time, the four
// angle-lines are pure spherical trigonometry. No LLM, no external ephemeris —
// our engine already gives the positions (verified sub-arcminute vs Swiss
// Ephemeris), so no AGPL/commercial library is needed.
//
// Requires an exact birth TIME (the lines rotate ~15°/hour with the Earth).

import { equatorialOfDate, gastDeg } from "./ephemeris";
import { resolveInstant } from "../geo/time";
import { WORLD_CITIES } from "../geo/world-cities";
import { bodyMeta } from "./zodiac";
import type { ChartInput, PlanetName } from "./types";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const norm180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const angDiff = (a: number, b: number) => Math.abs(norm180(a - b));

type Angle = "rising" | "culminating" | "setting" | "nadir"; // ASC / MC / DSC / IC
const ANGLE_ABBR: Record<Angle, string> = { rising: "ASC", culminating: "MC", setting: "DSC", nadir: "IC" };

// Planets that carry a clear "place" signal. Outer planets are cautionary only.
const PLANETS: PlanetName[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const CAUTION_PLANETS: PlanetName[] = ["Saturn", "Mars", "Pluto", "Neptune"];

const ORB_MAX = 6; // degrees of longitude within which a line is "active"

// ── the lines for one planet ──
interface PlanetLines { planet: PlanetName; ra: number; dec: number }

function planetLines(date: Date): PlanetLines[] {
  return [...new Set([...PLANETS, ...CAUTION_PLANETS])].map((p) => {
    const { ra, dec } = equatorialOfDate(p, date);
    return { planet: p, ra, dec };
  });
}

/** Smallest orb (deg) between a city and a planet's four angle-lines, plus the
 *  angle it belongs to. Returns null if the planet is circumpolar at that
 *  latitude (never rises/sets → no ASC/DSC) and the meridian lines are far. */
function bestAngle(pl: PlanetLines, gast: number, lat: number, lon: number): { angle: Angle; orb: number } {
  const cands: { angle: Angle; lonLine: number }[] = [];
  const lonMC = norm180(pl.ra - gast);
  cands.push({ angle: "culminating", lonLine: lonMC });
  cands.push({ angle: "nadir", lonLine: norm180(lonMC + 180) });
  const h = -Math.tan(lat * RAD) * Math.tan(pl.dec * RAD);
  if (h >= -1 && h <= 1) {
    const H0 = Math.acos(h) * DEG;
    cands.push({ angle: "rising", lonLine: norm180(pl.ra - H0 - gast) });
    cands.push({ angle: "setting", lonLine: norm180(pl.ra + H0 - gast) });
  }
  let best: { angle: Angle; orb: number } | null = null;
  for (const c of cands) {
    const orb = angDiff(lon, c.lonLine);
    if (!best || orb < best.orb) best = { angle: c.angle, orb };
  }
  return best!;
}

// ── meanings ──
export interface ThemeDef { key: string; label: string; blurb: string; planet: PlanetName; angles: Angle[] }
const THEMES: ThemeDef[] = [
  { key: "love", label: "For love & romance", planet: "Venus", angles: ["rising", "setting", "culminating", "nadir"],
    blurb: "Where your Venus turns angular, affection, beauty and being wanted come more easily." },
  { key: "growth", label: "For luck & growth", planet: "Jupiter", angles: ["culminating", "rising", "setting", "nadir"],
    blurb: "On your Jupiter lines the world feels generous, doors open and horizons widen." },
  { key: "vitality", label: "For confidence & vitality", planet: "Sun", angles: ["rising", "culminating", "setting", "nadir"],
    blurb: "Your Sun lines are where you feel most yourself, seen, warm and alive." },
  { key: "belonging", label: "For home & belonging", planet: "Moon", angles: ["nadir", "rising", "setting", "culminating"],
    blurb: "Moon lines are where you put down roots and feel emotionally at home." },
  { key: "career", label: "For career & standing", planet: "Sun", angles: ["culminating"],
    blurb: "The Sun on the Midheaven is the classic line for recognition and public success." },
];

function reasonFor(planet: PlanetName, angle: Angle, city: string): string {
  const en = bodyMeta(planet as never)?.en ?? planet;
  const A: Record<Angle, string> = {
    rising: `your ${en} rises, so it colours how you show up and how the place sees you`,
    culminating: `your ${en} sits at the Midheaven, shaping your public life and direction`,
    setting: `your ${en} is on the descendant, so it flows into relationships and who you meet`,
    nadir: `your ${en} is at the nadir, working on home, roots and your private life`,
  };
  return `In ${city}, ${A[angle]}.`;
}
const CAUTION_MEANING: Record<string, string> = {
  Saturn: "Saturn is angular here, which builds discipline and career weight but can feel heavy or isolating.",
  Mars: "Mars is angular here, high energy and drive, but tempers can run hot.",
  Pluto: "Pluto is angular here, intense and transformative, not a soft landing.",
  Neptune: "Neptune is angular here, dreamy and inspiring, but easy to lose your footing.",
};

// ── output ──
export interface PlaceRec {
  city: string; country: string; lat: number; lon: number;
  planet: string; angle: string; angleAbbr: string; orbDeg: number; reason: string;
}
export interface WhereTheme { key: string; label: string; blurb: string; picks: PlaceRec[] }
export interface WherePlaces {
  available: boolean;
  note?: string;
  themes: WhereTheme[];
  caution: PlaceRec[];
}

/** Deterministic relocation recommendations for one birth chart. */
export function wherePlaces(input: ChartInput): WherePlaces {
  if (!input.timeKnown) {
    return {
      available: false,
      note: "Your relocation map depends on your exact birth time (the lines shift about 15° for every hour). Add your birth time to unlock where in the world your planets are strongest.",
      themes: [],
      caution: [],
    };
  }
  const inst = resolveInstant(input);
  if (!inst.zoneValid) {
    return { available: false, note: "We could not resolve your birth time zone, so the relocation map is unavailable.", themes: [], caution: [] };
  }
  const date = inst.utc;
  const gast = gastDeg(date);
  const lines = planetLines(date);
  const byPlanet = new Map(lines.map((l) => [l.planet, l]));

  // Precompute, per city, the best (smallest-orb) angle for every planet.
  const cityHits = WORLD_CITIES.map((c) => {
    const hits = new Map<PlanetName, { angle: Angle; orb: number }>();
    for (const l of lines) hits.set(l.planet, bestAngle(l, gast, c.lat, c.lon));
    return { city: c, hits };
  });

  const mkRec = (ci: (typeof cityHits)[number], planet: PlanetName, angle: Angle, orb: number): PlaceRec => ({
    city: ci.city.name, country: ci.city.country, lat: ci.city.lat, lon: ci.city.lon,
    planet, angle, angleAbbr: ANGLE_ABBR[angle], orbDeg: Math.round(orb * 10) / 10,
    reason: reasonFor(planet, angle, ci.city.name),
  });

  const themes: WhereTheme[] = THEMES.map((th) => {
    const scored = cityHits
      .map((ci) => {
        const h = ci.hits.get(th.planet);
        return h && th.angles.includes(h.angle) && h.orb <= ORB_MAX ? { ci, h } : null;
      })
      .filter(Boolean) as { ci: (typeof cityHits)[number]; h: { angle: Angle; orb: number } }[];
    scored.sort((a, b) => a.h.orb - b.h.orb);
    // Dedupe by country so one region doesn't dominate a theme.
    const seen = new Set<string>();
    const picks: PlaceRec[] = [];
    for (const s of scored) {
      if (seen.has(s.ci.city.country)) continue;
      seen.add(s.ci.city.country);
      picks.push(mkRec(s.ci, th.planet, s.h.angle, s.h.orb));
      if (picks.length >= 3) break;
    }
    return { key: th.key, label: th.label, blurb: th.blurb, picks };
  }).filter((t) => t.picks.length > 0);

  // Cautionary cities: a heavy planet tightly angular (within 3°).
  const caution: PlaceRec[] = [];
  const seenC = new Set<string>();
  const cautionScored = cityHits
    .flatMap((ci) =>
      CAUTION_PLANETS.filter((p) => byPlanet.has(p)).map((p) => ({ ci, p, h: ci.hits.get(p)! })),
    )
    .filter((x) => x.h.orb <= 3)
    .sort((a, b) => a.h.orb - b.h.orb);
  for (const x of cautionScored) {
    if (seenC.has(x.ci.city.name)) continue;
    seenC.add(x.ci.city.name);
    caution.push({
      city: x.ci.city.name, country: x.ci.city.country, lat: x.ci.city.lat, lon: x.ci.city.lon,
      planet: x.p, angle: x.h.angle, angleAbbr: ANGLE_ABBR[x.h.angle], orbDeg: Math.round(x.h.orb * 10) / 10,
      reason: CAUTION_MEANING[x.p] ?? `${x.p} is strongly angular here.`,
    });
    if (caution.length >= 4) break;
  }

  return { available: true, themes, caution };
}

// ── score one arbitrary location ("is my city good for me?") ──
export interface LocationHit {
  planet: string; angle: string; angleAbbr: string; orbDeg: number;
  tone: "great" | "good" | "mixed" | "caution"; reason: string;
}
export interface LocationScore {
  available: boolean; note?: string; lat: number; lon: number;
  verdict: string; hits: LocationHit[];
}

const GREAT = new Set<string>(["Venus", "Jupiter"]);
const GOOD = new Set<string>(["Sun", "Moon", "Mercury"]);
const LOOKUP_ORB = 8; // slightly wider than the recommendation orb — "notable" here

const PLANET_AT = (planet: PlanetName, angle: Angle): string => {
  const en = bodyMeta(planet as never)?.en ?? planet;
  const A: Record<Angle, string> = {
    rising: `${en} rising — it shapes how you show up here`,
    culminating: `${en} on the Midheaven — it shapes your work and public life here`,
    setting: `${en} setting — it flows into your relationships here`,
    nadir: `${en} at the nadir — it works on home and roots here`,
  };
  return A[angle];
};

export function scoreLocation(input: ChartInput, lat: number, lon: number): LocationScore {
  if (!input.timeKnown) {
    return { available: false, lat, lon, verdict: "", hits: [], note: "Scoring a place needs your exact birth time." };
  }
  const inst = resolveInstant(input);
  if (!inst.zoneValid) return { available: false, lat, lon, verdict: "", hits: [], note: "Birth time zone could not be resolved." };
  const gast = gastDeg(inst.utc);
  const lines = planetLines(inst.utc);

  const hits: LocationHit[] = [];
  for (const l of lines) {
    const b = bestAngle(l, gast, lat, lon);
    if (b.orb > LOOKUP_ORB) continue;
    const caution = CAUTION_PLANETS.includes(l.planet) && !GREAT.has(l.planet) && !GOOD.has(l.planet);
    const tone: LocationHit["tone"] = caution ? "caution" : GREAT.has(l.planet) ? "great" : GOOD.has(l.planet) ? "good" : "mixed";
    hits.push({
      planet: l.planet, angle: b.angle, angleAbbr: ANGLE_ABBR[b.angle], orbDeg: Math.round(b.orb * 10) / 10, tone,
      reason: caution ? (CAUTION_MEANING[l.planet] ?? `${l.planet} is angular here.`) : `Your ${PLANET_AT(l.planet, b.angle)}.`,
    });
  }
  hits.sort((a, b) => a.orbDeg - b.orbDeg);
  const top = hits.slice(0, 5);
  const good = top.filter((h) => h.tone === "great" || h.tone === "good").length;
  const bad = top.filter((h) => h.tone === "caution").length;
  const verdict = top.length === 0
    ? "A neutral place for you — no strong planetary lines run close by, so it neither lifts nor drains any one theme."
    : good > bad
      ? "A supportive place for you — beneficial lines run close here."
      : bad > good
        ? "An intense place for you — heavier lines dominate, so it asks more than it gives."
        : "A mixed place for you — real lift and real challenge both run close.";
  return { available: true, lat, lon, verdict, hits: top };
}

// Exposed for tests: the raw line longitude for a planet/angle at a latitude.
export function _lineLongitude(planet: PlanetName, date: Date, angle: Angle, lat: number): number | null {
  const { ra, dec } = equatorialOfDate(planet, date);
  const gast = gastDeg(date);
  if (angle === "culminating") return norm180(ra - gast);
  if (angle === "nadir") return norm180(ra - gast + 180);
  const h = -Math.tan(lat * RAD) * Math.tan(dec * RAD);
  if (h < -1 || h > 1) return null;
  const H0 = Math.acos(h) * DEG;
  return angle === "rising" ? norm180(ra - H0 - gast) : norm180(ra + H0 - gast);
}
