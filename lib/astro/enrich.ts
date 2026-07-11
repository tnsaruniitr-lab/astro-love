// Deterministic per-contact enrichment — the "shows its work" depth.
//
// Everything here is computed from the two ecliptic longitudes plus fixed
// rulership/element/modality tables. NO LLM, NO randomness: the technical
// reasoning (mutual reception, earth trine, orb tier, cardinal/fixed dynamic)
// is DERIVED, so the enriched reading is fully available with no API key. The
// AI writer, when present, reasons over these same facts for warmer prose — it
// changes the voice, never the facts.

import { SIGNS, signIndexFromLon, bodyMeta } from "./zodiac";
import type { SynAspect } from "./synastry";

const MODALITY = ["cardinal", "fixed", "mutable"] as const;
type Modality = (typeof MODALITY)[number];
type Element = "fire" | "earth" | "air" | "water";

// Traditional (Ptolemaic) domicile rulers, used for reception + disposition.
// signIndex: 0 Aries … 11 Pisces.
const SIGN_RULER: string[] = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
];
// Which sign indices each planet rules (the inverse of SIGN_RULER).
const DOMICILE: Record<string, number[]> = {
  Sun: [4], Moon: [3], Mercury: [2, 5], Venus: [1, 6], Mars: [0, 7],
  Jupiter: [8, 11], Saturn: [9, 10],
};
const HAS_DOMICILE = (b: string) => b in DOMICILE;

// Classical essential dignities beyond domicile. Exaltation = the sign where a
// planet works at its brilliant best; fall = its opposite; detriment = the
// sign(s) opposite domicile, where the planet works against its own grain.
const EXALTATION: Record<string, number> = {
  Sun: 0, Moon: 1, Mercury: 5, Venus: 11, Mars: 9, Jupiter: 3, Saturn: 6,
};
export type Dignity = "domicile" | "exaltation" | "detriment" | "fall";
/** Strongest single dignity label for a planet in a sign, or null. */
export function dignityOf(body: string, signIndex: number): Dignity | null {
  if (DOMICILE[body]?.includes(signIndex)) return "domicile";
  if (EXALTATION[body] === signIndex) return "exaltation";
  if (EXALTATION[body] !== undefined && (EXALTATION[body] + 6) % 12 === signIndex) return "fall";
  if (DOMICILE[body]?.some((d) => (d + 6) % 12 === signIndex)) return "detriment";
  return null;
}

const modalityOf = (signIndex: number): Modality => MODALITY[signIndex % 3];
const elementOf = (signIndex: number): Element => SIGNS[signIndex].element;

export type OrbTier = "exact" | "tight" | "moderate" | "wide";
function orbTier(orb: number): OrbTier {
  if (orb <= 1) return "exact";
  if (orb <= 3) return "tight";
  if (orb <= 5) return "moderate";
  return "wide";
}

export interface ContactFacts {
  aBody: string;
  bBody: string;
  aSign: string;
  bSign: string;
  aElement: Element;
  bElement: Element;
  aModality: Modality;
  bModality: Modality;
  aRuler: string; // ruler of A's sign
  bRuler: string; // ruler of B's sign
  aspect: string;
  orb: number;
  orbTier: OrbTier;
  /** Shared element (only when both bodies are in the same element — e.g. a trine). */
  sharedElement: Element | null;
  /** A sits in a sign that B rules (one-way reception into B). */
  aInBRuled: boolean;
  bInARuled: boolean;
  /** Both host each other by domicile — the strongest cooperative dignity. */
  mutualReception: boolean;
  /** Essential dignity of each planet in its own sign (null = peregrine). */
  aDignity: Dignity | null;
  bDignity: Dignity | null;
}

/** Pure facts for one inter-chart contact. */
export function contactFacts(a: SynAspect): ContactFacts {
  const aSi = signIndexFromLon(a.aLon);
  const bSi = signIndexFromLon(a.bLon);
  const aEl = elementOf(aSi);
  const bEl = elementOf(bSi);
  const aInBRuled = HAS_DOMICILE(a.bBody) && DOMICILE[a.bBody].includes(aSi);
  const bInARuled = HAS_DOMICILE(a.aBody) && DOMICILE[a.aBody].includes(bSi);
  return {
    aBody: a.aBody,
    bBody: a.bBody,
    aSign: SIGNS[aSi].en,
    bSign: SIGNS[bSi].en,
    aElement: aEl,
    bElement: bEl,
    aModality: modalityOf(aSi),
    bModality: modalityOf(bSi),
    aRuler: SIGN_RULER[aSi],
    bRuler: SIGN_RULER[bSi],
    aspect: a.aspect,
    orb: a.orb,
    orbTier: orbTier(a.orb),
    sharedElement: aEl === bEl ? aEl : null,
    aInBRuled,
    bInARuled,
    mutualReception: aInBRuled && bInARuled,
    aDignity: dignityOf(a.aBody, aSi),
    bDignity: dignityOf(a.bBody, bSi),
  };
}

