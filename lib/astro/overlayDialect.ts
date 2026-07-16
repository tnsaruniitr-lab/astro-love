// The house-overlay dialect (HANDOFF B5): where each person's romance planets
// (Sun, Moon, Venus, Mars) land in the OTHER person's whole-sign houses, read
// in the HOUSE_DIALECT voice, both directions, receipts attached.
//
// Honesty rules: a direction only exists when the HOST's Ascendant does (birth
// time known) — a missing direction is named, never faked. A guest Moon whose
// owner's birth time is unknown is flagged timeSensitive (it can move house
// within the day-range).

import type { ChartFacts } from "./types";
import { wholeSignHouse } from "./angles";
import { HOUSE_DIALECT } from "./loveCopy";

const ROMANCE = ["Sun", "Moon", "Venus", "Mars"] as const;

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

export interface DialectItem {
  from: "A" | "B";
  ownerName: string;
  hostName: string;
  body: string;
  house: number;
  arena: string;
  read: string;
  /** The proof line: exact position + host Ascendant it was measured from. */
  receipt: string;
  /** True when the guest planet is the Moon and its owner's time is unknown. */
  timeSensitive: boolean;
}

export interface OverlayDialect {
  available: boolean;
  items: DialectItem[];
  /** Honest notes for directions that cannot compute (host time unknown). */
  missing: string[];
}

export function overlayDialect(a: ChartFacts, b: ChartFacts, nameA: string, nameB: string): OverlayDialect {
  const items: DialectItem[] = [];
  const missing: string[] = [];

  const direction = (from: "A" | "B", fromChart: ChartFacts, intoChart: ChartFacts, ownerName: string, hostName: string) => {
    if (!intoChart.asc) {
      missing.push(`Add ${hostName}'s birth time to see where ${ownerName}'s planets land in ${hostName}'s houses.`);
      return;
    }
    for (const body of ROMANCE) {
      const p = fromChart.planets.find((x) => x.body === body);
      if (!p) continue;
      const house = wholeSignHouse(p.lon, intoChart.asc.lon);
      const d = HOUSE_DIALECT[house];
      if (!d) continue;
      items.push({
        from,
        ownerName,
        hostName,
        body,
        house,
        arena: d.arena,
        read: d.read,
        receipt: `${body} ${(p.lon % 30).toFixed(1)}° ${p.sign} falls in the ${ordinal(house)} whole-sign house from ${hostName}'s ${intoChart.asc.sign} Ascendant`,
        timeSensitive: body === "Moon" && !fromChart.subject.timeKnown,
      });
    }
  };

  direction("A", a, b, nameA, nameB);
  direction("B", b, a, nameB, nameA);

  return { available: items.length > 0, items, missing };
}

/** The single most loaded landing for the paywall tease: vault beats contract
 *  beats dance floor, and so on — the order people pay to hear about. */
const TEASE_PRIORITY = [8, 7, 5, 1, 4, 12, 10, 9, 2, 3, 6, 11];
export function dialectTease(d: OverlayDialect): DialectItem | null {
  if (!d.available) return null;
  const sorted = [...d.items].sort(
    (x, y) => TEASE_PRIORITY.indexOf(x.house) - TEASE_PRIORITY.indexOf(y.house),
  );
  return sorted[0] ?? null;
}
