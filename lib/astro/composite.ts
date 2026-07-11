// Composite chart — the relationship's OWN chart.
//
// Not "his chart vs her chart" (that's synastry) but the single chart of the
// bond itself: each composite planet is the midpoint of the two people's
// positions. It answers "who are we as a couple" — the relationship's core
// (Sun), its heart (Moon) and how it loves (Venus) — plus the chart's own
// internal aspects. Fully deterministic.

import { natalAspects } from "./aspects";
import { SIGNS, signIndexFromLon, degInSign, norm360 } from "./zodiac";
import { contactFacts } from "./enrich";
import type { ChartFacts, PlacedBody } from "./types";

/** Shortest-arc midpoint of two ecliptic longitudes. */
function midpointLon(a: number, b: number): number {
  const arc = ((b - a + 540) % 360) - 180; // signed shortest a→b
  return norm360(a + arc / 2);
}

export interface CompositePlacement { sign: string; element: string; degInSign: number }
export interface CompositeChart {
  available: boolean;
  note?: string;
  core: CompositePlacement | null;   // composite Sun — the relationship's purpose
  heart: CompositePlacement | null;  // composite Moon — its emotional tone
  love: CompositePlacement | null;   // composite Venus — how it loves
  strongest: { headline: string; proof: string; sections: { kicker: string; body: string }[] } | null;
  summary: string;
}

const place = (lon: number): CompositePlacement => {
  const si = signIndexFromLon(lon);
  return { sign: SIGNS[si].en, element: SIGNS[si].element, degInSign: Math.round(degInSign(lon)) };
};

export function computeComposite(a: ChartFacts, b: ChartFacts): CompositeChart {
  // Composite planets: midpoint per body present in both charts.
  const byBodyB = new Map(b.planets.map((p) => [p.body, p]));
  const compPlanets: PlacedBody[] = [];
  for (const pa of a.planets) {
    const pb = byBodyB.get(pa.body);
    if (!pb) continue;
    const lon = midpointLon(pa.lon, pb.lon);
    compPlanets.push({
      id: `c.${pa.body.toLowerCase()}`,
      body: pa.body,
      lon,
      sign: SIGNS[signIndexFromLon(lon)].key,
      signIndex: signIndexFromLon(lon),
      degInSign: degInSign(lon),
      house: null,
      retrograde: false,
    });
  }
  if (compPlanets.length === 0) {
    return { available: false, note: "Not enough shared data to build a composite chart.", core: null, heart: null, love: null, strongest: null, summary: "" };
  }

  const lonOf = (body: string) => compPlanets.find((p) => p.body === body)?.lon ?? null;
  const sunLon = lonOf("Sun"), moonLon = lonOf("Moon"), venusLon = lonOf("Venus");

  // Internal aspects of the composite chart; enrich the tightest for the headline.
  const aspects = natalAspects(compPlanets).sort((x, y) => x.orb - y.orb);
  let strongest: CompositeChart["strongest"] = null;
  const top = aspects[0];
  if (top) {
    const pa = compPlanets.find((p) => p.id === top.a)!;
    const pb = compPlanets.find((p) => p.id === top.b)!;
    const f = contactFacts({
      id: "c", aBody: pa.body, bBody: pb.body, aLon: pa.lon, bLon: pb.lon,
      aspect: top.aspect, orb: top.orb, points: 0, valence: top.valence,
      headline: "", why: "", proof: "", sentence: "",
    });
    const sections = [
      { kicker: "The core aspect", body: `The tightest bond in your composite is ${pa.body} ${top.aspect} ${pb.body} (${top.orb.toFixed(1)}° orb)${f.sharedElement ? `, an ${f.sharedElement} contact` : ""}. It sets the underlying tone of the whole relationship.` },
    ];
    if (f.mutualReception) {
      sections.push({ kicker: "✦ Mutual reception in the bond", body: `${pa.body} and ${pb.body} sit in each other's signs here — the relationship hosts both energies at once, mutually strengthening.` });
    }
    strongest = { headline: `Your relationship's core aspect: ${pa.body} ${top.aspect} ${pb.body}`, proof: `${pa.body} ${fmt(pa.lon)} · ${pb.body} ${fmt(pb.lon)} · ${top.aspect} ${top.orb.toFixed(1)}°`, sections };
  }

  const core = sunLon != null ? place(sunLon) : null;
  const heart = moonLon != null ? place(moonLon) : null;
  const love = venusLon != null ? place(venusLon) : null;
  const summary = [
    core && `As a couple your purpose runs through ${core.sign} (${ELEMENT_TONE[core.element]}).`,
    heart && `Your shared heart is ${heart.sign}, so together you feel ${ELEMENT_TONE[heart.element]}.`,
    love && `And you love in a ${love.sign} way.`,
  ].filter(Boolean).join(" ");

  return { available: true, core, heart, love, strongest, summary };
}

const ELEMENT_TONE: Record<string, string> = {
  fire: "warm, bold and forward-moving", earth: "steady, practical and built to last",
  air: "curious, talkative and light", water: "deep, feeling and intuitive",
};

function fmt(lon: number): string {
  const si = signIndexFromLon(lon);
  const within = degInSign(lon);
  const d = Math.floor(within);
  const m = Math.round((within - d) * 60);
  return `${m === 60 ? d + 1 : d}°${String(m === 60 ? 0 : m).padStart(2, "0")}′ ${SIGNS[si].en}`;
}
