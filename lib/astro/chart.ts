// Chart assembly: ChartInput -> ChartFacts (the engine ↔ AI/UI contract).
//
// Degradation policy ("true values or visibly degraded", never plausible-wrong):
//  - unknown birth time  -> no Asc/MC/houses; the Moon carries an explicit
//    whole-day range (moonRange) instead of a silently-trusted noon guess
//  - invalid timezone    -> the instant can be hours wrong, so Asc/MC/houses
//    are withheld exactly like unknown time (planet signs survive a few hours'
//    error; the Ascendant does not — it moves ~15°/hour)
//  - DST gap / ambiguous wall-clock -> explicit warnings

import { eclipticOfDateLon, isRetrograde } from "./ephemeris";
import { siderealAngles, wholeSignCusps, wholeSignHouse } from "./angles";
import { natalAspects } from "./aspects";
import { degInSign, signFromLon, signIndexFromLon } from "./zodiac";
import { trueNodeLon, meanLilithLon, nodeRetrograde } from "./points";
import { resolveInstant } from "../geo/time";
import { BODIES } from "./zodiac";
import type { Angle, ChartFacts, ChartInput, MoonRange, PlacedBody, PlacedPoint, PointName } from "./types";

const ENGINE = "astronomy-engine@2 + astro-love-layer@0.2 (tropical, whole-sign)";

function angle(id: string, lon: number): Angle {
  return {
    id,
    lon,
    sign: signFromLon(lon).key,
    signIndex: signIndexFromLon(lon),
    degInSign: degInSign(lon),
  };
}

/** Shortest signed arc from a to b, in (-180, 180]. */
const arc = (a: number, b: number) => ((b - a + 540) % 360) - 180;

/** The Moon's possible positions across the birth day (local 00:00 → 23:59). */
function moonRangeFor(input: ChartInput): MoonRange {
  const at = (hour: number, minute: number) =>
    resolveInstant({ ...input, hour, minute, timeKnown: true }).utc;
  const lonStart = eclipticOfDateLon("Moon", at(0, 0));
  const lonEnd = eclipticOfDateLon("Moon", at(23, 59));
  return {
    lonStart,
    lonEnd,
    spanDeg: Math.abs(arc(lonStart, lonEnd)),
    crossesSign: signIndexFromLon(lonStart) !== signIndexFromLon(lonEnd),
  };
}

export function computeChart(input: ChartInput): ChartFacts {
  const inst = resolveInstant(input);
  const date = inst.utc;
  const warnings: string[] = [];

  if (!inst.zoneValid) {
    warnings.push(
      `Unknown/invalid time zone "${input.tz}": the exact birth instant can't be trusted, so the local time was treated as UTC and the Ascendant, houses and house placements are omitted. Planet signs may still be correct.`,
    );
  }
  if (inst.gapAdjusted) {
    warnings.push(
      `The entered birth time did not exist locally that night (clocks jumped forward for daylight saving). The first valid time after the jump (${inst.gapAdjustedTo}) was used — if the time came from a document, double-check it.`,
    );
  }
  if (inst.ambiguous) {
    warnings.push(
      "This birth time occurred twice that night (clocks fell back for daylight saving). The earlier occurrence was used; the later one would shift the Ascendant and houses.",
    );
  }
  if (!input.timeKnown) {
    warnings.push(
      "Birth time unknown, so Ascendant, houses and house placements are omitted.",
    );
  }

  // Angles & houses require BOTH a known birth time and a trustworthy instant.
  const angleSafe = input.timeKnown && inst.zoneValid;
  let asc: Angle | null = null;
  let mc: Angle | null = null;
  let cusps: number[] | null = null;
  let ascLon: number | null = null;
  if (angleSafe) {
    const sa = siderealAngles(date, input.lat, input.lon);
    ascLon = sa.asc;
    asc = angle("asc", sa.asc);
    mc = angle("mc", sa.mc);
    cusps = wholeSignCusps(sa.asc);
  }

  const planets: PlacedBody[] = BODIES.map(({ key }) => {
    const lon = eclipticOfDateLon(key, date);
    return {
      id: `p.${key.toLowerCase()}`,
      body: key,
      lon,
      sign: signFromLon(lon).key,
      signIndex: signIndexFromLon(lon),
      degInSign: degInSign(lon),
      house: ascLon === null ? null : wholeSignHouse(lon, ascLon),
      retrograde: isRetrograde(key, date),
    };
  });

  // TRUE node axis + Mean Lilith. Slow-moving (node ~19.4°/yr, Lilith
  // ~40.7°/yr) so, unlike the Moon itself, an unknown birth time barely moves
  // them — they're safe to show whenever the instant is trustworthy.
  const placePoint = (id: string, point: PointName, glyph: string, label: string, lon: number, retro: boolean): PlacedPoint => ({
    id, point, glyph, label, lon,
    sign: signFromLon(lon).key,
    signIndex: signIndexFromLon(lon),
    degInSign: degInSign(lon),
    house: ascLon === null ? null : wholeSignHouse(lon, ascLon),
    retrograde: retro,
  });
  const nodeLon = trueNodeLon(date);
  const nodeRx = nodeRetrograde(date);
  const points: PlacedPoint[] = [
    placePoint("pt.node", "NorthNode", "☊", "North Node", nodeLon, nodeRx),
    placePoint("pt.southnode", "SouthNode", "☋", "South Node", (nodeLon + 180) % 360, nodeRx),
    placePoint("pt.lilith", "Lilith", "⚸", "Lilith (mean)", meanLilithLon(date), false),
  ];

  // Unknown time: quantify the Moon's whole-day range instead of presenting
  // the noon placeholder as fact (it can be up to ~7° off, occasionally a
  // different sign — and Moon contacts carry the heaviest synastry weights).
  let moonRange: MoonRange | undefined;
  if (!input.timeKnown && inst.zoneValid) {
    moonRange = moonRangeFor(input);
    if (moonRange.crossesSign) {
      const s1 = signFromLon(moonRange.lonStart).key;
      const s2 = signFromLon(moonRange.lonEnd).key;
      warnings.push(
        `Without a birth time the Moon could be in ${s1} or ${s2} that day — Moon-based readings are marked as birth-time sensitive.`,
      );
    } else {
      warnings.push(
        `Without a birth time the Moon's exact degree is approximate (it moves ${moonRange.spanDeg.toFixed(1)}° across that day); a noon estimate is used and Moon contacts that depend on the exact time are flagged.`,
      );
    }
  }

  return {
    schemaVersion: "1.2",
    engine: ENGINE,
    zodiac: "tropical",
    houseSystem: "whole_sign",
    subject: {
      name: input.name,
      place: input.place,
      tz: input.tz,
      lat: input.lat,
      lon: input.lon,
      utc: date.toISOString(),
      localISO: inst.localISO,
      timeKnown: input.timeKnown,
    },
    planets,
    points,
    asc,
    mc,
    houseCusps: cusps,
    aspects: natalAspects(planets),
    ...(moonRange ? { moonRange } : {}),
    warnings,
  };
}
