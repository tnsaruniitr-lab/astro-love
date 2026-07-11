// Lunar points: the TRUE North Node and Mean Lilith (mean lunar apogee).
//
// ☊ TRUE node — not the mean-node shortcut (which drifts up to ~1.75° from
// what Co-Star/professional software shows; in a product whose brand is
// precision that would be a self-inflicted wound). Computed from first
// principles: the ascending node is where the Moon's osculating orbital plane
// crosses the ecliptic northbound. GeoMoonState gives geocentric position AND
// velocity (EQJ); rotate both into the ecliptic of date, take the orbital
// angular momentum h = r × v, and the node line is n = ẑ × h. No new
// dependencies, same rotation path the rest of the ephemeris uses.
//
// ⚫ Mean Lilith — the mean lunar apogee (mean perigee + 180°), the standard
// "Black Moon Lilith" astrology apps display. The MEAN point is the
// well-defined, industry-default choice; the osculating one famously swings
// ±30° and is not what her other apps show. Meeus' perigee polynomial.
//
// Both are validated in the golden suite:
//  - true node vs the mean-node polynomial (must stay within the known ±1.9°
//    osculation band) and against the Moon's actual northbound ecliptic-plane
//    crossing (the definitional test, independent path through the ephemeris).
//  - Lilith's rate vs successive real apogee passages (~40.7°/yr apsidal
//    precession) — catches any 180° perigee/apogee flip.

import * as Astronomy from "astronomy-engine";
import { norm360 } from "./zodiac";
import { meanObliquityDeg } from "./ephemeris";

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

/** Rotate an EQJ vector triple into ecliptic-of-date coordinates. */
function eqjToEclOfDate(x: number, y: number, z: number, date: Date): [number, number, number] {
  // EQJ -> true equator of date (precession + nutation)…
  const rot = Astronomy.Rotation_EQJ_EQD(date).rot;
  const ex = rot[0][0] * x + rot[1][0] * y + rot[2][0] * z;
  const ey = rot[0][1] * x + rot[1][1] * y + rot[2][1] * z;
  const ez = rot[0][2] * x + rot[1][2] * y + rot[2][2] * z;
  // …then equator-of-date -> ecliptic-of-date about x by +obliquity.
  const eps = meanObliquityDeg(date) * RAD;
  const ce = Math.cos(eps), se = Math.sin(eps);
  return [ex, ey * ce + ez * se, -ey * se + ez * ce];
}

/** Ecliptic-of-date longitude of the Moon's TRUE (osculating) ascending node. */
export function trueNodeLon(date: Date): number {
  const s = Astronomy.GeoMoonState(date);
  const [rx, ry, rz] = eqjToEclOfDate(s.x, s.y, s.z, date);
  const [vx, vy, vz] = eqjToEclOfDate(s.vx, s.vy, s.vz, date);
  // Orbital angular momentum in the ecliptic frame.
  const hx = ry * vz - rz * vy;
  const hy = rz * vx - rx * vz;
  const hz = rx * vy - ry * vx;
  void hz;
  // Ascending node direction n = ẑ × h = (-hy, hx, 0).
  return norm360(Math.atan2(hx, -hy) * DEG);
}

/** Mean lunar node longitude (Meeus) — used only as a validation reference. */
export function meanNodeLon(date: Date): number {
  const t = Astronomy.MakeTime(date).tt / 36525;
  return norm360(
    125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + (t * t * t) / 467441 - (t * t * t * t) / 60616000,
  );
}

/** Mean Lilith: the mean lunar apogee = Meeus mean perigee + 180°. */
export function meanLilithLon(date: Date): number {
  const t = Astronomy.MakeTime(date).tt / 36525;
  const perigee =
    83.3532465 + 4069.0137287 * t - 0.01032 * t * t - (t * t * t) / 80053 + (t * t * t * t) / 18999000;
  return norm360(perigee + 180);
}

/** The node axis moves retrograde almost always (true node briefly stations). */
export function nodeRetrograde(date: Date): boolean {
  const l1 = trueNodeLon(date);
  const l2 = trueNodeLon(new Date(date.getTime() + 43_200_000)); // +12h
  return (((l2 - l1 + 540) % 360) - 180) < 0;
}
