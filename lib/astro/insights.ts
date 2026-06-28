// Deterministic, copy-ready READS over a computed SynastryResult.
//
// Pure functions, no astronomy, no AI. Every value traces to a field the
// synastry engine already emits (subscores, aspects, valence, orb, overlays),
// so the warm framing stays inside the "transparent math" rule (SPEC §2):
//  - never claim rarity from orb (orb = tightness, not statistical rarity)
//  - handle the common zero-subscore case honestly and non-fatalistically
//  - no em-dashes in any user-facing string

import type { SynastryResult, SynAspect, SynOverlay } from "./synastry";

export type Facet = "emotional" | "attraction" | "affection" | "communication" | "commitment";

const FACET_LABEL: Record<Facet, string> = {
  emotional: "Emotional", attraction: "Attraction", affection: "Affection",
  communication: "Communication", commitment: "Commitment",
};
const FACET_PRIORITY: Facet[] = ["attraction", "emotional", "affection", "commitment", "communication"];

export const facetLabel = (f: Facet) => FACET_LABEL[f];

const PERSONAL = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars"]);
const ANGLES = new Set(["Ascendant", "Midheaven"]);
const OUTER = new Set(["Uranus", "Neptune", "Pluto"]);
const isPersonal = (k: string) => PERSONAL.has(k) || ANGLES.has(k);
const isOuterPair = (a: SynAspect) => OUTER.has(a.aBody) || OUTER.has(a.bBody);
const pairKey = (a: string, b: string) => [a, b].sort().join("|");

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
export interface Archetype { name: string; definition: string; line: string }

const ARCHETYPE: Record<string, Archetype> = {
  "attraction:harmonious": { name: "The Spark", definition: "Easy magnetism, where being drawn to each other feels effortless.", line: "You two are easy to be around, and easy to want." },
  "attraction:dynamic": { name: "The Magnet", definition: "Attraction runs hot, with just enough friction to keep it electric.", line: "You two run hot, and a little friction keeps it electric." },
  "emotional:harmonious": { name: "The Sanctuary", definition: "A deep, safe emotional home you both keep returning to.", line: "You two feel like home to each other." },
  "emotional:dynamic": { name: "The Tide", definition: "Big feelings that rise and fall together, never dull.", line: "You two feel everything fully, highs and lows alike." },
  "affection:harmonious": { name: "The Sweethearts", definition: "Tenderness and fondness are your native language.", line: "You two are gentle with each other, and it shows." },
  "affection:dynamic": { name: "The Romantics", definition: "Warmth with a passionate, dramatic streak.", line: "You two love big, with a flair for the dramatic." },
  "communication:harmonious": { name: "The Kindred Minds", definition: "You think out loud together and simply get each other.", line: "You two finish each other's thoughts." },
  "communication:dynamic": { name: "The Sparring Partners", definition: "Lively minds that challenge and sharpen each other.", line: "You two debate, and you both get sharper for it." },
  "commitment:harmonious": { name: "The Anchor", definition: "Steady, grounded and built for the long haul.", line: "You two feel solid, the kind that lasts." },
  "commitment:dynamic": { name: "The Builders", definition: "You forge something lasting through real, shared effort.", line: "You two build something real, on purpose." },
};
const BAND_FALLBACK: Record<string, Archetype> = {
  rare: { name: "The Rare Ones", definition: "An unusually rich web of connection between your charts.", line: "You two have something most people never find." },
  strong: { name: "The Naturals", definition: "Real chemistry on solid foundations.", line: "You two just work, and you can feel it." },
  potential: { name: "The Slow Burn", definition: "A genuine spark with plenty of room to grow.", line: "You two start as a spark and grow from there." },
  work: { name: "The Becoming", definition: "Attraction is here, and depth comes with patience.", line: "You two are a work in progress, in the best way." },
  challenging: { name: "The Opposites", definition: "Very different rhythms that can teach each other a lot.", line: "You two are different, and that is the lesson." },
};

export function coupleArchetype(syn: SynastryResult): Archetype {
  const sub = syn.subscores;
  const top = topFacet(sub);
  if (sub[top] <= 0) return BAND_FALLBACK[syn.band.key] ?? BAND_FALLBACK.potential;
  return ARCHETYPE[`${top}:${tilt(syn)}`] ?? BAND_FALLBACK[syn.band.key] ?? BAND_FALLBACK.potential;
}

