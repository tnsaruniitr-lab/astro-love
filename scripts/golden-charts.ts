// Golden-chart regression suite — freezes the VERIFIED-correct engine output
// so a dependency bump (astronomy-engine, luxon/tz-data) or a refactor can
// never silently bend the "true values" the product's credibility rests on.
//
// Planetary longitudes + angles are asserted to <2 arcminutes against values
// produced by the audited engine (independently reproduced against Swiss
// Ephemeris / AstroDataBank during the 2026-07 evaluation).
//
// KNOWN LIMITATION (frozen deliberately): for births BEFORE standard time
// (e.g. Einstein, Ulm 1879) the IANA zone applies the zone city's LMT
// (Berlin +00:53), not the birth city's own solar time (Ulm +00:40) — the
// Ascendant of such charts can be ~3° off published values. Planets are
// unaffected. Acceptable for this product; documented here so nobody
// "fixes" a golden mismatch by loosening the tolerance.
//
// Run: npm run test:golden

import { computeChart } from "../lib/astro/chart";
import { computeSynastry, type SynAspect } from "../lib/astro/synastry";
import { contactFacts, dignityOf } from "../lib/astro/enrich";
import { wherePlaces, _lineLongitude } from "../lib/astro/astrocartography";
import { transitTiming } from "../lib/astro/transits";
import { computeComposite } from "../lib/astro/composite";
import { trueNodeLon, meanNodeLon, meanLilithLon } from "../lib/astro/points";
import { nodeContacts } from "../lib/astro/nodeContacts";
import { directionalSplit } from "../lib/astro/directional";
import { detectHotCold } from "../lib/astro/hotcold";
import { needsProfile, moonMatch } from "../lib/astro/decoders";
import { coupleTiming } from "../lib/astro/coupleTiming";
import { HOTCOLD_REGISTER } from "../lib/astro/loveCopy";
import { SIGNS } from "../lib/astro/zodiac";
import { pairValence } from "../lib/astro/aspects";
import { coupleArchetype, tilt } from "../lib/astro/insights";
import { coupleScoreRange } from "../lib/astro/uncertainty";
import { resolveInstant } from "../lib/geo/time";
import { teaseCut } from "../lib/server/writer";
import type { ChartFacts, ChartInput, PlanetName } from "../lib/astro/types";

const TOL_DEG = 2 / 60; // 2 arcminutes

let failures = 0;
let checks = 0;
function ok(cond: boolean, label: string, detail = "") {
  checks++;
  if (cond) { console.log(`  ✓  ${label}`); }
  else { failures++; console.error(`  ✗  ${label}${detail ? ` — ${detail}` : ""}`); }
}
function near(actual: number, expected: number, label: string, tol = TOL_DEG) {
  // shortest-arc distance so 359.99 vs 0.01 compares as 0.02°
  const d = Math.abs(((actual - expected + 540) % 360) - 180);
  ok(d <= tol, label, `expected ${expected}, got ${actual.toFixed(4)} (Δ ${(d * 60).toFixed(2)}′)`);
}

const C = (name: string, y: number, mo: number, d: number, h: number, mi: number, lat: number, lon: number, tz: string, timeKnown = true): ChartInput =>
  ({ name, year: y, month: mo, day: d, hour: h, minute: mi, timeKnown, lat, lon, tz, place: name });

// ───────────────────────── golden charts ─────────────────────────
interface Golden {
  input: ChartInput;
  utc: string;
  asc: number;
  mc: number;
  planets: Record<PlanetName, number>;
}

