// Synastry: the explainable, weighted compatibility score (SPEC.md §6.5).
//
// Deterministic. Every point traces to a named inter-chart aspect, so the final
// 0–100 number is literally the sum of human-readable sentences. All weights,
// coefficients and constants live in CONFIG so the rubric is auditable/tunable.

import { matchAspect, separation } from "./aspects";
import { wholeSignHouse } from "./angles";
import { bodyMeta } from "./zodiac";
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
  sentence: string;
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

// ───────────────────────── phrasing (explainability) ─────────────────────────
const ASPECT_WORD: Record<string, string> = {
  conjunction: "conjunct",
  sextile: "sextile",
  square: "square",
  trine: "trine",
  quincunx: "quincunx",
  opposition: "opposite",
};

function meaningPhrase(a: string, b: string): string {
  const k = pairKey(a, b);
  const map: Record<string, string> = {
    "Moon|Sun": "the core fit between identity and emotional needs",
    "Mars|Venus": "romantic and physical chemistry",
    "Moon|Venus": "tenderness, warmth and affection",
    "Sun|Venus": "natural fondness and admiration",
    "Venus|Venus": "shared tastes and ways of loving",
    "Moon|Moon": "deep emotional resonance",
    "Mars|Moon": "passion, protectiveness and emotional spark",
    "Mars|Sun": "vitality, attraction and a playful edge",
    "Jupiter|Venus": "generosity, fun and feel-good warmth",
    "Mars|Mars": "drive, energy and pace",
    "Mercury|Mercury": "how you think and talk together",
    "Mercury|Moon": "feeling understood in conversation",
  };
  if (k in map) return map[k];
  if (a === "Saturn" || b === "Saturn") return "commitment, structure and staying power";
  if (a === "Ascendant" || b === "Ascendant") return "instant attraction and being truly seen";
  if (a === "Mercury" || b === "Mercury") return "communication and mental rapport";
  if (OUTER.has(a) || OUTER.has(b)) return "a subtle, generational undertone";
  return "a meaningful connection";
}

function valencePhrase(v: string): string {
  if (v === "harmonious") return "flows with ease";
  if (v === "tension") return "with a charged tension that fuels growth";
  return "deeply intertwined";
}

// ───────────────────────── scoring ─────────────────────────
const sat = (raw: number, k: number) => Math.round(100 * (1 - Math.exp(-raw / k)));

function bandFor(score: number): SynastryResult["band"] {
  if (score >= 82) return { key: "rare", label: "Rare resonance", blurb: "An unusually rich web of connection — the kind that feels almost written in the stars." };
  if (score >= 68) return { key: "strong", label: "Strong connection", blurb: "Real chemistry with solid foundations — plenty to build on together." };
  if (score >= 52) return { key: "potential", label: "Real potential", blurb: "A genuine spark with room to grow; the differences can become depth." };
  if (score >= 36) return { key: "work", label: "Worth the work", blurb: "Attraction is here, but it asks for patience and understanding to flourish." };
  return { key: "challenging", label: "Challenging chemistry", blurb: "Very different rhythms — intense at times, and it takes real effort to harmonise." };
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
      const sentence = `${nameA}'s ${enA} ${ASPECT_WORD[m.def.name]} ${nameB}'s ${enB} — ${meaningPhrase(pa.key, pb.key)}, ${valencePhrase(m.def.valence)}.`;

      aspects.push({
        aBody: pa.key,
        bBody: pb.key,
        aLon: pa.lon,
        bLon: pb.lon,
        aspect: m.def.name,
        orb: Math.round(m.orb * 100) / 100,
        points,
        valence: m.def.valence,
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
          sentence: `${fromName}'s ${body} lands in ${intoName}'s ${ordinal(house)} house — ${houseTheme(house)}.`,
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
  if (!timeKnownBoth) warnings.push("One or both birth times are unknown, so the Ascendant and house overlays are excluded — the score reflects planet-to-planet aspects only.");

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
