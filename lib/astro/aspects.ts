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
          valence: m.def.valence,
        });
      }
    }
  }
  return out;
}
