// Chart assembly: ChartInput -> ChartFacts (the engine ↔ AI/UI contract).

import { eclipticOfDateLon, isRetrograde } from "./ephemeris";
import { siderealAngles, wholeSignCusps, wholeSignHouse } from "./angles";
import { natalAspects } from "./aspects";
import { degInSign, signFromLon, signIndexFromLon } from "./zodiac";
import { resolveInstant } from "../geo/time";
import { BODIES } from "./zodiac";
import type { Angle, ChartFacts, ChartInput, PlacedBody } from "./types";

const ENGINE = "astronomy-engine@2 + astro-love-layer@0.1 (tropical, whole-sign)";

function angle(id: string, lon: number): Angle {
  return {
    id,
    lon,
    sign: signFromLon(lon).key,
    signIndex: signIndexFromLon(lon),
    degInSign: degInSign(lon),
  };
}

export function computeChart(input: ChartInput): ChartFacts {
  const inst = resolveInstant(input);
  const date = inst.utc;
  const warnings: string[] = [];
  if (!inst.zoneValid) warnings.push(`Unknown/invalid time zone "${input.tz}"; treated local time as UTC.`);
  if (!input.timeKnown) warnings.push("Birth time unknown — Ascendant, houses and house placements are omitted; the Moon's exact degree is approximate.");

  // Angles & houses require a known birth time.
  let asc: Angle | null = null;
  let mc: Angle | null = null;
  let cusps: number[] | null = null;
  let ascLon: number | null = null;
  if (input.timeKnown) {
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

  return {
    schemaVersion: "1.0",
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
    asc,
    mc,
    houseCusps: cusps,
    aspects: natalAspects(planets),
    warnings,
  };
}
