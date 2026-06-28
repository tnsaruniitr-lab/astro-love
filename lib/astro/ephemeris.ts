// Ephemeris layer: geocentric ECLIPTIC-OF-DATE (tropical) longitudes via astronomy-engine.
//
// CRITICAL correctness notes (see SPEC.md §6.1 ⚠️ VERIFY):
//  - `EclipticLongitude()` is HELIOCENTRIC — never use it for a natal chart.
//  - `Ecliptic(GeoVector(...))` can return J2000-frame longitudes, not of-date,
//    which would introduce ~50"/yr (~0.36° by 2026) of precession error.
// To be robust regardless of library version, we compute of-date ecliptic
// longitude ourselves: EQJ vector -> rotate to equator-of-date (EQD) -> rotate
// by the obliquity into ecliptic-of-date. This depends only on long-stable
// astronomy-engine exports (GeoVector, Rotation_EQJ_EQD, RotateVector, MakeTime).

import * as Astronomy from "astronomy-engine";
import { norm360 } from "./zodiac";
import type { PlanetName } from "./types";

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

const BODY: Record<PlanetName, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
};

/** Mean obliquity of the ecliptic in degrees (IAU 2006 polynomial), TT-based. */
export function meanObliquityDeg(date: Date): number {
  const t = Astronomy.MakeTime(date).tt / 36525; // Julian centuries TT from J2000
  const arcsec =
    84381.406 -
    46.836769 * t -
    0.0001831 * t * t +
    0.0020034 * t * t * t -
    0.000000576 * t * t * t * t -
    0.0000000434 * t * t * t * t * t;
  return arcsec / 3600;
}

/** Geocentric ecliptic-of-date longitude (tropical zodiac longitude), [0,360). */
export function eclipticOfDateLon(body: PlanetName, date: Date): number {
  // Sun & Moon convenience functions are confirmed of-date; use them directly.
  if (body === "Sun") return norm360(Astronomy.SunPosition(date).elon);
  if (body === "Moon") return norm360(Astronomy.EclipticGeoMoon(date).lon);

  // Planets: EQJ (J2000 equatorial) geocentric vector, aberration-corrected.
  const gv = Astronomy.GeoVector(BODY[body], date, true);
  // Rotate to the true equator of date (precession + nutation).
  const rot = Astronomy.Rotation_EQJ_EQD(date);
  const eqd = Astronomy.RotateVector(rot, gv);
  // Rotate equator-of-date -> ecliptic-of-date about the x-axis by +obliquity.
  const eps = meanObliquityDeg(date) * RAD;
  const ce = Math.cos(eps);
  const se = Math.sin(eps);
  const x = eqd.x;
  const y = eqd.y * ce + eqd.z * se;
  return norm360(Math.atan2(y, x) * DEG);
}

/** Retrograde test: longitude moving backward over a short interval. */
export function isRetrograde(body: PlanetName, date: Date): boolean {
  if (body === "Sun" || body === "Moon") return false; // never retrograde geocentrically
  const l1 = eclipticOfDateLon(body, date);
  const later = new Date(date.getTime() + 0.5 * 86400_000);
  const l2 = eclipticOfDateLon(body, later);
  const d = (((l2 - l1 + 540) % 360) - 180); // signed shortest delta
  return d < 0;
}

/** Greenwich Apparent Sidereal Time in DEGREES, [0,360). */
export function gastDeg(date: Date): number {
  return norm360(Astronomy.SiderealTime(date) * 15); // SiderealTime returns HOURS
}