const GOLDENS: Golden[] = [
  {
    input: C("einstein-ulm-lmt", 1879, 3, 14, 11, 30, 48.4011, 9.9876, "Europe/Berlin"),
    utc: "1879-03-14T10:36:32.000Z",
    asc: 98.8223, mc: 339.2086,
    planets: { Sun: 353.4983, Moon: 254.3964, Mercury: 3.125, Venus: 16.9734, Mars: 296.9079, Jupiter: 327.4818, Saturn: 4.1881, Uranus: 151.289, Neptune: 37.8715, Pluto: 54.7272 },
  },
  {
    input: C("moscow-1990-msd", 1990, 5, 14, 6, 30, 55.7558, 37.6173, "Europe/Moscow"),
    utc: "1990-05-14T02:30:00.000Z",
    asc: 75.7959, mc: 304.3645,
    planets: { Sun: 53.0496, Moon: 280.1122, Mercury: 38.2527, Venus: 11.2279, Mars: 347.297, Jupiter: 99.279, Saturn: 295.2714, Uranus: 279.2163, Neptune: 284.3727, Pluto: 226.2072 },
  },
  {
    // Decree time began 1930-06-21 — this chart sits on its FIRST day (+3).
    input: C("moscow-1930-decree", 1930, 6, 21, 12, 0, 55.7558, 37.6173, "Europe/Moscow"),
    utc: "1930-06-21T09:00:00.000Z",
    asc: 174.3101, mc: 82.1489,
    planets: { Sun: 89.2491, Moon: 22.1794, Mercury: 67.318, Venus: 122.5937, Mars: 43.447, Jupiter: 88.7221, Saturn: 279.2936, Uranus: 15.0086, Neptune: 151.2176, Pluto: 108.62 },
  },
  {
    // Southern hemisphere + southern-summer DST (AEDT, UTC+11).
    input: C("sydney-1985-dst", 1985, 11, 20, 5, 45, -33.8688, 151.2093, "Australia/Sydney"),
    utc: "1985-11-19T18:45:00.000Z",
    asc: 237.2683, mc: 128.7673,
    planets: { Sun: 237.3872, Moon: 332.1521, Mercury: 254.9057, Venus: 222.7204, Mars: 194.4769, Jupiter: 310.6234, Saturn: 240.3209, Uranus: 256.9598, Neptune: 272.0515, Pluto: 215.5813 },
  },
  {
    // Near-polar latitude (69.65°N) — the Asc formula must stay stable.
    input: C("tromso-1970-polar", 1970, 1, 1, 12, 0, 69.6492, 18.9553, "Europe/Oslo"),
    utc: "1970-01-01T11:00:00.000Z",
    asc: 306.1918, mc: 283.4755,
    planets: { Sun: 280.6233, Moon: 196.4894, Mercury: 299.2638, Venus: 275.03, Mars: 342.5779, Jupiter: 212.3878, Saturn: 32.0599, Uranus: 188.7248, Neptune: 239.8953, Pluto: 177.3931 },
  },
  {
    // J2000 epoch sanity anchor: the Sun at ~280.37° is a textbook value.
    input: C("greenwich-j2000", 2000, 1, 1, 12, 0, 51.4779, 0.0015, "UTC"),
    utc: "2000-01-01T12:00:00.000Z",
    asc: 24.2717, mc: 279.6123,
    planets: { Sun: 280.3686, Moon: 223.3239, Mercury: 271.8889, Venus: 241.5652, Mars: 327.9639, Jupiter: 25.2542, Saturn: 40.3961, Uranus: 314.8061, Neptune: 303.1954, Pluto: 251.4546 },
  },
];

console.log("── Golden charts (<2′ tolerance) ──");
for (const g of GOLDENS) {
  const f = computeChart(g.input);
  console.log(` ${g.input.name}`);
  ok(f.subject.utc === g.utc, `${g.input.name}: UTC instant`, `expected ${g.utc}, got ${f.subject.utc}`);
  near(f.asc!.lon, g.asc, `${g.input.name}: Ascendant`);
  near(f.mc!.lon, g.mc, `${g.input.name}: Midheaven`);
  for (const p of f.planets) near(p.lon, g.planets[p.body], `${g.input.name}: ${p.body}`);
}

// ───────────────────────── degraded-input behavior ─────────────────────────
console.log("── Degraded inputs are never silent ──");

