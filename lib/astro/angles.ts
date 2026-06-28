// Ascendant, Midheaven, and Whole-Sign houses — the astrology layer that
// astronomy-engine does NOT provide (SPEC.md §6.3). All angles in degrees.

import { norm360 } from "./zodiac";
import { gastDeg, meanObliquityDeg } from "./ephemeris";

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

export interface SiderealAngles {
  ramc: number; // Local Apparent Sidereal Time in degrees (= RA of the Midheaven)
  eps: number;  // obliquity in degrees
  mc: number;   // Midheaven ecliptic longitude
  asc: number;  // Ascendant ecliptic longitude
}

/** Midheaven ecliptic longitude from RAMC (deg) and obliquity (deg). */
export function mcFromRamc(ramc: number, eps: number): number {
  const r = ramc * RAD;
  const e = eps * RAD;
  return norm360(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) * DEG);
}

/** Ascendant ecliptic longitude from RAMC, obliquity and latitude (all deg). */
export function ascFromRamc(ramc: number, eps: number, lat: number): number {
  const r = ramc * RAD;
  const e = eps * RAD;
  const phi = lat * RAD;
  let asc = norm360(
    Math.atan2(
      Math.cos(r),
      -(Math.sin(r) * Math.cos(e) + Math.tan(phi) * Math.sin(e)),
    ) * DEG,
  );
  // Quadrant fix: the Ascendant (eastern horizon) must lead the MC by ~90°.
  const mc = mcFromRamc(ramc, eps);
  if (norm360(asc - mc) > 180) asc = norm360(asc + 180);
  return asc;
}

/**
 * @param lonEast observer longitude, EAST positive (west-positive mirrors the chart!)
 * @param lat     geographic latitude, north positive
 */
export function siderealAngles(date: Date, lat: number, lonEast: number): SiderealAngles {
  const ramc = norm360(gastDeg(date) + lonEast); // Local Apparent Sidereal Time
  const eps = meanObliquityDeg(date);
  return { ramc, eps, mc: mcFromRamc(ramc, eps), asc: ascFromRamc(ramc, eps, lat) };
}

/** Whole-Sign house cusps: 12 longitudes, cusp 1 = 0° of the Ascendant's sign. */
export function wholeSignCusps(asc: number): number[] {
  const cusp1 = Math.floor(norm360(asc) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => norm360(cusp1 + 30 * i));
}

/** Whole-Sign house (1..12) of a body, given the Ascendant longitude. */
export function wholeSignHouse(lon: number, asc: number): number {
  const ascSign = Math.floor(norm360(asc) / 30);
  const bodySign = Math.floor(norm360(lon) / 30);
  return ((bodySign - ascSign + 12) % 12) + 1;
}
