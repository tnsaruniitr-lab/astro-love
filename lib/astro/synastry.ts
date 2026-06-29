// Synastry: the explainable, weighted compatibility score (SPEC.md §6.5).
//
// Deterministic. Every point traces to a named inter-chart aspect, so the final
// 0–100 number is literally the sum of human-readable sentences. All weights,
// coefficients and constants live in CONFIG so the rubric is auditable/tunable.

import { matchAspect, separation } from "./aspects";
import { wholeSignHouse } from "./angles";
import { bodyMeta, SIGNS } from "./zodiac";
import type { ChartFacts } from "./types";

// ───────────────────────── config (auditable) ─────────────────────────
const CONFIG = {
  K_OVERALL: 45, // saturating-curve constant for the 0–100 score
  K_SUB: 14, // per-bucket constant for sub-scores
  OVERLAY_CAP: 15, // max raw points house overlays may contribute
  ASPECT_COEFF: {
    trine: 1.0,
    sextile: 0.7,
    opposition: 0.6,
    square: 0.5,
    quincunx: 0.3,
    conjunction: 1.0, // adjusted to 0.6 when Saturn binds a personal point
  } as Record<string, number>,
  OVERLAY_BONUS: { 7: 3, 5: 3, 8: 2.5, 1: 2.5, 4: 2 } as Record<number, number>,
};

const PERSONAL = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars"]);
const ANGLES = new Set(["Ascendant", "Midheaven"]);
const OUTER = new Set(["Uranus", "Neptune", "Pluto"]);
const ROMANCE = ["Sun", "Moon", "Venus", "Mars"];

// Planet-pair weights (unordered, by body type). See SPEC §6.5 step 4.
const PAIR_WEIGHT: Record<string, number> = {
  "Moon|Sun": 10,
  "Mars|Venus": 9,
  "Moon|Venus": 7,
  "Sun|Venus": 7,
  "Moon|Moon": 6,
  "Venus|Venus": 6,
  "Saturn|Venus": 6,
  "Mars|Moon": 6,
  "Saturn|Sun": 5,
  "Moon|Saturn": 5,
  "Mars|Mars": 5,
  "Sun|Sun": 4,
  "Mars|Saturn": 4,
  "Jupiter|Venus": 4,
  "Jupiter|Mars": 4,
  "Mercury|Mercury": 4,
  "Mercury|Moon": 4,
  // Ascendant contacts to the romance planets
  "Ascendant|Sun": 6,
  "Ascendant|Moon": 6,
  "Ascendant|Venus": 6,
  "Ascendant|Mars": 6,
};

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

function weightFor(a: string, b: string): number {
  const k = pairKey(a, b);
  if (k in PAIR_WEIGHT) return PAIR_WEIGHT[k];
  if (OUTER.has(a) || OUTER.has(b)) return 1; // outer-planet contact = minor
  const known = (x: string) => PERSONAL.has(x) || ANGLES.has(x) || x === "Jupiter" || x === "Saturn";
  return known(a) && known(b) ? 2 : 1;
}

// ───────────────────────── types ─────────────────────────
export interface SynAspect {
  aBody: string; // person A's point key
  bBody: string; // person B's point key
  aLon: number;
  bLon: number;
  aspect: string;
  orb: number;
  points: number;
  valence: "harmonious" | "tension" | "blending";
  headline: string; // plain-language claim (leads the row)
  why: string;      // the grounded reasoning (small, beneath)
  proof: string;    // the raw chart evidence (exact positions + aspect + orb)
  sentence: string; // headline + why, kept for back-compat
}

export interface SynOverlay {
  from: "A" | "B";
  body: string;
  house: number;
  bonus: number;
  sentence: string;
}

