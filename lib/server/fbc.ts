// Reconstruct Meta's `_fbc` click identifier from a stored fbclid.
//
// Normally fbevents.js writes _fbc when someone lands with ?fbclid=. When the
// pixel is blocked that never happens — and the blocked visitor is precisely
// the one the server leg exists to recover. We keep the fbclid ourselves at
// landing, so the server can rebuild the same value and attach the strongest
// match signal Meta accepts: the click that produced the visit.
//
// Format: fb.<subdomainIndex>.<creationTimeMs>.<fbclid>
// The timestamp must be when the click was FIRST seen, not now — reusing "now"
// on a purchase that happens two days later describes a different click.

const SUBDOMAIN_INDEX = 1;

export function buildFbc(fbclid: string | null | undefined, firstSeenMs: number | null | undefined): string | null {
  if (!fbclid) return null;
  const ts = Number(firstSeenMs);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return `fb.${SUBDOMAIN_INDEX}.${Math.floor(ts)}.${fbclid}`;
}

/** Parse the am_attr cookie server-side. Returns {} on anything unexpected. */
export function parseAttrCookie(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
