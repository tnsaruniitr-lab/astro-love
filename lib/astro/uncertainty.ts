// Honest uncertainty for unknown birth times (SPEC §2: never present a guess
// as a fact). When a birth time is unknown the noon-placeholder Moon can sit
// up to ~7° from the truth — and Moon contacts carry the heaviest synastry
// weights — so the headline score is recomputed across the whole birth day
// and shown as a range when it actually moves.

import { computeChart } from "./chart";
import { computeSynastry } from "./synastry";
import type { ChartInput } from "./types";

export interface ScoreRange {
  min: number;
  max: number;
  spread: number; // max - min
}

/** Re-resolve an unknown-time input at a specific placeholder hour/minute. */
function chartAtPlaceholder(input: ChartInput, hour: number, minute: number) {
  // Force the placeholder through by passing timeKnown=true for the instant
  // computation only — then strip angles to preserve unknown-time semantics.
  const facts = computeChart({ ...input, hour, minute, timeKnown: true });
  return {
    ...facts,
    asc: null,
    mc: null,
    houseCusps: null,
    planets: facts.planets.map((p) => ({ ...p, house: null })),
    subject: { ...facts.subject, timeKnown: false },
  };
}

/** The headline score's possible range given unknown birth times.
 *  Returns null when both times are known (no uncertainty to show). */
export function coupleScoreRange(inA: ChartInput, inB: ChartInput): ScoreRange | null {
  if (inA.timeKnown && inB.timeKnown) return null;

  const SAMPLES: Array<[number, number]> = [[0, 0], [12, 0], [23, 59]];
  const chartsA = inA.timeKnown
    ? [computeChart(inA)]
    : SAMPLES.map(([h, m]) => chartAtPlaceholder(inA, h, m));
  const chartsB = inB.timeKnown
    ? [computeChart(inB)]
    : SAMPLES.map(([h, m]) => chartAtPlaceholder(inB, h, m));

  let min = Infinity;
  let max = -Infinity;
  for (const ca of chartsA) {
    for (const cb of chartsB) {
      const s = computeSynastry(ca, cb).score;
      if (s < min) min = s;
      if (s > max) max = s;
    }
  }
  return { min, max, spread: max - min };
}
