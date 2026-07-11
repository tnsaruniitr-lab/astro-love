// "Why it runs hot and cold" — the withholding-signature detector.
//
// The classical hot-cold geometries: a heavy planet (Saturn = walls/testing,
// Uranus = on-off distance, Pluto = control/merge-retreat, Neptune = fog) in
// HARD aspect (square/opposition, or a tension-valence conjunction) to the
// other person's personal planet. When one exists, the card names the exact
// angle, whose planet withholds, and what actually reassures — the thing she
// pays a psychic $50 to hear, with the degree attached.
//
// Deterministic; register copy in loveCopy.ts. Renders NOTHING when no
// qualifying contact exists (a fake tease here would be trust arson).

import { HOTCOLD_REGISTER } from "./loveCopy";
import type { SynastryResult, SynAspect } from "./synastry";

const HEAVY = new Set(["Saturn", "Uranus", "Pluto", "Neptune"]);
const PERSONAL = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars"]);
const HARD = new Set(["square", "opposition"]);

export interface HotCold {
  present: boolean;
  /** Register key, e.g. "saturn-venus". */
  key: string;
  signature: string;   // short name for the pattern
  what: string;        // what the pull-back is from the inside
  reassure: string;    // what actually works
  heavyOwner: "A" | "B";
  heavyOwnerName: string;
  heavyBody: string;
  personalOwnerName: string;
  personalBody: string;
  aspect: string;
  orb: number;
  proof: string;
  headline: string;
  timeSensitive: boolean;
}

function qualifies(a: SynAspect): { heavySide: "A" | "B" } | null {
  const hard = HARD.has(a.aspect) || (a.aspect === "conjunction" && a.valence === "tension");
  if (!hard) return null;
  if (HEAVY.has(a.aBody) && PERSONAL.has(a.bBody)) return { heavySide: "A" };
  if (HEAVY.has(a.bBody) && PERSONAL.has(a.aBody)) return { heavySide: "B" };
  return null;
}

/** Find the tightest qualifying withholding signature, if any. */
export function detectHotCold(syn: SynastryResult): HotCold | null {
  let best: { asp: SynAspect; heavySide: "A" | "B" } | null = null;
  for (const asp of syn.aspects) {
    const q = qualifies(asp);
    if (!q) continue;
    if (!best || asp.orb < best.asp.orb) best = { asp, heavySide: q.heavySide };
  }
  if (!best) return null;

  const { asp, heavySide } = best;
  const heavyBody = heavySide === "A" ? asp.aBody : asp.bBody;
  const personalBody = heavySide === "A" ? asp.bBody : asp.aBody;
  const key = `${heavyBody.toLowerCase()}-${personalBody.toLowerCase()}`;
  const reg = HOTCOLD_REGISTER[key];
  if (!reg) return null; // pair not in the register (e.g. neptune-mars) — stay silent

  const heavyOwnerName = heavySide === "A" ? syn.names.a : syn.names.b;
  const personalOwnerName = heavySide === "A" ? syn.names.b : syn.names.a;
  return {
    present: true,
    key,
    signature: reg.signature,
    what: reg.what,
    reassure: reg.reassure,
    heavyOwner: heavySide,
    heavyOwnerName,
    heavyBody,
    personalOwnerName,
    personalBody,
    aspect: asp.aspect,
    orb: asp.orb,
    proof: asp.proof,
    headline: `${heavyOwnerName}'s ${heavyBody} ${asp.aspect} ${personalOwnerName}'s ${personalBody} — ${reg.signature}`,
    timeSensitive: asp.timeSensitive === true,
  };
}