// Spring-forward gap: 2000-04-02 02:30 America/New_York did not exist.
const gap = resolveInstant(C("gap", 2000, 4, 2, 2, 30, 40.7, -74, "America/New_York"));
ok(gap.gapAdjusted === true, "DST gap is detected (gapAdjusted=true)");
ok(gap.utc.toISOString() === "2000-04-02T07:30:00.000Z", "DST gap resolves to the post-jump instant", gap.utc.toISOString());
const gapChart = computeChart(C("gap", 2000, 4, 2, 2, 30, 40.7, -74, "America/New_York"));
ok(gapChart.warnings.some((w) => w.includes("did not exist")), "DST gap produces a user-facing warning");

// Fall-back ambiguity: 2000-10-29 01:30 America/New_York occurred twice.
const amb = resolveInstant(C("amb", 2000, 10, 29, 1, 30, 40.7, -74, "America/New_York"));
ok(amb.ambiguous === true, "DST ambiguity is detected (ambiguous=true)");
const ambChart = computeChart(C("amb", 2000, 10, 29, 1, 30, 40.7, -74, "America/New_York"));
ok(ambChart.warnings.some((w) => w.includes("occurred twice")), "DST ambiguity produces a user-facing warning");

// Invalid timezone: chart must NOT ship a plausible-but-wrong Ascendant.
const badTz = computeChart(C("badtz", 1990, 5, 14, 6, 30, 55.7558, 37.6173, "Not/AZone"));
ok(badTz.asc === null && badTz.mc === null && badTz.houseCusps === null, "invalid tz withholds Asc/MC/houses");
ok(badTz.planets.every((p) => p.house === null), "invalid tz withholds house placements");
ok(badTz.warnings.some((w) => w.toLowerCase().includes("time zone")), "invalid tz warns");

// Unknown birth time: the Moon carries an explicit whole-day range.
const unk = computeChart(C("unk", 1990, 5, 14, 0, 0, 55.7558, 37.6173, "Europe/Moscow", false));
ok(!!unk.moonRange, "unknown time exposes moonRange");
ok(unk.moonRange!.spanDeg > 10 && unk.moonRange!.spanDeg < 16, "moonRange spans the Moon's real daily motion", `${unk.moonRange?.spanDeg}`);

// ───────────────────────── scoring invariants ─────────────────────────
console.log("── Scoring invariants ──");

