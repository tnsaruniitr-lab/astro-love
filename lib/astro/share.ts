// Share payloads + a reproducible-reading link, all from real engine fields.
// Free tier only (score + archetype + the one hero thread), em-dash free.
// computeSynastry is deterministic, so an encoded link reproduces the exact
// reading for the recipient with no backend (SPEC §11 virality loop).

import type { SynastryResult } from "./synastry";
import { coupleArchetype, strongestThread } from "./insights";
import type { BirthFormValues } from "@/components/BirthFields";

export interface ShareCard {
  title: string;       // "Anna & Dmitri"
  scoreLine: string;   // "81 / 100"
  bandLabel: string;   // "Strong connection"
  archetypeName: string;
  archetypeLine: string;
  threadLine: string;
  footer: string;
}

export interface ShareCaptions { oneLiner: string; story: string; hashtags: string }

export function buildShareCard(syn: SynastryResult): ShareCard {
  const arch = coupleArchetype(syn);
  const thread = strongestThread(syn);
  return {
    title: `${syn.names.a} & ${syn.names.b}`,
    scoreLine: `${syn.score} / 100`,
    bandLabel: syn.band.label,
    archetypeName: arch.name,
    archetypeLine: arch.line,
    threadLine: thread ? thread.aspect.headline : syn.band.blurb,
    footer: "Astro-Love · see your own match free",
  };
}

export function buildCaptions(syn: SynastryResult): ShareCaptions {
  const arch = coupleArchetype(syn);
  const thread = strongestThread(syn);
  const t = thread ? ` Strongest thread, ${thread.aspect.headline}` : "";
  return {
    oneLiner: `${syn.names.a} and ${syn.names.b} scored ${syn.score} of 100, a ${syn.band.label}. Check yours free on Astro-Love.`,
    story: `${syn.names.a} and ${syn.names.b}: ${syn.score} of 100, ${syn.band.label}. Our couple type, ${arch.name}.${t} Check yours free on Astro-Love.`,
    hashtags: "#AstroLove #synastry #compatibility",
  };
}

// ───────────────────────── reproducible link ─────────────────────────
interface MiniPlace { lb: string; la: number; lo: number; tz: string }
interface Mini { n: string; pl: MiniPlace | null; y: number; m: number; d: number; h: number; mi: number; tk: boolean }

const toMini = (f: BirthFormValues): Mini => ({
  n: f.name,
  pl: f.place ? { lb: f.place.label, la: f.place.lat, lo: f.place.lon, tz: f.place.tz } : null,
  y: f.year, m: f.month, d: f.day, h: f.hour, mi: f.minute, tk: f.timeKnown,
});

const fromMini = (m: Mini): BirthFormValues => ({
  name: m.n,
  place: m.pl ? { label: m.pl.lb, name: m.pl.lb, country: "", lat: m.pl.la, lon: m.pl.lo, tz: m.pl.tz } : null,
  year: m.y, month: m.m, day: m.d, hour: m.h, minute: m.mi, timeKnown: m.tk,
});

const b64encode = (s: string) =>
  typeof window !== "undefined" ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, "utf-8").toString("base64");
const b64decode = (s: string) =>
  typeof window !== "undefined" ? decodeURIComponent(escape(atob(s))) : Buffer.from(s, "base64").toString("utf-8");

/** Encode both people's birth inputs into a compact, URL-safe token. */
export function encodeReading(a: BirthFormValues, b: BirthFormValues): string {
  const token = b64encode(JSON.stringify({ a: toMini(a), b: toMini(b) }));
  return token.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Parse a token back into two birth forms (or null if malformed). */
export function decodeReading(token: string): { a: BirthFormValues; b: BirthFormValues } | null {
  try {
    const norm = token.replace(/-/g, "+").replace(/_/g, "/");
    const o = JSON.parse(b64decode(norm)) as { a: Mini; b: Mini };
    if (!o?.a || !o?.b) return null;
    return { a: fromMini(o.a), b: fromMini(o.b) };
  } catch {
    return null;
  }
}
