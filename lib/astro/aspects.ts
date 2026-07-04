// Aspect detection between two ecliptic longitudes (SPEC.md §6.4).
// Shared by the natal wheel (a chart's own planets) and by synastry
// (inter-chart contacts between two people).

import type { AspectName, NatalAspect, PlacedBody } from "./types";

interface AspectDef {
  name: AspectName;
  angle: number;
  baseOrb: number;
  valence: "harmonious" | "tension" | "blending";
}

export const ASPECTS: AspectDef[] = [
  { name: "conjunction", angle: 0, baseOrb: 8, valence: "blending" },
  { name: "sextile", angle: 60, baseOrb: 4, valence: "harmonious" },
  { name: "square", angle: 90, baseOrb: 6, valence: "tension" },
  { name: "trine", angle: 120, baseOrb: 7, valence: "harmonious" },
  { name: "quincunx", angle: 150, baseOrb: 3, valence: "tension" },
  { name: "opposition", angle: 180, baseOrb: 7, valence: "tension" },
];

const isLuminary = (b: string) => b === "Sun" || b === "Moon";

/** Angular separation of two longitudes, folded to [0,180]. */
export function separation(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/** Allowed orb: base + luminary bonus (+1.5 one luminary, +2 both). */
function allowedOrb(def: AspectDef, b1: string, b2: string): number {
  const lum = (isLuminary(b1) ? 1 : 0) + (isLuminary(b2) ? 1 : 0);
  const bonus = lum === 2 ? 2 : lum === 1 ? 1.5 : 0;
  return def.baseOrb + bonus;
}

export interface AspectMatch {
  def: AspectDef;
  orb: number;
  allowedOrb: number;
}

/** Closest in-orb major aspect between two bodies, or null. */
export function matchAspect(sep: number, keyA: string, keyB: string): AspectMatch | null {
  let best: AspectMatch | null = null;
  for (const def of ASPECTS) {
    const allow = allowedOrb(def, keyA, keyB);
    const orb = Math.abs(sep - def.angle);
    if (orb <= allow && (!best || orb < best.orb)) best = { def, orb, allowedOrb: allow };
  }
  return best;
}

// ───────── pair-aware conjunction valence ─────────
// A conjunction fuses two energies, but WHAT fuses decides how it feels:
// Venus meeting Jupiter flows; Saturn or Pluto clamping a personal point
// binds and frictions. One shared table so the score, the copy, and the
// wheel colors never disagree. Non-conjunctions keep the geometry valence.

const PERSONAL_PTS = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendant", "Midheaven"]);
const HEAVY = new Set(["Saturn", "Pluto"]); // binding/compulsive when on a personal point
const VOLATILE_WITH_MARS = new Set(["Uranus", "Neptune"]); // erratic / undermining drive
const SOFT = new Set(["Venus", "Moon", "Sun", "Ascendant"]);

export type Valence = "harmonious" | "tension" | "blending";

/** Valence of a specific aspect between two named points. */
export function pairValence(aspect: AspectName, keyA: string, keyB: string): Valence {
  if (aspect !== "conjunction") {
    return ASPECTS.find((d) => d.name === aspect)!.valence;
  }
  const heavyOnPersonal =
    (HEAVY.has(keyA) && PERSONAL_PTS.has(keyB)) || (HEAVY.has(keyB) && PERSONAL_PTS.has(keyA));
  if (heavyOnPersonal) return "tension";
  const marsVolatile =
    (keyA === "Mars" && VOLATILE_WITH_MARS.has(keyB)) || (keyB === "Mars" && VOLATILE_WITH_MARS.has(keyA));
  if (marsVolatile) return "tension";
  const jupiterSoft =
    (keyA === "Jupiter" && SOFT.has(keyB)) || (keyB === "Jupiter" && SOFT.has(keyA));
  if (jupiterSoft) return "harmonious";
  return "blending";
}

/** All natal aspects among a chart's own planets (de-duplicated unordered pairs). */
export function natalAspects(planets: PlacedBody[]): NatalAspect[] {
  const out: NatalAspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p = planets[i];
      const q = planets[j];
      const sep = separation(p.lon, q.lon);
      const m = matchAspect(sep, p.body, q.body);
      if (m) {
        out.push({
          a: p.id,
          b: q.id,
          aspect: m.def.name,
          angle: sep,
          orb: Math.round(m.orb * 100) / 100,
          valence: pairValence(m.def.name, p.body, q.body),
        });
      }
    }
  }
  return out;
}
