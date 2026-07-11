// Directional synastry — "does he feel it too?"
//
// Compatibility isn't symmetric. A contact lands hardest on whoever's PERSONAL
// planet is in it (your Moon being squeezed by their Saturn is felt by YOU;
// their Moon warmed by your Venus is felt by THEM), and house overlays land in
// the house-owner's life. Re-aggregating the existing synastry facts by
// receiver gives each side's "charge" — with an honest even-both-ways branch.
//
// Pure re-aggregation: no new ephemeris work, fully deterministic.

import type { SynastryResult, SynAspect } from "./synastry";

/** How strongly a contact is FELT by the owner of this point. Personal points
 *  feel; outer planets transmit. (Classical receiver weighting.) */
const FEEL_WEIGHT: Record<string, number> = {
  Moon: 1.0, Ascendant: 0.95, Venus: 0.9, Sun: 0.8, Mars: 0.7, Mercury: 0.6,
  Jupiter: 0.35, Saturn: 0.25, MC: 0.25, Uranus: 0.12, Neptune: 0.12, Pluto: 0.12,
};
const w = (body: string) => FEEL_WEIGHT[body] ?? 0.2;

export interface DirectionalSide {
  /** 0-100 share of the total charge landing on this person. */
  share: number;
  /** The single contact this person feels most, with plain words. */
  strongest: { headline: string; proof: string } | null;
}

export interface DirectionalSplit {
  available: boolean;
  a: DirectionalSide;
  b: DirectionalSide;
  lean: "A" | "B" | "even";
  /** Computed, honest one-liner for the card/tease. */
  line: string;
  /** For the free tease: true only when the asymmetry is real. */
  notablyUneven: boolean;
}

export function directionalSplit(syn: SynastryResult): DirectionalSplit {
  let aCharge = 0;
  let bCharge = 0;
  let aTop: { v: number; asp: SynAspect } | null = null;
  let bTop: { v: number; asp: SynAspect } | null = null;

  for (const asp of syn.aspects) {
    const intoA = asp.points * w(asp.aBody); // A's point is in the contact → A feels it
    const intoB = asp.points * w(asp.bBody);
    aCharge += intoA;
    bCharge += intoB;
    if (!aTop || intoA > aTop.v) aTop = { v: intoA, asp };
    if (!bTop || intoB > bTop.v) bTop = { v: intoB, asp };
  }
  // House overlays: the planet lands in the HOUSE-OWNER's life. from:"A" means
  // A's planet falls in B's house → felt by B.
  for (const ov of syn.overlays) {
    if (ov.from === "A") bCharge += ov.bonus * 0.6;
    else aCharge += ov.bonus * 0.6;
  }

  const total = aCharge + bCharge;
  if (total <= 0 || syn.aspects.length === 0) {
    return {
      available: false,
      a: { share: 50, strongest: null }, b: { share: 50, strongest: null },
      lean: "even", line: "", notablyUneven: false,
    };
  }

  const aShare = Math.round((aCharge / total) * 100);
  const bShare = 100 - aShare;
  // Honest threshold: below 56/44 the split is noise, call it even.
  const lean: DirectionalSplit["lean"] = aShare >= 56 ? "A" : bShare >= 56 ? "B" : "even";
  const nameA = syn.names.a;
  const nameB = syn.names.b;

  const line =
    lean === "even"
      ? `This one is remarkably even — the charge lands on ${nameA} and ${nameB} in almost equal measure, which is rarer than it sounds.`
      : lean === "A"
        ? `The pull runs stronger through ${nameA} — more of this bond's charge lands on ${nameA}'s side of the chart (${aShare}% of the felt weight).`
        : `The pull runs stronger through ${nameB} — more of this bond's charge lands on ${nameB}'s side of the chart (${bShare}% of the felt weight).`;

  const side = (top: { v: number; asp: SynAspect } | null): DirectionalSide["strongest"] =>
    top ? { headline: top.asp.headline, proof: top.asp.proof } : null;

  return {
    available: true,
    a: { share: aShare, strongest: side(aTop) },
    b: { share: bShare, strongest: side(bTop) },
    lean,
    line,
    notablyUneven: lean !== "even",
  };
}