export interface SynastryResult {
  score: number;
  band: { key: string; label: string; blurb: string };
  subscores: {
    emotional: number;
    attraction: number;
    affection: number;
    communication: number;
    commitment: number;
  };
  rawTotal: number;
  overlayTotal: number;
  aspects: SynAspect[]; // sorted by points desc
  overlays: SynOverlay[];
  names: { a: string; b: string };
  timeKnownBoth: boolean;
  warnings: string[];
}

interface Point {
  key: string;
  lon: number;
}

function pointsOf(chart: ChartFacts): Point[] {
  const pts: Point[] = chart.planets.map((p) => ({ key: p.body, lon: p.lon }));
  if (chart.asc) pts.push({ key: "Ascendant", lon: chart.asc.lon });
  if (chart.mc) pts.push({ key: "Midheaven", lon: chart.mc.lon });
  return pts;
}

// ───────────────────────── phrasing (story + grounded why) ─────────────────────────
// Each contact becomes a plain-language `headline` plus a small `why` that
// traces the claim to what the two planets mean and how the aspect connects
// them. No em-dashes. Outer planets get distinct meaning so the old repeated
// "generational undertone" wall never returns.

const ASPECT_WORD: Record<string, string> = {
  conjunction: "conjunct", sextile: "sextile", square: "square",
  trine: "trine", quincunx: "quincunx", opposition: "opposite",
};

// Plain verb for the headline (no jargon).
const ASPECT_VERB: Record<string, string> = {
  conjunction: "meets", sextile: "clicks with", square: "rubs against",
  trine: "flows with", quincunx: "keeps adjusting to", opposition: "pulls against",
};

// What each point stands for, in plain words (powers the grounded "why").
export const BODY_ROLE: Record<string, string> = {
  Sun: "who you are", Moon: "what you need to feel safe", Mercury: "how you think and talk",
  Venus: "how you love", Mars: "what you chase", Jupiter: "where you grow",
  Saturn: "where you get serious", Uranus: "your need for freedom",
  Neptune: "your dreamy side", Pluto: "your depth",
  Ascendant: "the face you meet the world with", Midheaven: "where you're headed in life",
};

const ASPECT_ACTION: Record<string, string> = {
  conjunction: "they fuse into one charge", sextile: "they open an easy door",
  square: "they rub until something gives", trine: "they flow with no effort",
  quincunx: "they keep adjusting to each other", opposition: "they pull like opposite poles",
};

// Plain-language reference for what each aspect geometry means, for the
// "why this type" card. The angle is real: a conjunction is the same degree,
// a trine is 120°, a square 90°, an opposition 180°, etc.
export const ASPECT_MEANING: Record<string, string> = {
  conjunction: "same degree, the two energies merge",
  sextile: "60° apart, an easy, supportive angle",
  square: "90° apart, friction that pushes growth",
  trine: "120° apart, an effortless, flowing angle",
  quincunx: "150° apart, an offbeat angle that asks for adjustment",
  opposition: "180° apart, opposite poles that attract and pull",
};

// Neutral topic (the DOMAIN at stake), keyed by sorted pair. The verb and the
// why carry the valence, so a theme reads true whether the contact flows or
// rubs (e.g. "pulls against ... warmth and affection").
const PAIR_THEME: Record<string, string> = {
  "Moon|Sun": "identity and needs", "Mars|Venus": "desire and attraction", "Moon|Venus": "warmth and affection",
  "Sun|Venus": "warmth and admiration", "Moon|Moon": "emotional rhythms", "Venus|Venus": "tastes and love styles",
  "Saturn|Venus": "love and commitment", "Mars|Moon": "passion and care", "Saturn|Sun": "structure and self",
  "Mars|Mars": "drive and pace", "Sun|Sun": "two life paths", "Mercury|Mercury": "how you talk",
  "Mercury|Moon": "words and feelings", "Jupiter|Venus": "fun and generosity",
  "Ascendant|Venus": "first impressions and love", "Ascendant|Mars": "presence and desire",
};

