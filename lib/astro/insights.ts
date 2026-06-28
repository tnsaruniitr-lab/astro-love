// Deterministic, copy-ready READS over a computed SynastryResult.
//
// These are pure functions — no astronomy, no AI. Every value traces to a field
// the synastry engine already emits (subscores, aspects, valence, orb, overlays),
// so the warm framing stays inside the "transparent math" rule (SPEC §2):
//  - never claim rarity from orb (orb = tightness/exactness, not statistical rarity)
//  - handle the common zero-subscore case honestly and non-fatalistically
//    (e.g. communication is 0 whenever there are no Mercury contacts)

import type { SynastryResult, SynAspect } from "./synastry";

export type Facet = "emotional" | "attraction" | "affection" | "communication" | "commitment";

const FACET_LABEL: Record<Facet, string> = {
  emotional: "Emotional",
  attraction: "Attraction",
  affection: "Affection",
  communication: "Communication",
  commitment: "Commitment",
};

// Tie-break order when two facets are equal (most love-defining first).
const FACET_PRIORITY: Facet[] = ["attraction", "emotional", "affection", "commitment", "communication"];

export const facetLabel = (f: Facet) => FACET_LABEL[f];

function topFacet(sub: SynastryResult["subscores"]): Facet {
  return FACET_PRIORITY.reduce((best, f) => (sub[f] > sub[best] ? f : best), FACET_PRIORITY[0]);
}
function bottomFacet(sub: SynastryResult["subscores"]): Facet {
  return FACET_PRIORITY.reduce((worst, f) => (sub[f] < sub[worst] ? f : worst), FACET_PRIORITY[0]);
}

/** Harmonious-leaning vs dynamic-leaning, by total points (conjunctions count as flow). */
export function tilt(syn: SynastryResult): "harmonious" | "dynamic" {
  let pos = 0, neg = 0;
  for (const a of syn.aspects) (a.valence === "tension" ? (neg += a.points) : (pos += a.points));
  return pos >= neg ? "harmonious" : "dynamic";
}

// ───────────────────────── couple archetype ─────────────────────────
export interface Archetype { name: string; definition: string }

const ARCHETYPE: Record<string, Archetype> = {
  "attraction:harmonious": { name: "The Spark", definition: "Easy magnetism — being drawn to each other feels effortless." },
  "attraction:dynamic": { name: "The Magnet", definition: "Attraction runs hot, with just enough friction to keep it electric." },
  "emotional:harmonious": { name: "The Sanctuary", definition: "A deep, safe emotional home you both keep returning to." },
  "emotional:dynamic": { name: "The Tide", definition: "Big feelings that rise and fall together — never dull." },
  "affection:harmonious": { name: "The Sweethearts", definition: "Tenderness and fondness are your native language." },
  "affection:dynamic": { name: "The Romantics", definition: "Warmth with a passionate, dramatic streak." },
  "communication:harmonious": { name: "The Kindred Minds", definition: "You think out loud together and simply get each other." },
  "communication:dynamic": { name: "The Sparring Partners", definition: "Lively minds that challenge and sharpen each other." },
  "commitment:harmonious": { name: "The Anchor", definition: "Steady, grounded and built for the long haul." },
  "commitment:dynamic": { name: "The Builders", definition: "You forge something lasting through real, shared effort." },
};

const BAND_FALLBACK: Record<string, Archetype> = {
  rare: { name: "The Rare Ones", definition: "An unusually rich web of connection between your charts." },
  strong: { name: "The Naturals", definition: "Real chemistry on solid foundations." },
  potential: { name: "The Slow Burn", definition: "A genuine spark with plenty of room to grow." },
  work: { name: "The Becoming", definition: "Attraction is here; depth comes with patience." },
  challenging: { name: "The Opposites", definition: "Very different rhythms that can teach each other a lot." },
};

export function coupleArchetype(syn: SynastryResult): Archetype {
  const sub = syn.subscores;
  const top = topFacet(sub);
  // No facet has any points (no romance contacts at all) → fall back to the band.
  if (sub[top] <= 0) return BAND_FALLBACK[syn.band.key] ?? BAND_FALLBACK.potential;
  return ARCHETYPE[`${top}:${tilt(syn)}`] ?? BAND_FALLBACK[syn.band.key] ?? BAND_FALLBACK.potential;
}

// ───────────────────────── strongest thread (hero aspect) ─────────────────────────
export interface Thread { aspect: SynAspect; tightness: string | null }

export function strongestThread(syn: SynastryResult): Thread | null {
  if (syn.aspects.length === 0) return null;
  // aspects are points-desc; prefer a positive contact for the hero card.
  const aspect = syn.aspects.find((a) => a.valence !== "tension") ?? syn.aspects[0];
  const tightness = aspect.orb < 1 ? "almost exact" : aspect.orb < 3 ? "remarkably tight" : null;
  return { aspect, tightness };
}

// ───────────────────────── flow vs grow split ─────────────────────────
export function flowGrow(syn: SynastryResult): { flow: SynAspect[]; grow: SynAspect[] } {
  return {
    flow: syn.aspects.filter((a) => a.valence !== "tension"),
    grow: syn.aspects.filter((a) => a.valence === "tension"),
  };
}

// ───────────────────────── sub-score reads ─────────────────────────
const STRONG_LINE: Record<Facet, string> = {
  emotional: "you feel each other — emotional resonance is your home base.",
  attraction: "chemistry is your renewable fuel.",
  affection: "warmth and fondness come easily between you.",
  communication: "you think and talk in sync.",
  commitment: "you're wired to last — real staying power.",
};

const GROW_LINE: Record<Facet, string> = {
  emotional: "naming what you feel out loud will deepen the bond.",
  attraction: "keep courting each other — novelty keeps the spark lit.",
  affection: "small, regular gestures of warmth go a long way for you two.",
  communication: "in conflict, slow down and check you've understood before you reply.",
  commitment: "talking openly about the future will build security.",
};

// When a facet is literally 0 there is no aspect behind it — say so honestly,
// framed as open space rather than a deficiency (non-fatalism, SPEC §2.4).
const ZERO_LINE: Record<Facet, string> = {
  emotional: "deep emotional contacts don't show up between your charts — a quiet space to build feeling on purpose, not a flaw.",
  attraction: "the charts show little raw chemistry — attraction you build deliberately often lasts longest anyway.",
  affection: "Venus contacts are sparse here — affection is an open page to write together.",
  communication: "no Mercury contacts surfaced — you get to invent how you talk, free of old scripts.",
  commitment: "no Saturn glue shows yet — commitment here is a choice you make, not a given.",
};

export interface SubscoreRead {
  strong: { key: Facet; label: string; value: number; line: string };
  tender: { key: Facet; label: string; value: number; line: string };
}

export function subscoreRead(syn: SynastryResult): SubscoreRead {
  const sub = syn.subscores;
  const s = topFacet(sub);
  const t = bottomFacet(sub);
  return {
    strong: { key: s, label: FACET_LABEL[s], value: sub[s], line: STRONG_LINE[s] },
    tender: { key: t, label: FACET_LABEL[t], value: sub[t], line: sub[t] <= 0 ? ZERO_LINE[t] : GROW_LINE[t] },
  };
}
