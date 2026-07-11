// Shared types for the deterministic astrology engine.
// These mirror the `chart-facts` JSON contract described in SPEC.md §6.7.

export type PlanetName =
  | "Sun" | "Moon" | "Mercury" | "Venus" | "Mars"
  | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";

export interface PlacedBody {
  id: string;            // stable fact id, e.g. "a.sun"
  body: PlanetName;
  lon: number;           // ecliptic longitude of date, [0,360)
  sign: string;          // English sign key, e.g. "Taurus"
  signIndex: number;     // 0..11
  degInSign: number;     // 0..30
  house: number | null;  // 1..12, or null when birth time unknown
  retrograde: boolean;
}

export interface Angle {
  id: string;
  lon: number;
  sign: string;
  signIndex: number;
  degInSign: number;
}

export type AspectName =
  | "conjunction" | "sextile" | "square" | "trine" | "quincunx" | "opposition";

export interface NatalAspect {
  a: string;             // fact id
  b: string;             // fact id
  aspect: AspectName;
  angle: number;         // exact separation, [0,180]
  orb: number;
  valence: "harmonious" | "tension" | "blending";
}

export interface ChartInput {
  name?: string;
  // Civil (local) birth time components, in the city's local wall-clock:
  year: number;
  month: number;         // 1..12
  day: number;
  hour: number;          // 0..23
  minute: number;        // 0..59
  timeKnown: boolean;
  // Location:
  lat: number;           // north positive
  lon: number;           // EAST positive (see SPEC.md §6.3 gotcha)
  tz: string;            // IANA zone id, e.g. "Europe/Moscow"
  place?: string;        // human label
}

/** Where the true Moon could sit across the whole birth day when the exact
 *  time is unknown (the Moon moves ~12-15°/day; every other body far less). */
export interface MoonRange {
  lonStart: number;      // Moon longitude at local 00:00
  lonEnd: number;        // Moon longitude at local 23:59
  spanDeg: number;       // shortest arc covered across the day
  crossesSign: boolean;  // true when start/end fall in different signs
}

export interface ChartFacts {
  schemaVersion: string;
  engine: string;
  zodiac: "tropical";
  houseSystem: "whole_sign";
  subject: {
    name?: string;
    place?: string;
    tz: string;
    lat: number;
    lon: number;
    utc: string;         // ISO instant
    localISO: string;    // local wall-clock the user entered
    timeKnown: boolean;
  };
  planets: PlacedBody[];
  asc: Angle | null;     // null when time unknown OR the tz was invalid
  mc: Angle | null;
  houseCusps: number[] | null; // 12 cusp longitudes, null when time unknown
  aspects: NatalAspect[];
  /** Present only when timeKnown=false: the Moon's possible range that day. */
  moonRange?: MoonRange;
  warnings: string[];
}
