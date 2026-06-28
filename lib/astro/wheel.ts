// Pure geometry for the SVG natal wheel.
//
// Convention (verified visually): the Ascendant sits at the LEFT (9 o'clock),
// the Descendant at the right, and ecliptic longitude increases COUNTER-
// CLOCKWISE (left → bottom → right → top). Screen mapping (SVG y is down):
//   x = cx − r·cos(d),  y = cy + r·sin(d),   d = lon − orientationLon
// At d=0 → (cx−r, cy) [left]; d=90 → (cx, cy+r) [bottom]; d=180 → right.

import { norm360 } from "./zodiac";

export interface Pt { x: number; y: number; }

export function polar(
  cx: number,
  cy: number,
  r: number,
  lon: number,
  orient: number,
): Pt {
  const d = norm360(lon - orient) * (Math.PI / 180);
  return { x: cx - r * Math.cos(d), y: cy + r * Math.sin(d) };
}

/** SVG path for an annular wedge (band segment) between two longitudes. */
export function wedge(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  lonStart: number,
  lonEnd: number,
  orient: number,
): string {
  const a = polar(cx, cy, rOuter, lonStart, orient);
  const b = polar(cx, cy, rOuter, lonEnd, orient);
  const c = polar(cx, cy, rInner, lonEnd, orient);
  const d = polar(cx, cy, rInner, lonStart, orient);
  // Increasing longitude maps to CCW on screen (φ = 180 − d), so the outer arc
  // (start→end) is CCW (sweep-flag 0) and the inner return arc is CW (flag 1).
  const large = 0;
  return [
    `M ${a.x.toFixed(2)} ${a.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`,
    `L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${d.x.toFixed(2)} ${d.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export interface PlacedGlyph<T> {
  item: T;
  trueLon: number;
  plotLon: number; // declumped angle for the glyph
  displaced: boolean;
}

/**
 * Spread overlapping glyphs apart along the ring while keeping a leader back to
 * the true degree. Simple, deterministic 2-pass declumping (good for ≤12 bodies).
 */
export function declump<T>(
  items: { item: T; lon: number }[],
  orient: number,
  minGapDeg = 9,
): PlacedGlyph<T>[] {
  const placed: PlacedGlyph<T>[] = items
    .map((x) => ({
      item: x.item,
      trueLon: x.lon,
      plotLon: norm360(x.lon - orient),
      displaced: false,
    }))
    .sort((a, b) => a.plotLon - b.plotLon);

  const n = placed.length;
  if (n < 2) return placed.map((p) => ({ ...p, plotLon: norm360(p.plotLon + orient) }));

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n; i++) {
      const cur = placed[i];
      const next = placed[(i + 1) % n];
      let gap = next.plotLon - cur.plotLon;
      if (i === n - 1) gap += 360; // wrap
      if (gap < minGapDeg) {
        const push = (minGapDeg - gap) / 2;
        cur.plotLon = norm360(cur.plotLon - push);
        next.plotLon = norm360(next.plotLon + push);
        cur.displaced = true;
        next.displaced = true;
      }
    }
  }

  return placed.map((p) => ({
    ...p,
    plotLon: norm360(p.plotLon + orient),
    displaced: Math.abs(norm360(p.plotLon + orient - p.trueLon)) > 1.5,
  }));
}