// Grounded reasoning for the high-weight pairs (no em-dashes).
const PAIR_WHY: Record<string, string> = {
  "Moon|Sun": "One person's identity meets the other's comfort zone, the deepest fit two charts share.",
  "Mars|Venus": "What one chases meets how the other loves, so the chemistry is raw and physical.",
  "Moon|Venus": "What you need and how you love speak the same language, so warmth flows.",
  "Sun|Venus": "Who one person is meets how the other loves, so fondness arrives naturally.",
  "Moon|Moon": "Both read comfort and safety the same way, so feelings sync without effort.",
  "Venus|Venus": "You each love and value in similar ways, so tastes rarely clash.",
  "Saturn|Venus": "Where one gets serious meets how the other loves, so it commits, and it can feel weighty.",
  "Mars|Moon": "What one chases meets what the other needs, so drive and care charge each other.",
  "Saturn|Sun": "Where one builds meets who the other is, so one steadies the other over time.",
  "Mars|Mars": "You push and fight in similar ways, great in private, mind the clashes.",
  "Sun|Sun": "Two core selves stand side by side, aligned or learning to share the road.",
  "Mercury|Mercury": "You each think and speak alike, so conversation rarely needs translating.",
  "Mercury|Moon": "How one thinks meets what the other feels, so talking and feeling connect.",
  "Jupiter|Venus": "Where one grows meets how the other loves, so the bond feels lucky and kind.",
  "Ascendant|Venus": "The face one meets the world with meets how the other loves, so the draw is immediate.",
  "Ascendant|Mars": "The face one shows the world meets what the other chases, so heat shows up fast.",
};

// Distinct flavor per outer planet (replaces the single repeated fallback).
const OUTER_THEME: Record<string, string> = {
  Uranus: "an electric, free streak", Neptune: "a dreamy, idealizing haze", Pluto: "an all-or-nothing depth",
};
const OUTER_WHY: Record<string, string> = {
  Uranus: "Freedom and surprise charge the bond, and routine is the enemy.",
  Neptune: "Romance and imagination soften the edges, and clarity is the work.",
  Pluto: "Intensity runs deep here, all in or not at all.",
};