// ───────────────────────── deterministic rich copy ─────────────────────────

export interface ContactSection {
  kind: "geometry" | "dignity" | "meaning" | "watch";
  kicker: string;
  body: string;
  /** Set on the standout section so the UI can spotlight it. */
  spotlight?: boolean;
}

const ASPECT_GEOMETRY: Record<string, string> = {
  conjunction: "the two land on the same degree, so their energies fuse into one charge",
  sextile: "a 60° angle, an easy, opt-in kind of support",
  square: "a 90° angle, the friction that forces growth",
  trine: "a 120° angle between two signs of the same element, which flows with almost no resistance",
  quincunx: "a 150° angle, an offbeat link that asks for constant small adjustments",
  opposition: "a 180° face-off, two poles that both attract and pull",
};
const ORB_PHRASE: Record<OrbTier, string> = {
  exact: "The orb is near-exact, so this is one of the loudest notes in your whole chart, not a background hum.",
  tight: "The orb is tight, so this reads clearly rather than faintly.",
  moderate: "The orb is moderate, present but not dominant.",
  wide: "The orb is wide, so treat this as a softer undertone.",
};
const ELEMENT_NATURE: Record<Element, string> = {
  fire: "fire, the element of spark, drive and momentum",
  earth: "earth, the element of what is tangible, patient and built to last",
  air: "air, the element of ideas, words and mental connection",
  water: "water, the element of feeling, depth and intuition",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Specific dynamics for the pairs people scrutinise most. Keyed by the sorted
// planet pair. The aspect valence decides the closing tone.
const PAIR_DYNAMIC: Record<string, string> = {
  "Saturn|Venus": "Venus is how someone loves; Saturn is time, weight and staying power. Put them together and you get the endurance signature, affection that wants to commit and last.",
  "Sun|Saturn": "Saturn lends structure and seriousness to who the other person is, one steadies the other over the long run.",
  "Mars|Venus": "What one person chases meets how the other loves, the rawest, most physical chemistry two charts can share.",
  "Moon|Sun": "One person's core identity meets the other's need for safety, the deepest fit in synastry.",
  "Moon|Venus": "What one needs to feel safe meets how the other loves, so warmth flows without translation.",
  "Moon|Moon": "You both read comfort and safety the same way, your emotional rhythms sync on their own.",
  "Venus|Venus": "You love and value in similar ways, so tastes rarely clash.",
  "Mars|Moon": "Drive meets tenderness, one person's fire charges the other's feeling.",
  "Mercury|Mercury": "You think and talk in the same key, conversation rarely needs subtitles.",
  "Mercury|Moon": "How one mind works meets what the other feels, thinking and feeling stay connected.",
  "Jupiter|Venus": "Growth meets affection, the bond feels generous and lucky.",
};
const VALENCE_TONE: Record<string, string> = {
  harmonious: "Because it arrives harmoniously, that gift feels like ease rather than effort.",
  blending: "Fused this tightly, the two are hard to tell apart, for better and for more.",
  tension: "Because it comes with friction, this is real work, and the effort is exactly where the growth lives.",
};

/** Body role, plain-language, for the meaning section. */
const ROLE: Record<string, string> = {
  Sun: "who you are", Moon: "what you need to feel safe", Mercury: "how you think and talk",
  Venus: "how you love", Mars: "what you chase", Jupiter: "where you grow",
  Saturn: "where you get serious", Uranus: "your need for freedom",
  Neptune: "your dreamy side", Pluto: "your depth",
  Ascendant: "the face you meet the world with", Midheaven: "where you're headed",
};
const enName = (b: string) => bodyMeta(b as never)?.en ?? b;
const pairKey = (a: string, b: string) => [a, b].sort().join("|");

/** Compose the technically-dense sections for one contact — fully offline. */
export function enrichSections(a: SynAspect, names: { a: string; b: string }): ContactSection[] {
  const f = contactFacts(a);
  const sections: ContactSection[] = [];
  const enA = enName(a.aBody);
  const enB = enName(a.bBody);

  // 1. Geometry
  let geo = `This is ${ASPECT_GEOMETRY[a.aspect] ?? "a notable angle"}.`;
  if (f.sharedElement) {
    geo += ` Both ${names.a}'s ${enA} at ${fmt(a.aLon)} and ${names.b}'s ${enB} at ${fmt(a.bLon)} sit in ${ELEMENT_NATURE[f.sharedElement]}.`;
  } else {
    geo += ` ${names.a}'s ${enA} sits at ${fmt(a.aLon)} in ${elemShort(f.aElement)}; ${names.b}'s ${enB} at ${fmt(a.bLon)} in ${elemShort(f.bElement)}.`;
  }
  geo += ` ${ORB_PHRASE[f.orbTier]}`;
  sections.push({ kind: "geometry", kicker: "The geometry", body: geo });

  // 2. Dignity — the standout when a mutual reception is present.
  if (f.mutualReception) {
    sections.push({
      kind: "dignity",
      spotlight: true,
      kicker: "✦ The rare part — a mutual reception",
      body: `Here is what most reports never catch. ${names.a}'s ${enA} sits in ${f.aSign}, a sign that ${enName(a.bBody)} rules. ${names.b}'s ${enB} sits in ${f.bSign}, a sign that ${enName(a.aBody)} rules. Each planet is living in the other's home, a mutual reception. In plain terms, ${roleOf(a.aBody)} and ${roleOf(a.bBody)} do not just touch here, they host each other, and each one makes the other stronger.`,
    });
  } else if (f.aInBRuled || f.bInARuled) {
    const guest = f.aInBRuled ? a.aBody : a.bBody;
    const host = f.aInBRuled ? a.bBody : a.aBody;
    sections.push({
      kind: "dignity",
      kicker: "A one-way welcome",
      body: `${enName(guest)} sits in a sign ${enName(host)} rules, so it arrives as a welcome guest, disposed toward and supported by the other, even if the favour is not returned in kind.`,
    });
  }

  // 2b. Essential dignity of each planet in its own sign — appended to the
  // dignity section (or standing alone) when a planet is notably strong or
  // strained. Classical tables, pure lookup.
  const dignityLines = [
    dignityLine(names.a, enA, f.aDignity, f.aSign),
    dignityLine(names.b, enB, f.bDignity, f.bSign),
  ].filter(Boolean) as string[];
  if (dignityLines.length > 0) {
    const last = sections[sections.length - 1];
    if (last.kind === "dignity") {
      last.body += ` ${dignityLines.join(" ")}`;
    } else {
      sections.push({ kind: "dignity", kicker: "How strong each planet stands", body: dignityLines.join(" ") });
    }
  }

  // 3. Meaning
  const dyn = PAIR_DYNAMIC[pairKey(a.aBody, a.bBody)];
  let meaning = dyn
    ? dyn
    : `${cap(roleOf(a.aBody))} meets ${roleOf(a.bBody)}.`;
  meaning += ` ${VALENCE_TONE[a.valence] ?? ""}`;
  // The modality micro-dynamic (only informative when the two differ).
  if (f.aModality !== f.bModality) {
    meaning += ` ${modalityLine(names.a, enA, f.aModality, names.b, enB, f.bModality)}`;
  }
  sections.push({ kind: "meaning", kicker: "What it means for you two", body: meaning.trim() });

  // 4. Watch — element-flavoured, honest.
  sections.push({ kind: "watch", kicker: "Gently watch", body: watchFor(f) });

  return sections;
}

function fmt(lon: number): string {
  const si = signIndexFromLon(lon);
  const within = lon - Math.floor(lon / 30) * 30;
  let d = Math.floor(within);
  let m = Math.round((within - d) * 60);
  if (m === 60) { m = 0; d += 1; }
  return `${d}°${String(m).padStart(2, "0")}′ ${SIGNS[si].en}`;
}
const elemShort = (e: Element): string => e;
const roleOf = (b: string) => ROLE[b] ?? enName(b).toLowerCase();

const DIGNITY_PHRASE: Record<Dignity, string> = {
  domicile: "is in its own sign there, at home and at full strength",
  exaltation: "is exalted there, working at its brilliant best",
  detriment: "is in detriment there, working against its own grain, which asks for patience",
  fall: "is in its fall there, quieter than usual, which asks for gentleness",
};
function dignityLine(name: string, en: string, d: Dignity | null, sign: string): string | null {
  if (!d) return null;
  return `${name}'s ${en} ${DIGNITY_PHRASE[d]} in ${sign}.`;
}

const MODALITY_VERB: Record<Modality, string> = {
  cardinal: "makes the first move to build", fixed: "holds it steady and sustains it", mutable: "keeps it flexible and adapting",
};
function modalityLine(nA: string, enA: string, mA: Modality, nB: string, enB: string, mB: Modality): string {
  return `${nA}'s ${enA} is ${mA}, so it ${MODALITY_VERB[mA]}; ${nB}'s ${enB} is ${mB}, so it ${MODALITY_VERB[mB]}.`;
}

const WATCH_BY_ELEMENT: Record<Element, string> = {
  earth: "Earth can under-express. A bond this steady can quietly assume the warmth instead of saying it, name the appreciation out loud.",
  fire: "Fire can burn fast. Keep the spark aimed at each other, not against, and let it rest between flares.",
  air: "Air can live in the head. Bring the ideas back down to what you both actually feel and do.",
  water: "Water can flood. Give each other room to settle before the big feelings turn into big talks.",
};
function watchFor(f: ContactFacts): string {
  if (f.aspect === "square" || f.aspect === "opposition" || f.aspect === "quincunx") {
    return "This one asks for effort, name the friction early and with warmth, and it becomes the place you both grow.";
  }
  const el = f.sharedElement ?? f.aElement;
  return WATCH_BY_ELEMENT[el];
}