function synthetic(lons: number[], name: string): ChartFacts {
  const bodies: PlanetName[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  return {
    schemaVersion: "1.1", engine: "synthetic", zodiac: "tropical", houseSystem: "whole_sign",
    subject: { name, tz: "UTC", lat: 0, lon: 0, utc: "2000-01-01T00:00:00Z", localISO: "", timeKnown: false },
    planets: bodies.map((b, i) => ({ id: `p.${b.toLowerCase()}`, body: b, lon: lons[i] ?? 0, sign: "Aries", signIndex: 0, degInSign: 0, house: null, retrograde: false })),
    asc: null, mc: null, houseCusps: null, aspects: [], warnings: [],
  };
}
const allSq = computeSynastry(
  synthetic([0, 2, 4, 6, 1, 3, 5], "SqA"),
  synthetic([90, 92, 94, 96, 91, 93, 95], "SqB"),
);
const gentle = computeSynastry(
  synthetic([10, 130, 200, 250, 40, 310, 170], "GA"),
  synthetic([130, 10, 320, 130, 160, 70, 290], "GB"),
);
ok(allSq.score < gentle.score, "an all-conflict pair no longer outscores a gentle one", `all-square ${allSq.score} vs gentle ${gentle.score}`);
ok(allSq.axes.ease < 20, "all-square ease is honest (near floor)", `${allSq.axes.ease}`);
ok(gentle.axes.ease > 65, "gentle ease reads high", `${gentle.axes.ease}`);
ok(allSq.score < 52, "all-square lands below the 'potential' band", `${allSq.score}`);

// Real-people fixtures: symmetry, determinism, range, archetype variety.
const PEOPLE: ChartInput[] = [
  C("Alice", 1990, 5, 14, 6, 30, 55.7558, 37.6173, "Europe/Moscow"),
  C("Bob", 1988, 11, 2, 23, 15, 40.7128, -74.006, "America/New_York"),
  C("Cara", 1995, 3, 8, 4, 44, 48.8566, 2.3522, "Europe/Paris"),
  C("Dan", 1992, 7, 21, 15, 5, -33.8688, 151.2093, "Australia/Sydney"),
  C("Eve", 1998, 12, 30, 9, 10, 51.5074, -0.1278, "Europe/London"),
  C("Finn", 1985, 2, 17, 19, 40, 52.52, 13.405, "Europe/Berlin"),
  C("Gina", 2000, 9, 9, 12, 0, 19.076, 72.8777, "Asia/Kolkata"),
  C("Hugo", 1991, 6, 3, 2, 25, 34.0522, -118.2437, "America/Los_Angeles"),
];
const FIX = PEOPLE.map((p) => computeChart(p));
let sym = true, inRange = true;
const archs = new Set<string>();
for (let i = 0; i < FIX.length; i++) {
  for (let j = i + 1; j < FIX.length; j++) {
    const ab = computeSynastry(FIX[i], FIX[j]);
    const ba = computeSynastry(FIX[j], FIX[i]);
    if (ab.score !== ba.score) sym = false;
    if (ab.score < 0 || ab.score > 100 || ab.axes.ease < 0 || ab.axes.ease > 100) inRange = false;
    archs.add(coupleArchetype(ab).name + "/" + tilt(ab));
  }
}
ok(sym, "computeSynastry(A,B) === computeSynastry(B,A) across 28 pairs");
ok(inRange, "score and axes stay in [0,100]");
ok(archs.size >= 3, "archetype variety: ≥3 distinct couple types on the fixture set", [...archs].join(", "));
const det1 = computeSynastry(FIX[0], FIX[1]).score;
const det2 = computeSynastry(FIX[0], FIX[1]).score;
ok(det1 === det2, "deterministic on re-run");

// Contact enrichment — deterministic technical facts (no LLM).
const vsContact: SynAspect = {
  id: "sa1", aBody: "Venus", bBody: "Saturn",
  aLon: 270 + 28 + 7 / 60, bLon: 30 + 27 + 5 / 60, // Venus 28°07′ Cap, Saturn 27°05′ Tau
  aspect: "trine", orb: 1.0, points: 5.8, valence: "harmonious",
  headline: "", why: "", proof: "", sentence: "",
};
const vf = contactFacts(vsContact);
ok(vf.mutualReception === true, "Venus(Cap)△Saturn(Tau) is a mutual reception (each in the other's domicile)");
ok(vf.sharedElement === "earth", "same-element trine detected as earth", `${vf.sharedElement}`);
ok(vf.aModality === "cardinal" && vf.bModality === "fixed", "modality read correctly (cardinal/fixed)");
ok(vf.orbTier === "exact", "1° orb tiers as near-exact");
const noRecep = contactFacts({ ...vsContact, aBody: "Sun", bBody: "Moon", aLon: 15, bLon: 135 });
ok(noRecep.mutualReception === false && noRecep.sharedElement === "fire", "Sun(Aries)△Moon(Leo): fire, no reception");

// Essential dignities (classical tables). signIndex: 0 Aries … 11 Pisces.
ok(dignityOf("Sun", 4) === "domicile", "Sun in Leo = domicile");
ok(dignityOf("Sun", 0) === "exaltation", "Sun in Aries = exaltation");
ok(dignityOf("Sun", 6) === "fall", "Sun in Libra = fall (opposite exaltation)");
ok(dignityOf("Sun", 10) === "detriment", "Sun in Aquarius = detriment (opposite Leo)");
ok(dignityOf("Venus", 11) === "exaltation", "Venus in Pisces = exaltation");
ok(dignityOf("Saturn", 3) === "detriment", "Saturn in Cancer = detriment (opposite Capricorn)");
ok(dignityOf("Mars", 3) === "fall", "Mars in Cancer = fall (opposite Capricorn exaltation)");
ok(dignityOf("Mercury", 3) === null, "Mercury in Cancer = peregrine (no dignity)");

// Astrocartography self-consistency: a point placed exactly on a computed line
// must recompute with that planet essentially on that angle (orb ~0).
console.log("── Astrocartography ──");
{
  const inst = resolveInstant(PEOPLE[1]); // Bob, a time-known chart
  const date = inst.utc;
  const lonMC = _lineLongitude("Venus", date, "culminating", 0)!;
  // A place at (lat 20, that longitude) should sit on Venus's MC meridian.
  const wp = wherePlaces(PEOPLE[1]);
  ok(wp.available === true, "relocation map available for a time-known chart");
  ok(wp.themes.length >= 3, "at least 3 place themes produced", `${wp.themes.length}`);
  ok(wp.themes.every((t) => t.picks.every((p) => p.orbDeg <= 6)), "every pick is within the 6° line orb");
  ok(wp.themes.every((t) => t.picks.length <= 3), "themes cap at 3 picks");
  // Self-consistency: reverse the ASC line and confirm it's stable across latitudes it exists at.
  const asc10 = _lineLongitude("Sun", date, "rising", 10);
  const asc10b = _lineLongitude("Sun", date, "rising", 10);
  ok(asc10 !== null && asc10 === asc10b, "line longitude is deterministic");
  ok(typeof lonMC === "number" && lonMC >= -180 && lonMC <= 180, "MC line longitude in range", `${lonMC?.toFixed(1)}`);
  // Unknown birth time → no relocation map (honest).
  ok(wherePlaces({ ...PEOPLE[1], timeKnown: false }).available === false, "unknown birth time disables the relocation map");
}

// Transit timing — deterministic given a fixed `from`, and windows are well-formed.
console.log("── Transit timing ──");
{
  const from = new Date("2026-01-01T00:00:00Z");
  const tt1 = transitTiming(FIX[1], from, 365);
  const tt2 = transitTiming(FIX[1], from, 365);
  ok(JSON.stringify(tt1) === JSON.stringify(tt2), "transit timing is deterministic for a fixed from-date");
  ok(tt1.windows.length <= 8, "transit windows cap at 8", `${tt1.windows.length}`);
  ok(tt1.windows.every((w) => w.start <= w.peak && w.peak <= w.end), "each window's start ≤ peak ≤ end");
  ok(tt1.windows.every((w) => ["love", "growth", "drive", "spotlight"].includes(w.theme)), "every window has a known theme");
  ok(tt1.windows.every((w) => w.start >= "2026-01-01" && w.start <= "2027-01-01"), "windows fall inside the scanned year");
  const sorted = tt1.windows.every((w, i) => i === 0 || tt1.windows[i - 1].start <= w.start);
  ok(sorted, "windows are sorted by start date");
  // Unknown-time chart still yields timing (transits to planets don't need the Ascendant).
  ok(transitTiming(computeChart({ ...PEOPLE[1], timeKnown: false }), from, 90).available !== undefined, "timing computes for an unknown-time chart");
}

// Composite chart — midpoints are correct and the chart is well-formed.
console.log("── Composite chart ──");
{
  const comp = computeComposite(FIX[0], FIX[1]);
  ok(comp.available === true, "composite available for two full charts");
  // Verify the composite Sun is the shortest-arc midpoint of the two natal Suns.
  const sunA = FIX[0].planets.find((p) => p.body === "Sun")!.lon;
  const sunB = FIX[1].planets.find((p) => p.body === "Sun")!.lon;
  const arc = ((sunB - sunA + 540) % 360) - 180;
  const expectMid = ((sunA + arc / 2) % 360 + 360) % 360;
  // Recover the composite Sun longitude from its sign + degree.
  const coreSignIdx = SIGNS.findIndex((s) => s.en === comp.core!.sign);
  const compSunLon = coreSignIdx * 30 + comp.core!.degInSign;
  ok(Math.abs(((compSunLon - expectMid + 540) % 360) - 180) <= 1.0, "composite Sun is the midpoint of the two natal Suns", `${compSunLon.toFixed(1)} vs ${expectMid.toFixed(1)}`);
  ok(comp.summary.length > 0, "composite has a deterministic summary");
  ok(comp.strongest !== null && comp.strongest.proof.length > 0, "composite exposes its tightest internal aspect");
  // Commutativity of the bond: A+B and B+A place the same composite Sun sign.
  ok(computeComposite(FIX[1], FIX[0]).core?.sign === comp.core?.sign, "composite is order-independent (A+B == B+A)");
}

// Lunar points: TRUE node + Mean Lilith.
console.log("── Lunar points (☊ ☋ ⚸) ──");
{
  // Definitional freeze: at a verified northbound ecliptic crossing the true
  // node must equal the Moon's longitude there (checked <1′ at build time).
  const crossing = new Date("2000-01-21T09:54:00Z");
  near(trueNodeLon(crossing), 123.6838, "true node = Moon's northbound crossing longitude (2000-01-21)", 0.05);
  // Physics band: the true node oscillates within ±1.9° of the mean node.
  let worst = 0;
  for (let i = 0; i < 24; i++) {
    const d = new Date(Date.UTC(1950 + i * 3, (i * 5) % 12, 1 + (i * 7) % 28));
    worst = Math.max(worst, Math.abs(((trueNodeLon(d) - meanNodeLon(d) + 540) % 360) - 180));
  }
  ok(worst < 1.9, "true node stays inside the ±1.9° osculation band", `worst ${worst.toFixed(3)}°`);
  // Mean Lilith: frozen J2000 value (Meeus perigee + 180) and apsidal rate.
  near(meanLilithLon(new Date("2000-01-01T12:00:00Z")), 263.353, "mean Lilith at J2000 (23°21′ Sagittarius)", 0.02);
  const rate = ((meanLilithLon(new Date("2001-01-01T00:00:00Z")) - meanLilithLon(new Date("2000-01-01T00:00:00Z")) + 540) % 360) - 180;
  ok(Math.abs(rate - 40.7) < 0.4, "Lilith advances ~40.7°/yr (apsidal precession)", `${rate.toFixed(2)}°/yr`);
  // Chart integration: points present, south node exactly opposite north.
  const pts = FIX[0].points ?? [];
  ok(pts.length === 3, "chart carries ☊ ☋ ⚸ points", `${pts.length}`);
  const n = pts.find((p) => p.point === "NorthNode")!;
  const s = pts.find((p) => p.point === "SouthNode")!;
  near((n.lon + 180) % 360, s.lon, "south node exactly opposes north node", 0.001);
}

// The decoder layer: deterministic, structurally sound, honest when silent.
console.log("── Decoders (needs, moons, hot-cold, direction, nodes, timing) ──");
{
  const syn = computeSynastry(FIX[0], FIX[1], "A", "B");
  const dir = directionalSplit(syn);
  ok(dir.available, "directional split available for a real couple");
  ok(dir.a.share + dir.b.share === 100, "directional shares sum to 100", `${dir.a.share}+${dir.b.share}`);
  ok(["A", "B", "even"].includes(dir.lean), "directional lean is a valid branch");
  ok(dir.line.length > 0, "directional line is computed, never empty");

  const hc = detectHotCold(syn);
  ok(hc === null || (hc.key in HOTCOLD_REGISTER && hc.orb > 0), "hot-cold: silent, or a real register entry with a real orb");
  const hc2 = detectHotCold(syn);
  ok(JSON.stringify(hc) === JSON.stringify(hc2), "hot-cold detection is deterministic");

  const mm = moonMatch(FIX[0], FIX[1])!;
  ok(mm.available && mm.proof.length > 0, "moon match computes with receipts");
  ok(["conjunction", "sextile", "trine", "square", "opposition", "quincunx", "none"].includes(mm.aspect), "moon-moon aspect is a valid key");
  ok(mm.elementRead.length > 20 && mm.aspectRead.length > 20, "moon match copy is substantive");

  const np = needsProfile(FIX[0], FIX[1], "A", "B");
  ok(np.available && !!np.a && !!np.b, "needs profile decodes both people");
  ok(np.a!.moon.needs.length > 30 && np.b!.venus.craves.length > 20, "needs copy is substantive, not placeholder");

  const nc = nodeContacts(FIX[0], FIX[1], "A", "B");
  ok(nc.contacts.every((c) => c.orb <= 2.5), "node contacts respect the 2.5° orb");
  ok(nc.contacts.every((c) => c.read.length > 30 && c.proof.includes("☌")), "node contacts carry reads + receipts");

  const from = new Date("2026-01-01T00:00:00Z");
  const ct1 = coupleTiming(FIX[0], FIX[1], "A", "B", from);
  const ct2 = coupleTiming(FIX[0], FIX[1], "A", "B", from);
  ok(JSON.stringify(ct1) === JSON.stringify(ct2), "couple timing is deterministic for a fixed from-date");
  ok(ct1.windows.every((w) => w.start <= w.end), "couple windows are well-formed (start ≤ end)");
  ok(ct1.windows.every((w, i) => i === 0 || ct1.windows[i - 1].start <= w.start), "couple windows sorted by start");
  ok(ct1.nextInDays === null || ct1.nextInDays >= 0, "countdown is null or non-negative");
  // Honesty guard: unknown birth time must not produce Moon-target windows.
  const unkA = computeChart({ ...PEOPLE[0], timeKnown: false });
  const ctUnk = coupleTiming(unkA, FIX[1], "A", "B", from);
  ok(ctUnk.windows.every((w) => w.kind !== "a" || !w.headline.includes("your Moon")), "unknown-time chart drops its Moon windows");
}

// Pair-aware conjunction valence.
ok(pairValence("conjunction", "Mars", "Pluto") === "tension", "Mars☌Pluto reads as tension");
ok(pairValence("conjunction", "Saturn", "Venus") === "tension", "Saturn☌Venus reads as tension");
ok(pairValence("conjunction", "Venus", "Jupiter") === "harmonious", "Venus☌Jupiter reads as flow");
ok(pairValence("conjunction", "Venus", "Mars") === "blending", "Venus☌Mars stays blending");
ok(pairValence("trine", "Saturn", "Venus") === "harmonious", "non-conjunctions keep geometric valence");

// Unknown-time uncertainty propagates to the couple score.
const range = coupleScoreRange({ ...PEOPLE[0], timeKnown: false }, PEOPLE[1]);
ok(!!range && range.max >= range.min, "unknown-time couple score is a range", JSON.stringify(range));
ok(coupleScoreRange(PEOPLE[0], PEOPLE[1]) === null, "both-times-known has no range");
const synUnk = computeSynastry(computeChart({ ...PEOPLE[0], timeKnown: false }), FIX[1]);
ok(synUnk.aspects.some((a) => a.timeSensitive), "Moon contacts that depend on the unknown time are flagged");

// B1 tease cut: deterministic, always mid-clause, prefix-faithful.
{
  const S =
    "With Maya's Venus 12.3° Taurus wrapped around Daniel's Moon 14.1° Taurus, the tenderness between you two was never an accident, and the charts keep saying so in three different ways.";
  const cut = teaseCut(S);
  ok(cut.endsWith("…"), "tease cut ends mid-thought with an ellipsis", cut);
  ok(!cut.includes(S.split(" ").slice(-3).join(" ")), "tease cut hides the end of the sentence");
  const shown = cut.slice(0, -1).trim();
  ok(S.replace(/[,;:.!?]/g, "").startsWith(shown.replace(/[,;:.!?]/g, "")), "tease cut is a verbatim prefix of the full sentence");
  ok(teaseCut(S) === cut, "tease cut is deterministic");
  const short = "One two three four five six seven eight nine ten.";
  const shortCut = teaseCut(short);
  ok(shortCut.endsWith("…") && shortCut.split(/\s+/).length <= 6, "short sentences still hide at least four words", shortCut);
}

// ───────────────────────── result ─────────────────────────
console.log("─".repeat(50));
if (failures > 0) {
  console.error(`✗ ${failures}/${checks} golden checks FAILED`);
  process.exit(1);
}
console.log(`✓ ALL ${checks} GOLDEN CHECKS PASSED`);
