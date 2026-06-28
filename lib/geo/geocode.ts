// Global city search via the Open-Meteo Geocoding API.
//
// Why this provider (SPEC.md §5.1–5.2 production note):
//  - Free, no API key, CORS-enabled → safe to call straight from the browser,
//    so the app stays static-host friendly (no server proxy needed).
//  - GeoNames-backed: covers small towns worldwide, with population for ranking.
//  - Crucially returns the IANA `timezone` per result, which the chart engine
//    needs for historical-offset resolution (Luxon) — not just lat/lon.
//
// Docs: https://open-meteo.com/en/docs/geocoding-api

export interface BirthPlace {
  /** Stable id from the provider (absent for locally-seeded defaults). */
  id?: number;
  /** Display string, e.g. "Berlin, Land Berlin, Germany". */
  label: string;
  /** City/place name only, e.g. "Berlin". */
  name: string;
  /** First-level region (state/oblast/province), when known. */
  admin1?: string;
  country: string;
  countryCode?: string;
  lat: number; // north positive
  lon: number; // EAST positive
  tz: string; // IANA zone id, e.g. "Europe/Berlin"
  population?: number;
}

const ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

interface OMResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  population?: number;
  feature_code?: string;
}

/** Build the human-readable label shown in the input + result card. */
export function placeLabel(name: string, admin1?: string, country?: string): string {
  return [name, admin1, country].filter(Boolean).join(", ");
}

function toPlace(r: OMResult): BirthPlace | null {
  // A usable chart needs coordinates AND a timezone; skip results missing either.
  if (typeof r.latitude !== "number" || typeof r.longitude !== "number" || !r.timezone) {
    return null;
  }
  return {
    id: r.id,
    label: placeLabel(r.name, r.admin1, r.country),
    name: r.name,
    admin1: r.admin1,
    country: r.country ?? "",
    countryCode: r.country_code,
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone,
    population: r.population,
  };
}

/**
 * Search globally for places matching `query`. Runs in the browser.
 * Pass an AbortSignal to cancel superseded keystroke requests.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<BirthPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = `${ENDPOINT}?name=${encodeURIComponent(q)}&count=10&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);

  const data: { results?: OMResult[] } = await res.json();
  const places = (data.results ?? [])
    .map(toPlace)
    .filter((p): p is BirthPlace => p !== null);

  // Surface bigger places first; the API already orders by relevance, but
  // population is a better tie-breaker for same-name towns.
  places.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
  return places;
}
