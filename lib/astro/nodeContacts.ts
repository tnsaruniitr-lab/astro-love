// Node-contact detection — "fate or rerun?"
//
// One person's planet conjunct the OTHER person's node axis is the classical
// destiny signature: ☊ (North Node) = the direction their soul is growing
// toward — forward-pull, slightly uncomfortable-new; ☋ (South Node) = instant
// familiarity — comfortable, past-tense, the "rerun" risk. Only CONJUNCTIONS
// count here (the traditional read), tight orb, receipts attached.
//
// Deterministic; copy lives in loveCopy.ts.

import { separation } from "./aspects";
import { SIGNS, signIndexFromLon, degInSign } from "./zodiac";
import { NODE_CONTACT_READ } from "./loveCopy";
import type { ChartFacts } from "./types";

const NODE_ORB = 2.5; // classical tight orb for node conjunctions
const PLANETS = ["Sun", "Moon", "Venus", "Mars", "Jupiter", "Saturn"] as const;

export interface NodeContact {
  /** Whose node is touched ("A" | "B") — the node person feels the destiny pull. */
  nodeOwner: "A" | "B";
  planetOwner: "A" | "B";
  planet: string;        // the touching planet
  node: "north" | "south";
  orb: number;           // degrees, rounded 0.1
  read: string;          // the interpretation (from the copy register)
  proof: string;         // receipts: planet °sign ☌ ☊/☋ °sign · orb
  headline: string;
  /** Unknown birth time makes the Moon's degree approximate — flag it. */
  timeSensitive: boolean;
}

export interface NodeContacts {
  available: boolean;
  contacts: NodeContact[]; // sorted tightest-first, max 3
}

const fmt = (lon: number) => {
  const si = signIndexFromLon(lon);
  const within = degInSign(lon);
  const d = Math.floor(within);
  const m = Math.round((within - d) * 60);
  return `${m === 60 ? d + 1 : d}°${String(m === 60 ? 0 : m).padStart(2, "0")}′ ${SIGNS[si].en}`;
};

/** Detect planet↔node-axis conjunctions across two charts, both directions. */
export function nodeContacts(a: ChartFacts, b: ChartFacts, nameA: string, nameB: string): NodeContacts {
  const out: NodeContact[] = [];

  const scan = (nodeChart: ChartFacts, planetChart: ChartFacts, nodeOwner: "A" | "B") => {
    const north = nodeChart.points?.find((p) => p.point === "NorthNode");
    if (!north) return;
    const south = (north.lon + 180) % 360;
    const nodeName = nodeOwner === "A" ? nameA : nameB;
    const planetName = nodeOwner === "A" ? nameB : nameA;
    for (const body of PLANETS) {
      const pl = planetChart.planets.find((p) => p.body === body);
      if (!pl) continue;
      for (const [which, lon, glyph] of [["north", north.lon, "☊"], ["south", south, "☋"]] as const) {
        const orb = separation(pl.lon, lon);
        if (orb > NODE_ORB) continue;
        const read = NODE_CONTACT_READ[which][body];
        if (!read) continue;
        out.push({
          nodeOwner,
          planetOwner: nodeOwner === "A" ? "B" : "A",
          planet: body,
          node: which,
          orb: Math.round(orb * 10) / 10,
          read,
          proof: `${planetName}'s ${body} ${fmt(pl.lon)} ☌ ${nodeName}'s ${glyph} ${fmt(lon)} · orb ${orb.toFixed(1)}°`,
          headline: which === "north"
            ? `${planetName}'s ${body} sits on ${nodeName}'s North Node`
            : `${planetName}'s ${body} sits on ${nodeName}'s South Node`,
          timeSensitive: body === "Moon" && !planetChart.subject.timeKnown,
        });
      }
    }
  };

  scan(a, b, "A");
  scan(b, a, "B");
  out.sort((x, y) => x.orb - y.orb);
  return { available: out.length > 0, contacts: out.slice(0, 3) };
}