// ───────────────────────── strongest thread (hero aspect) ─────────────────────────
export interface Thread { aspect: SynAspect; tightness: string | null }

export function strongestThread(syn: SynastryResult): Thread | null {
  if (syn.aspects.length === 0) return null;
  const aspect = syn.aspects.find((a) => a.valence !== "tension") ?? syn.aspects[0];
  const tightness = aspect.orb < 1 ? "almost exact" : aspect.orb < 3 ? "remarkably tight" : null;
  return { aspect, tightness };
}

// ───────────────────────── flow vs grow ─────────────────────────
export function flowGrow(syn: SynastryResult): { flow: SynAspect[]; grow: SynAspect[] } {
  return {
    flow: syn.aspects.filter((a) => a.valence !== "tension"),
    grow: syn.aspects.filter((a) => a.valence === "tension"),
  };
}

/** Outer-planet (generational) contacts collapsed into one chip per planet. */
export interface GenChip { planet: string; count: number; meaning: string }
const OUTER_MEANING: Record<string, string> = {
  Uranus: "an electric, free streak", Neptune: "a dreamy, idealizing pull", Pluto: "an all-or-nothing depth",
};
export function groupGenerational(aspects: SynAspect[]): GenChip[] {
  const counts = new Map<string, number>();
  for (const a of aspects) {
    const outer = OUTER.has(a.aBody) ? a.aBody : OUTER.has(a.bBody) ? a.bBody : null;
    if (outer) counts.set(outer, (counts.get(outer) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([planet, count]) => ({ planet, count, meaning: OUTER_MEANING[planet] ?? "a deep background pull" }))
    .sort((x, y) => y.count - x.count);
}

/** Story-shaped flow/grow: personal contacts lead, the outer tail is summarized. */
export interface FlowGrowStory {
  topFlow: SynAspect[]; topGrow: SynAspect[];
  flowCount: number; growCount: number;
  allFlow: SynAspect[]; allGrow: SynAspect[];
  gen: GenChip[];
}
export function flowGrowStory(syn: SynastryResult, n = 3): FlowGrowStory {
  const { flow, grow } = flowGrow(syn);
  const flowP = flow.filter((a) => !isOuterPair(a));
  const growP = grow.filter((a) => !isOuterPair(a));
  return {
    topFlow: flowP.slice(0, n), topGrow: growP.slice(0, n),
    flowCount: flow.length, growCount: grow.length,
    allFlow: flow, allGrow: grow,
    gen: groupGenerational(syn.aspects),
  };
}

// ───────────────────────── sub-score reads ─────────────────────────
const STRONG_LINE: Record<Facet, string> = {
  emotional: "you feel each other, and emotional resonance is your home base.",
  attraction: "chemistry is your renewable fuel.",
  affection: "warmth and fondness come easily between you.",
  communication: "you think and talk in sync.",
  commitment: "you are wired to last, with real staying power.",
};
const GROW_LINE: Record<Facet, string> = {
  emotional: "naming what you feel out loud will deepen the bond.",
  attraction: "keep courting each other, novelty keeps the spark lit.",
  affection: "small, regular gestures of warmth go a long way for you two.",
  communication: "in conflict, slow down and check you understood before you reply.",
  commitment: "talking openly about the future will build security.",
};
const ZERO_LINE: Record<Facet, string> = {
  emotional: "deep emotional contacts do not show up between your charts, a quiet space to build feeling on purpose, not a flaw.",
  attraction: "the charts show little raw chemistry, and attraction you build on purpose often lasts longest anyway.",
  affection: "Venus contacts are sparse here, so affection is an open page to write together.",
  communication: "no Mercury contacts surfaced, so you get to invent how you talk, free of old scripts.",
  commitment: "no Saturn glue shows yet, so commitment here is a choice you make, not a given.",
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

// ───────────────────────── "what to tend to" deep dive ─────────────────────────
export interface TendItem { fact: string; why: string; doThis: string }

const NAV: Record<string, string> = {
  square: "Before fixing, ask what the other needs in the moment.",
  opposition: "Meet in the middle, and name the shared goal out loud.",
  quincunx: "Expect to keep adjusting, and let that be okay.",
  conjunction: "Give each other a little room to breathe.",
};
const NAV_DEFAULT = "Name it early, and name it with warmth.";
const FACET_DO: Record<Facet, string> = {
  emotional: "Share one real feeling a day.",
  attraction: "Plan something new together this week.",
  affection: "Offer one small gesture of warmth daily.",
  communication: "Check you understood before you reply.",
  commitment: "Have one honest talk about where this is going.",
};

/** Up to 3 constructive growth beats, each grounded in a real engine field. */
export function tendToList(syn: SynastryResult): TendItem[] {
  const items: TendItem[] = [];
  const seen = new Set<string>();

  // 1) Heaviest tension contact that touches a personal planet or angle.
  const grow = syn.aspects.filter((a) => a.valence === "tension");
  const lead = grow.find((a) => isPersonal(a.aBody) || isPersonal(a.bBody));
  if (lead) {
    seen.add(pairKey(lead.aBody, lead.bBody));
    items.push({ fact: lead.headline, why: lead.why, doThis: NAV[lead.aspect] ?? NAV_DEFAULT });
  }

  // 2) Saturn binding a personal planet (the heavy-conjunction case).
  const sat = syn.aspects.find(
    (a) => a.aspect === "conjunction" &&
      ((a.aBody === "Saturn" && isPersonal(a.bBody)) || (a.bBody === "Saturn" && isPersonal(a.aBody))) &&
      !seen.has(pairKey(a.aBody, a.bBody)),
  );
  if (sat) {
    seen.add(pairKey(sat.aBody, sat.bBody));
    items.push({
      fact: "Saturn ties into a personal planet.",
      why: "Saturn can steady love or make it feel like duty, depending on how you carry it.",
      doThis: "Keep choosing each other, not just the commitment.",
    });
  }

  // 3) Always: the lowest sub-score, honestly framed.
  const sub = syn.subscores;
  const t = bottomFacet(sub);
  const v = sub[t];
  items.push({
    fact: v <= 0 ? `${FACET_LABEL[t]} is open space.` : `${FACET_LABEL[t]} runs quiet, ${v} of 100.`,
    why: v <= 0 ? ZERO_LINE[t] : GROW_LINE[t],
    doThis: FACET_DO[t],
  });

  return items.slice(0, 3);
}

// ───────────────────────── story lead sentences ─────────────────────────
const SCORE_MEANING: Record<string, { harmonious: string; dynamic: string }> = {
  rare: { harmonious: "A rare, easy closeness. You two fit like you have met before.", dynamic: "A rare, electric bond. Intense, and never boring." },
  strong: { harmonious: "Strong, easy chemistry. You two click with little friction.", dynamic: "Strong chemistry that loves a little spark. You two are rarely bored." },
  potential: { harmonious: "A gentle, promising spark. It grows the more you show up.", dynamic: "A real spark with edges to learn. The friction can become depth." },
  work: { harmonious: "A soft start with room to grow. Patience pays off here.", dynamic: "Different rhythms, real attraction. It rewards effort." },
  challenging: { harmonious: "Very different speeds, with tender moments. Go gently.", dynamic: "Very different speeds. Intense, and it asks for real work." },
};
export function scoreMeaning(syn: SynastryResult): string {
  const m = SCORE_MEANING[syn.band.key] ?? SCORE_MEANING.potential;
  return tilt(syn) === "harmonious" ? m.harmonious : m.dynamic;
}

export function dimensionsLead(reads: SubscoreRead): string {
  return `Your strongest pull is ${reads.strong.label.toLowerCase()}, and your softest spot is ${reads.tender.label.toLowerCase()}.`;
}

const HOUSE_AREA: Record<number, string> = {
  1: "first attraction", 4: "home and roots", 5: "romance and play", 7: "partnership", 8: "deep intimacy",
};
export function bringsLead(name: string, items: SynOverlay[]): string {
  const areas = [...new Set(items.map((o) => HOUSE_AREA[o.house]).filter(Boolean))];
  if (areas.length === 0) return `${name} adds a quiet background note.`;
  const list = areas.length === 1 ? areas[0] : `${areas.slice(0, -1).join(", ")} and ${areas[areas.length - 1]}`;
  return `${name} brings ${list} into the bond.`;
}