// Varied closers so no two lines read alike (kills the repeated valence string).
const CONNECTOR: Record<string, string[]> = {
  harmonious: ["It feels natural.", "Little effort needed.", "This one just works.", "Ease lives here."],
  tension: ["Growth lives here.", "Worth the effort.", "Friction with a point.", "It sharpens you both."],
  blending: ["Hard to untangle.", "Fused at the core.", "One and the same.", "Deeply intertwined."],
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const roleOf = (b: string) => BODY_ROLE[b] ?? b.toLowerCase();

// Exact ecliptic position for the "proof" line, e.g. "11°14′ Aries".
function fmtPos(lon: number): string {
  const idx = ((Math.floor(lon / 30) % 12) + 12) % 12;
  const within = lon - Math.floor(lon / 30) * 30;
  let d = Math.floor(within);
  let m = Math.round((within - d) * 60);
  if (m === 60) { m = 0; d += 1; }
  return `${d}°${m.toString().padStart(2, "0")}′ ${SIGNS[idx]?.en ?? ""}`;
}

function pairTheme(a: string, b: string): string {
  const k = pairKey(a, b);
  if (k in PAIR_THEME) return PAIR_THEME[k];
  const outer = OUTER.has(a) ? a : OUTER.has(b) ? b : null;
  if (outer) {
    const other = outer === a ? b : a;
    return OUTER.has(other) ? "a deep background hum" : `${OUTER_THEME[outer]} around ${roleOf(other)}`;
  }
  return `${roleOf(a)} meets ${roleOf(b)}`;
}

function pairWhy(a: string, b: string, aspect: string, aLon: number, bLon: number, valence: string): string {
  const bank = CONNECTOR[valence] ?? CONNECTOR.blending;
  const conn = bank[(Math.floor(aLon / 30) + Math.floor(bLon / 30)) % bank.length];
  const outer = OUTER.has(a) ? a : OUTER.has(b) ? b : null;
  if (outer) return `${OUTER_WHY[outer]} ${conn}`;
  // The rosy pair gloss only fits flowing contacts. For tension, lead with the
  // friction itself (roles + the aspect's action) so the why never contradicts
  // the "pulls against / rubs against" headline.
  if (valence !== "tension") {
    const k = pairKey(a, b);
    if (k in PAIR_WHY) return `${PAIR_WHY[k]} ${conn}`;
  }
  return `${cap(roleOf(a))} meets ${roleOf(b)}, and ${ASPECT_ACTION[aspect]}. ${conn}`;
}

// ───────────────────────── scoring ─────────────────────────
const sat = (raw: number, k: number) => Math.round(100 * (1 - Math.exp(-raw / k)));

function bandFor(score: number): SynastryResult["band"] {
  if (score >= 82) return { key: "rare", label: "Rare resonance", blurb: "An unusually rich web of connection, the kind that feels almost written in the stars." };
  if (score >= 68) return { key: "strong", label: "Strong connection", blurb: "Real chemistry with solid foundations, plenty to build on together." };
  if (score >= 52) return { key: "potential", label: "Real potential", blurb: "A genuine spark with room to grow, where the differences can become depth." };
  if (score >= 36) return { key: "work", label: "Worth the work", blurb: "Attraction is here, and it asks for patience and understanding to flourish." };
  return { key: "challenging", label: "Challenging chemistry", blurb: "Very different rhythms, intense at times, and it takes real effort to harmonise." };
}

export function computeSynastry(
  chartA: ChartFacts,
  chartB: ChartFacts,
  nameA = "Person A",
  nameB = "Person B",
): SynastryResult {
  const ptsA = pointsOf(chartA);
  const ptsB = pointsOf(chartB);
  const aspects: SynAspect[] = [];

  for (const pa of ptsA) {
    for (const pb of ptsB) {
      const sep = separation(pa.lon, pb.lon);
      const m = matchAspect(sep, pa.key, pb.key);
      if (!m) continue;

      const w = weightFor(pa.key, pb.key);
      let coeff = CONFIG.ASPECT_COEFF[m.def.name];
      if (m.def.name === "conjunction") {
        const heavySaturn =
          (pa.key === "Saturn" && (PERSONAL.has(pb.key) || ANGLES.has(pb.key))) ||
          (pb.key === "Saturn" && (PERSONAL.has(pa.key) || ANGLES.has(pa.key)));
        coeff = heavySaturn ? 0.6 : 1.0;
      }
      const tOrb = 0.3 + 0.7 * (1 - m.orb / m.allowedOrb);
      const points = Math.round(w * coeff * tOrb * 100) / 100;
      if (points <= 0) continue;

      const enA = bodyMeta(pa.key as never)?.en ?? pa.key;
      const enB = bodyMeta(pb.key as never)?.en ?? pb.key;
      const verb = ASPECT_VERB[m.def.name] ?? "meets";
      const headline = `${nameA}'s ${enA} ${verb} ${nameB}'s ${enB}, ${pairTheme(pa.key, pb.key)}.`;
      const why = pairWhy(pa.key, pb.key, m.def.name, pa.lon, pb.lon, m.def.valence);
      const orbStr = `${Math.round(m.orb * 10) / 10}°`;
      const proof = `${nameA}'s ${enA} ${fmtPos(pa.lon)} · ${nameB}'s ${enB} ${fmtPos(pb.lon)} · ${ASPECT_WORD[m.def.name]} ${orbStr} orb`;
      const sentence = `${headline} ${why}`;

      aspects.push({
        aBody: pa.key,
        bBody: pb.key,
        aLon: pa.lon,
        bLon: pb.lon,
        aspect: m.def.name,
        orb: Math.round(m.orb * 100) / 100,
        points,
        valence: m.def.valence,
        headline,
        why,
        proof,
        sentence,
      });
    }
  }

  aspects.sort((x, y) => y.points - x.points);

  // House overlays (both directions), only when both birth times are known.
  const overlays: SynOverlay[] = [];
  const addOverlays = (from: "A" | "B", fromChart: ChartFacts, intoChart: ChartFacts, intoName: string, fromName: string) => {
    if (!intoChart.asc) return;
    for (const body of ROMANCE) {
      const planet = fromChart.planets.find((p) => p.body === body);
      if (!planet) continue;
      const house = wholeSignHouse(planet.lon, intoChart.asc.lon);
      const bonus = CONFIG.OVERLAY_BONUS[house] ?? 0;
      if (bonus > 0) {
        overlays.push({
          from,
          body,
          house,
          bonus,
          sentence: `${fromName}'s ${body} lands in ${intoName}'s ${ordinal(house)} house, ${houseTheme(house)}.`,
        });
      }
    }
  };
  addOverlays("A", chartA, chartB, nameB, nameA);
  addOverlays("B", chartB, chartA, nameA, nameB);
  overlays.sort((a, b) => b.bonus - a.bonus);

  const aspectTotal = aspects.reduce((s, a) => s + a.points, 0);
  const overlayTotal = Math.min(CONFIG.OVERLAY_CAP, overlays.reduce((s, o) => s + o.bonus, 0));
  const rawTotal = aspectTotal + overlayTotal;

  // Sub-scores (facets — an aspect may feed more than one bucket).
  const bucket = { emotional: 0, attraction: 0, affection: 0, communication: 0, commitment: 0 };
  for (const a of aspects) {
    const involves = (k: string) => a.aBody === k || a.bBody === k;
    const isPair = (x: string, y: string) => pairKey(a.aBody, a.bBody) === pairKey(x, y);
    if (involves("Moon")) bucket.emotional += a.points;
    if (involves("Mars") || involves("Ascendant")) bucket.attraction += a.points;
    if (isPair("Venus", "Venus") || isPair("Venus", "Sun")) bucket.affection += a.points;
    if (involves("Mercury")) bucket.communication += a.points;
    if (involves("Saturn")) bucket.commitment += a.points;
  }
  for (const o of overlays) {
    if (o.house === 7) bucket.commitment += o.bonus;
    else if (o.house === 5 || o.house === 8 || o.house === 1) bucket.attraction += o.bonus;
    else if (o.house === 4) bucket.emotional += o.bonus;
  }

  const score = sat(rawTotal, CONFIG.K_OVERALL);
  const timeKnownBoth = !!chartA.asc && !!chartB.asc;
  const warnings: string[] = [];
  if (!timeKnownBoth) warnings.push("One or both birth times are unknown, so the Ascendant and house overlays are excluded. The score reflects planet-to-planet aspects only.");

  return {
    score,
    band: bandFor(score),
    subscores: {
      emotional: sat(bucket.emotional, CONFIG.K_SUB),
      attraction: sat(bucket.attraction, CONFIG.K_SUB),
      affection: sat(bucket.affection, CONFIG.K_SUB),
      communication: sat(bucket.communication, CONFIG.K_SUB),
      commitment: sat(bucket.commitment, CONFIG.K_SUB),
    },
    rawTotal: Math.round(rawTotal * 100) / 100,
    overlayTotal: Math.round(overlayTotal * 100) / 100,
    aspects,
    overlays,
    names: { a: nameA, b: nameB },
    timeKnownBoth,
    warnings,
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
function houseTheme(house: number): string {
  const map: Record<number, string> = {
    1: "sparking immediate attraction and recognition",
    4: "touching home, roots and a sense of belonging",
    5: "lighting up romance, play and dating energy",
    7: "activating the zone of partnership and commitment",
    8: "deepening intimacy and emotional merging",
  };
  return map[house] ?? "coloring that area of life";
}
