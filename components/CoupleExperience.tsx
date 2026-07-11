"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import BirthFields, { type BirthFormValues } from "./BirthFields";
import SynastryWheel from "./SynastryWheel";
import TopNav from "./TopNav";
import PaywallGate from "./Paywall";
import { useTheme } from "./ThemeProvider";
import { useLocale, useT } from "./LocaleProvider";
import { fill } from "@/lib/i18n";
import { BODIES } from "@/lib/astro/zodiac";
import { computeChart } from "@/lib/astro/chart";
import { computeSynastry, BODY_ROLE, ASPECT_MEANING, type SynastryResult, type SynAspect, type SynOverlay } from "@/lib/astro/synastry";
import { coupleScoreRange, type ScoreRange } from "@/lib/astro/uncertainty";
import { contactFacts, enrichSections } from "@/lib/astro/enrich";
import { useReading } from "@/lib/useReading";
import type { CoupleProse } from "@/lib/server/writer";
import type { CompositeChart } from "@/lib/astro/composite";
import { directionalSplit, type DirectionalSplit, type DirectionalSide } from "@/lib/astro/directional";
import { detectHotCold, type HotCold } from "@/lib/astro/hotcold";
import { needsProfile, moonMatch, type NeedsProfile, type NeedsPerson, type MoonMatch } from "@/lib/astro/decoders";
import { nodeContacts, type NodeContacts } from "@/lib/astro/nodeContacts";
import { coupleTiming, type CoupleTiming } from "@/lib/astro/coupleTiming";
import type { ManifestItem } from "./Paywall";
import {
  archetypeReading, strongestThread, subscoreRead, scoreMeaning, dimensionsLead, bringsLead,
  tendToList, flowGrowStory,
  type ArchetypeReading, type Thread, type SubscoreRead, type TendItem,
} from "@/lib/astro/insights";
import { buildShareCard, buildCaptions, encodeReading, type ShareCard } from "@/lib/astro/share";
import type { ChartFacts, ChartInput } from "@/lib/astro/types";

const GLYPH_FONT =
  '"Noto Sans Symbols2","Segoe UI Symbol","Apple Symbols","DejaVu Sans",serif';

export interface CoupleResult {
  a: ChartFacts;
  b: ChartFacts;
  syn: SynastryResult;
  /** The raw inputs behind the charts — needed for the server gate + prose. */
  inputs: { a: ChartInput; b: ChartInput };
  /** Score range when a birth time is unknown (honest uncertainty). */
  range: ScoreRange | null;
}

const ASPECT_GLYPH: Record<string, string> = {
  conjunction: "☌", sextile: "⚹", square: "□", trine: "△", quincunx: "⚻", opposition: "☍",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const COMPAT_KEY = "am_compat";

// The staged "reading the sky" ritual, played after the (instant) compute.
const LOAD_STAGES = [
  "Casting both birth charts",
  "Placing Venus, Mars and the Moon",
  "Measuring the angles between you",
  "Finding where your planets share a home",
  "Reading what the degrees say",
];

export default function CoupleExperience({
  initialA,
  initialB,
  initialResult,
}: {
  initialA: BirthFormValues;
  initialB: BirthFormValues;
  initialResult: CoupleResult | null;
}) {
  const { palette: pal } = useTheme();
  const t = useT();
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [result, setResult] = useState<CoupleResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [loadStage, setLoadStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Shared-link recipients are the highest-intent traffic there is — after
  // someone else's reading, hand them a one-tap path into their OWN.
  const [fromShare, setFromShare] = useState(initialResult !== null);
  // 0 = initial/SSR or restored result (show everything). Each Calculate bumps
  // this and remounts <Result> into the staged tap-to-reveal "ritual".
  const [revealKey, setRevealKey] = useState(0);

  const compute = (fa: BirthFormValues, fb: BirthFormValues): CoupleResult => {
    const toInput = (f: BirthFormValues, who: string): ChartInput => {
      const p = f.place;
      if (!p) throw new Error(fill(t.compat.choosePlace, { who }));
      return {
        name: f.name || undefined, place: p.label,
        year: f.year, month: f.month, day: f.day, hour: f.hour, minute: f.minute,
        timeKnown: f.timeKnown, lat: p.lat, lon: p.lon, tz: p.tz,
      };
    };
    const inA = toInput(fa, t.compat.personA);
    const inB = toInput(fb, t.compat.personB);
    const chartA = computeChart(inA);
    const chartB = computeChart(inB);
    const syn = computeSynastry(chartA, chartB, inA.name ?? t.compat.personA, inB.name ?? t.compat.personB);
    const range = coupleScoreRange(inA, inB);
    return { a: chartA, b: chartB, syn, inputs: { a: inA, b: inB }, range };
  };

  // Returning visitor: if there's no shared-link result, restore the last
  // reading this device computed (inputs are controlled, so just set them).
  useEffect(() => {
    if (initialResult) return;
    try {
      const raw = localStorage.getItem(COMPAT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { a: BirthFormValues; b: BirthFormValues };
      if (!saved?.a?.place || !saved?.b?.place) return;
      setA(saved.a);
      setB(saved.b);
      setResult(compute(saved.a, saved.b));
    } catch { /* ignore a malformed or stale save */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function calculate() {
    setError(null);
    setFromShare(false);
    // Compute first (instant, in-browser) so a bad input errors immediately —
    // no point playing 3s of theater and then failing.
    let res: CoupleResult;
    try {
      res = compute(a, b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return;
    }
    try { localStorage.setItem(COMPAT_KEY, JSON.stringify({ a, b })); } catch { /* ignore */ }

    // Deliberate staged reveal — the "reading the sky" ritual. The math is done;
    // the pause builds anticipation. Honor reduced-motion with a short beat.
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setLoading(true);
    if (reduce) {
      setLoadStage(LOAD_STAGES.length - 1);
      await new Promise((r) => setTimeout(r, 300));
    } else {
      for (let i = 0; i < LOAD_STAGES.length; i++) {
        setLoadStage(i);
        await new Promise((r) => setTimeout(r, 720));
      }
    }
    setResult(res);
    setRevealKey((k) => k + 1);
    setLoading(false);
    setLoadStage(0);
  }

  // Let a cold visitor feel the wow-moment before entering two full birth
  // charts — the biggest funnel leak was gating the reveal behind the effort
  // it's meant to justify.
  function loadSample() {
    setError(null);
    setFromShare(false);
    setA(SAMPLE_A);
    setB(SAMPLE_B);
    setResult(compute(SAMPLE_A, SAMPLE_B));
    setRevealKey((k) => k + 1);
  }

  // Shared-link CTA: clear the sender's data and jump to a fresh form.
  const BLANK_FORM: BirthFormValues = { name: "", place: null, year: 2000, month: 1, day: 1, hour: 12, minute: 0, timeKnown: true };
  function startYours() {
    setFromShare(false);
    setResult(null);
    setA({ ...BLANK_FORM });
    setB({ ...BLANK_FORM });
    try { localStorage.removeItem(COMPAT_KEY); } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <TopNav />

      <header className="text-center">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-gold/80">
          <span>✦</span> {t.compat.eyebrow} <span>✦</span>
        </div>
        <h1 className="font-display text-4xl sm:text-6xl leading-tight mt-3">
          <span className="gold-text">{t.compat.h1a}</span>{" "}
          <span className="text-cream italic">{t.compat.h1b}</span>
        </h1>
        <p className="text-haze mt-4 max-w-md mx-auto">{t.compat.subtitle}</p>
      </header>

      <div className="grid md:grid-cols-2 gap-5 mt-10">
        <Panel label={t.compat.personA} accent={pal.personA}>
          <BirthFields value={a} onChange={setA} namePlaceholder={t.birth.placeholderA} />
        </Panel>
        <Panel label={t.compat.personB} accent={pal.personB}>
          <BirthFields value={b} onChange={setB} namePlaceholder={t.birth.placeholderB} />
        </Panel>
      </div>
      <div className="flex flex-col items-center mt-5">
        <button onClick={calculate} disabled={loading} className="btn-gold px-10 py-3">
          {loading ? t.compat.calculating : t.compat.calculate}
        </button>
        {error && <p className="mt-3 text-sm text-rose/90">{error}</p>}
      </div>

      {loading
        ? <CalculatingLoader stage={loadStage} />
        : result
          ? (
            <>
              <Result key={revealKey} result={result} staged={revealKey > 0} forms={{ a, b }} />
              {fromShare && (
                <section className="mt-8 text-center">
                  <div className="glass inline-flex flex-col items-center gap-3 px-8 py-6">
                    <p className="text-sm text-cream/90">That was {result.syn.names.a} &amp; {result.syn.names.b}&apos;s reading. Yours is 30 seconds away.</p>
                    <button onClick={startYours} className="btn-gold px-8 py-2.5">Now run yours ✦</button>
                  </div>
                </section>
              )}
            </>
          )
          : <EmptyState onSample={loadSample} />}

      <footer className="mt-14 text-center text-xs text-haze/60 space-y-1">
        <p>{t.compat.footer1}</p>
        <p className="text-haze/40">{t.compat.footer2}</p>
      </footer>
    </main>
  );
}

// The staged celestial loader — two bodies orbiting a bright core, with the
// ritual line advancing beneath. Reduced-motion users get the final stage only.
function CalculatingLoader({ stage }: { stage: number }) {
  return (
    <section className="mt-12 mb-2 flex flex-col items-center gap-7 py-10" aria-live="polite" aria-busy="true">
      <div className="relative motion-reduce:hidden" style={{ width: 132, height: 132 }}>
        <div className="absolute inset-0 rounded-full border border-gold/15" />
        <div className="absolute rounded-full border border-rose/25" style={{ inset: 24 }} />
        <div className="absolute top-1/2 left-1/2 rounded-full" style={{ width: 12, height: 12, marginTop: -6, marginLeft: -6, background: "radial-gradient(circle at 40% 35%, #fff, rgb(var(--c-goldbright)))", boxShadow: "0 0 20px 4px rgb(var(--c-goldbright) / 0.5)" }} />
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3.2s" }}>
          <span className="absolute left-1/2 rounded-full" style={{ top: -5, marginLeft: -5, width: 10, height: 10, background: "rgb(var(--c-gold))", boxShadow: "0 0 12px 2px rgb(var(--c-gold) / 0.7)" }} />
        </div>
        <div className="absolute animate-spin" style={{ inset: 24, animationDuration: "2.1s", animationDirection: "reverse" }}>
          <span className="absolute left-1/2 rounded-full" style={{ top: -4, marginLeft: -4, width: 8, height: 8, background: "rgb(var(--c-rose))", boxShadow: "0 0 12px 2px rgb(var(--c-rose) / 0.7)" }} />
        </div>
      </div>
      <p key={stage} className="font-display italic text-lg sm:text-xl text-goldbright text-center fade-up px-6">{LOAD_STAGES[stage]}…</p>
      <div className="w-52 h-[3px] rounded-full bg-cream/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${((stage + 1) / LOAD_STAGES.length) * 100}%`, background: "linear-gradient(90deg, rgb(var(--c-rose)), rgb(var(--c-goldbright)))", transition: "width 700ms cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </section>
  );
}

function EmptyState({ onSample }: { onSample: () => void }) {
  const t = useT();
  return (
    <section className="mt-12 mb-2 text-center">
      <div className="inline-flex flex-col items-center gap-3 text-haze/70">
        <span className="text-2xl text-gold/55" aria-hidden>✦</span>
        <p className="text-sm">{t.compat.empty}</p>
        <button onClick={onSample} className="mt-1 text-xs uppercase tracking-[0.18em] text-gold/85 hover:text-gold underline underline-offset-4">
          {t.reading.sampleCta}
        </button>
      </div>
    </section>
  );
}

// A pre-filled sample couple (no real people) so the reveal ritual, gauge,
// axes, and paywall peek play instantly with zero data entry.
const SAMPLE_A: BirthFormValues = {
  name: "Mia",
  place: { label: "Lisbon, Portugal", name: "Lisbon", country: "Portugal", lat: 38.7223, lon: -9.1393, tz: "Europe/Lisbon" },
  year: 1994, month: 6, day: 12, hour: 9, minute: 20, timeKnown: true,
};
const SAMPLE_B: BirthFormValues = {
  name: "Leo",
  place: { label: "Buenos Aires, Argentina", name: "Buenos Aires", country: "Argentina", lat: -34.6037, lon: -58.3816, tz: "America/Argentina/Buenos_Aires" },
  year: 1991, month: 11, day: 3, hour: 21, minute: 45, timeKnown: true,
};

function Panel({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="glass p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
        <h2 className="font-display text-xl text-cream">{label}</h2>
      </div>
      {children}
    </div>
  );
}

// ───────────────────────── result deck ─────────────────────────
function Result({ result, staged, forms }: { result: CoupleResult; staged: boolean; forms: { a: BirthFormValues; b: BirthFormValues } }) {
  const { a, b, syn, inputs, range } = result;
  const t = useT();
  const { locale } = useLocale();

  const archReading = archetypeReading(syn);
  const thread = strongestThread(syn);
  const reads = subscoreRead(syn);

  // The decoder layer — all deterministic, all computed from the two charts
  // already in memory. Conditional features stay silent when the geometry
  // doesn't exist (a fake tease would be trust arson with this audience).
  const decoded = useMemo(() => ({
    dir: directionalSplit(syn),
    hc: detectHotCold(syn),
    mm: moonMatch(a, b),
    np: needsProfile(a, b, syn.names.a, syn.names.b),
    nc: nodeContacts(a, b, syn.names.a, syn.names.b),
    timing: coupleTiming(a, b, syn.names.a, syn.names.b, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [syn]);
  const { dir, hc, mm, np, nc, timing } = decoded;

  // Premium is confirmed by the SERVER (signed entitlement token), not by a
  // local flag — and the AI-written reading only exists server-side.
  const readingReq = useMemo(
    () => ({ mode: "couple" as const, a: inputs.a, b: inputs.b, locale }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(inputs), locale],
  );
  const { gate, prose, proseLoading, composite } = useReading(readingReq);
  const unlocked = gate === "open";

  // Free-tier teases (rendered only while locked): computed, personalized,
  // honest. The Moon line always exists; the destiny line only when a real
  // node contact does.
  const archTeasers: string[] = [];
  if (!unlocked && mm) {
    archTeasers.push(
      mm.aElement === mm.bElement
        ? `☾ Two ${mm.aElement} Moons — ${syn.names.a}'s in ${mm.aSign}, ${syn.names.b}'s in ${mm.bSign} — read safety in the same language. What that gives you (and where it blinds you) is inside.`
        : `☾ A ${mm.aSign} Moon and a ${mm.bSign} Moon read safety in different languages. What each of you actually needs — inside.`,
    );
  }
  if (!unlocked && nc.available) {
    const c = nc.contacts[0];
    const pn = c.planetOwner === "A" ? syn.names.a : syn.names.b;
    const nn = c.nodeOwner === "A" ? syn.names.a : syn.names.b;
    archTeasers.push(
      `✦ One destiny-line contact detected: ${pn}'s ${c.planet} sits within ${c.orb}° of ${nn}'s ${c.node === "north" ? "North" : "South"} Node. Whether it pulls you forward or back is inside.`,
    );
  }

  const h = t.compat.hints;
  const cards: { key: string; hint: string; node: React.ReactNode }[] = [
    { key: "score", hint: h.score, node: <ScoreCard syn={syn} forms={forms} range={range} charts={{ a, b }} dirTease={unlocked ? null : dir} /> },
    { key: "type", hint: h.type, node: <ArchetypeCard reading={archReading} teasers={archTeasers} /> },
    ...(unlocked && (prose || proseLoading)
      ? [{ key: "prose", hint: t.reading.proseTitle, node: <ProseCard prose={prose as CoupleProse | null} loading={proseLoading} /> }]
      : []),
    ...(thread ? [{ key: "thread", hint: h.thread, node: <ThreadCard thread={thread} names={syn.names} /> }] : []),
    ...(unlocked && np.available
      ? [{ key: "needs", hint: "What you each need", node: <NeedsCard np={np} /> }]
      : []),
    ...(unlocked && mm
      ? [{ key: "moons", hint: "Your Moon match", node: <MoonMatchCard mm={mm} names={syn.names} /> }]
      : []),
    ...(unlocked && hc
      ? [{ key: "hotcold", hint: "Why it runs hot and cold", node: <HotColdCard hc={hc} /> }]
      : []),
    ...(unlocked && dir.available
      ? [{ key: "direction", hint: "Who feels it more", node: <DirectionalCard dir={dir} names={syn.names} /> }]
      : []),
    ...(unlocked && nc.available
      ? [{ key: "nodes", hint: "Fate or rerun", node: <NodeContactsCard nc={nc} /> }]
      : []),
    ...(unlocked && timing.available
      ? [{ key: "timing", hint: "Your year together", node: <CoupleTimingCard timing={timing} /> }]
      : []),
    ...(unlocked && composite?.available
      ? [{ key: "composite", hint: "Your relationship chart", node: <CompositeCard composite={composite} names={syn.names} /> }]
      : []),
    { key: "dims", hint: h.dims, node: <DimensionsCard syn={syn} reads={reads} /> },
    { key: "tend", hint: h.tend, node: <TendCard syn={syn} /> },
    { key: "flowgrow", hint: h.flowgrow, node: <FlowGrowCard syn={syn} /> },
    { key: "wheel", hint: h.wheel, node: <WheelCard a={a} b={b} syn={syn} /> },
    ...(syn.overlays.length > 0 ? [{ key: "brings", hint: h.brings, node: <BringsCard syn={syn} /> }] : []),
    { key: "shine", hint: h.shine, node: <ShineCard reads={reads} /> },
  ];

  // Free tier: the score and the couple-type cards. Everything past that sits
  // behind a single $2 unlock, confirmed server-side.
  const FREE = 2;
  const total = cards.length;
  const gateAt = unlocked ? total : Math.min(FREE, total);
  const locked = !unlocked && total > gateAt;

  // The REAL deck size a buyer receives — counted from the same conditionals
  // that will build the unlocked deck (the old counter undersold it).
  const sealedCount = locked
    ? 1 /* written reading */ + (thread ? 1 : 0) + (np.available ? 1 : 0) + (mm ? 1 : 0) +
      (hc ? 1 : 0) + (dir.available ? 1 : 0) + (nc.available ? 1 : 0) + (timing.available ? 1 : 0) +
      1 /* composite */ + 3 /* dims, tend, flowgrow */ + 1 /* wheel */ +
      (syn.overlays.length > 0 ? 1 : 0) + 1 /* shine */
    : 0;
  const displayTotal = locked ? FREE + sealedCount : total;

  // The paywall receipt: every sealed card NAMED, with THEIR placements in the
  // sub-lines — she decides on named objects, not blur bars. Teases are built
  // from free-tier facts only (titles + placements), never premium content.
  const manifest: ManifestItem[] = [];
  if (locked) {
    if (thread) manifest.push({ title: "Your strongest thread — decoded in full", sub: `${syn.names.a}'s ${thread.aspect.aBody} ${thread.aspect.aspect} ${syn.names.b}'s ${thread.aspect.bBody}, and what it does to you` });
    if (hc) manifest.push({ title: "Why it runs hot and cold", sub: `one exact angle explains it — it involves ${hc.heavyOwnerName}'s ${hc.heavyBody}` });
    if (np.available && np.b) manifest.push({ title: `What ${syn.names.b} needs to feel loved`, sub: `☾ ${np.b.moon.sign} + ♀ ${np.b.venus.sign}, decoded — and ${syn.names.a}'s side too` });
    if (dir.available) manifest.push({ title: "Which of you carries more of the charge", sub: dir.notablyUneven ? "it isn't even — see which side" : "remarkably even — see why that's rare" });
    if (mm) manifest.push({ title: "Your Moon match", sub: `☾ ${mm.aSign} × ☾ ${mm.bSign} — how you each read safety` });
    if (timing.available) manifest.push({ title: "Your year together, dated", sub: timing.nextInDays === 0 ? "a window is open right now" : timing.nextInDays != null ? `the next window opens in ${timing.nextInDays} days` : "your love windows for the next 12 months" });
    manifest.push({ title: "Your written reading", sub: "composed for you two from your exact charts" });
    if (nc.available) {
      const c = nc.contacts[0];
      const pn = c.planetOwner === "A" ? syn.names.a : syn.names.b;
      const nn = c.nodeOwner === "A" ? syn.names.a : syn.names.b;
      manifest.push({ title: "Fate or rerun? A destiny-line contact", sub: `${pn}'s ${c.planet} on ${nn}'s ${c.node === "north" ? "North" : "South"} Node, orb ${c.orb}°` });
    }
    manifest.push({ title: "Your relationship's own chart", sub: "the composite — one chart for the bond itself" });
    manifest.push({ title: "Five dimensions, synastry wheel & more", sub: `all ${syn.aspects.length} contacts between your charts, scored and drawn` });
  }

  const [revealed, setRevealed] = useState(staged ? 0 : total);

  // Non-staged decks (restored/shared readings) start fully revealed — but the
  // premium cards join the array ASYNC once the gate confirms, which would
  // leave them ghost-facedown behind a frozen `revealed`. Top it up as the
  // deck grows. Staged decks keep the tap-to-reveal ritual untouched.
  useEffect(() => {
    if (!staged) setRevealed((r) => Math.max(r, total));
  }, [staged, total]);
  const activeRef = useRef<HTMLButtonElement>(null);
  const cascadingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Return target preserves this exact reading (shared-link encoding), so after
  // paying the user lands back on the same couple, now fully unlocked.
  const next = (() => {
    try { return `/?r=${encodeReading(forms.a, forms.b)}`; } catch { return "/"; }
  })();

  const prefersReduced = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (staged && revealed > 0 && revealed < gateAt && !cascadingRef.current) {
      activeRef.current?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "center" });
    }
  }, [revealed, staged, gateAt]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const revealAll = () => {
    if (prefersReduced()) { setRevealed(gateAt); return; }
    cascadingRef.current = true;
    intervalRef.current = setInterval(() => {
      setRevealed((n) => {
        const nx = Math.min(n + 1, gateAt);
        if (nx >= gateAt && intervalRef.current) { clearInterval(intervalRef.current); cascadingRef.current = false; }
        return nx;
      });
    }, 150);
  };

  const done = Math.min(revealed, gateAt);
  const atGate = revealed >= gateAt;

  return (
    <section className="mt-10 space-y-5">
      {staged && (
        <div className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] text-haze" aria-live="polite">
          <span><span key={done} className="count-tick">✦ {fill(t.compat.revealedOfTotal, { n: done, total: displayTotal })}</span> {t.compat.revealedWord}</span>
          {revealed < gateAt && (
            <button onClick={revealAll} className="text-gold/80 hover:text-gold underline underline-offset-4">
              {t.compat.revealAll}
            </button>
          )}
        </div>
      )}

      <div className="deck-slot space-y-5">
        {cards.slice(0, gateAt).map((c, i) => {
          if (i < revealed) return <div key={c.key} className="card-turn">{c.node}</div>;
          if (i === revealed) return <FacedownCard key={c.key} ref={activeRef} hint={c.hint} onReveal={() => setRevealed(i + 1)} />;
          return null;
        })}
      </div>

      {locked && atGate && (
        <>
          {/* "His side" tease — the core decode-him job, named with his real Moon. */}
          {np.b && (
            <div className="glass px-5 py-4 flex items-center gap-3.5">
              <span className="text-2xl text-gold shrink-0" style={{ fontFamily: GLYPH_FONT }} aria-hidden>☾</span>
              <p className="text-[14px] text-cream/90 leading-snug">
                What does <span className="text-goldbright">{syn.names.b}</span> need to feel loved?
                {" "}A Moon in <span className="text-goldbright">{np.b.moon.sign}</span> has a precise answer.
                <span className="text-gold/85"> ✦ Unlock {syn.names.b}&apos;s side.</span>
              </p>
            </div>
          )}
          {/* Dated-window countdown — the only honest urgency this brand can use. */}
          {timing.available && timing.nextInDays != null && (
            <div className="glass px-5 py-4 text-center border border-gold/25">
              <p className="text-[14.5px] text-cream leading-snug">
                <span className="text-gold" aria-hidden>✦ </span>
                {timing.nextInDays === 0
                  ? "A shared love window is open for you two right now."
                  : `Your next shared love window opens in ${timing.nextInDays} ${timing.nextInDays === 1 ? "day" : "days"}.`}
                {" "}<span className="text-haze/90">The exact dates — and the windows after it — are inside.</span>
              </p>
            </div>
          )}
          <PaywallGate
            blurb={t.pay.compat}
            next={next}
            manifest={manifest}
            manifestTitle={`Still sealed for ${syn.names.a} & ${syn.names.b} — ${sealedCount} cards`}
          />
        </>
      )}

      {unlocked && revealed >= total && syn.warnings.length > 0 && (
        <div className="text-xs text-gold/75 bg-gold/5 border border-gold/15 rounded-xl px-4 py-3">
          {syn.warnings.map((w, i) => (<p key={i}>✦ {w}</p>))}
        </div>
      )}
    </section>
  );
}

const FacedownCard = forwardRef<HTMLButtonElement, { hint: string; onReveal: () => void }>(
  function FacedownCard({ hint, onReveal }, ref) {
    const t = useT();
    return (
      <button
        ref={ref}
        onClick={onReveal}
        className="facedown glass w-full p-9 sm:p-11 text-center group cursor-pointer transition-transform duration-500 hover:scale-[1.012] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--c-ink))]"
      >
        <div className="text-4xl gold-text" style={{ fontFamily: GLYPH_FONT, textShadow: "0 1px 0 rgba(255,255,255,0.12), 0 -1px 1px rgba(0,0,0,0.5)" }}>✦</div>
        <div className="mt-2 text-[11px] uppercase tracking-[0.24em] text-haze/85">{t.compat.tapToReveal}</div>
        <div className="font-display text-xl text-cream mt-1 capitalize">{hint}</div>
      </button>
    );
  }
);

// ───────────────────────── individual cards ─────────────────────────

/** Big-three echo: proof-of-computation on the FIRST card. She gave her birth
 *  minute; the very first thing she reads back must speak her chart's language
 *  (☉ ☾ ↑ by name) — or the whole "real ephemeris" claim stays invisible. */
function BigThreeStrip({ a, b, names }: { a: ChartFacts; b: ChartFacts; names: { a: string; b: string } }) {
  const { palette: pal } = useTheme();
  const big = (c: ChartFacts) => {
    const sun = c.planets.find((p) => p.body === "Sun");
    const moon = c.planets.find((p) => p.body === "Moon");
    return { sun: sun?.sign, moon: moon?.sign, asc: c.asc?.sign ?? null };
  };
  const A = big(a), B = big(b);
  const Person = ({ name, t3, color }: { name: string; t3: ReturnType<typeof big>; color: string }) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span style={{ color }}>{name}</span>
      <span className="text-haze/90" style={{ fontFamily: GLYPH_FONT }}>☉</span><span className="text-cream/90">{t3.sun}</span>
      <span className="text-haze/90" style={{ fontFamily: GLYPH_FONT }}>☾</span><span className="text-cream/90">{t3.moon}</span>
      {t3.asc && (<><span className="text-haze/90">↑</span><span className="text-cream/90">{t3.asc}</span></>)}
    </span>
  );
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12.5px]">
      <Person name={names.a} t3={A} color={pal.personA} />
      <span className="text-gold" aria-hidden>✦</span>
      <Person name={names.b} t3={B} color={pal.personB} />
    </div>
  );
}

function ScoreCard({ syn, forms, range, charts, dirTease }: { syn: SynastryResult; forms: { a: BirthFormValues; b: BirthFormValues }; range: ScoreRange | null; charts: { a: ChartFacts; b: ChartFacts }; dirTease: DirectionalSplit | null }) {
  const { palette: pal } = useTheme();
  const t = useT();
  // Only surface the range when the unknown birth time actually moves the score.
  const showRange = range && range.spread >= 3;
  return (
    <div className="glass p-6 sm:p-8 text-center">
      <div className="stagger flex flex-col items-center">
        <div className="text-sm text-haze tracking-wide">
          <span style={{ color: pal.personA }}>{syn.names.a}</span>
          <span className="mx-2 text-gold">✦</span>
          <span style={{ color: pal.personB }}>{syn.names.b}</span>
        </div>
        <div className="mt-3"><ScoreGauge score={syn.score} /></div>
        {showRange && (
          <p className="text-[11px] text-gold/80 mt-1.5 tabular-nums">
            {fill(t.reading.scoreRange, { min: range!.min, max: range!.max })}
          </p>
        )}
        <h2 className="font-display text-3xl text-goldbright mt-3">{syn.band.label}</h2>
        <p className="text-cream/85 max-w-md mx-auto mt-2 text-[15px] leading-relaxed">{scoreMeaning(syn)}</p>
        <BigThreeStrip a={charts.a} b={charts.b} names={syn.names} />
        <TwoAxes ease={syn.axes.ease} intensity={syn.axes.intensity} />
        {/* Directional tease — computed, with the honest even branch. Locked only. */}
        {dirTease?.available && (
          <p className="text-[12.5px] text-gold/90 leading-snug max-w-md mx-auto mt-3">
            {dirTease.notablyUneven
              ? <>This bond isn&apos;t perfectly mutual — the pull runs stronger in one direction. 🔒 Which side, and what each of you feels that the other doesn&apos;t, is inside.</>
              : <>The charge here lands remarkably evenly — rarer than it sounds. 🔒 What each of you feels most is inside.</>}
          </p>
        )}
      </div>
      <ShareRow syn={syn} forms={forms} />
    </div>
  );
}

// The honest two-axis readout: which way the bond leans (ease) vs how much is
// going on (intensity). Kills the "a clashing couple scores higher" confusion.
function TwoAxes({ ease, intensity }: { ease: number; intensity: number }) {
  const { palette: pal } = useTheme();
  const t = useT();
  const Axis = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="text-left flex-1">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] uppercase tracking-wider text-haze/90">{label}</span>
        <span className="text-sm tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-cream/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color, transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
    </div>
  );
  return (
    <div className="w-full max-w-sm mx-auto mt-5">
      <div className="flex gap-4">
        <Axis label={t.reading.ease} value={ease} color={pal.aspect.harmonious} />
        <Axis label={t.reading.intensity} value={intensity} color={pal.personB} />
      </div>
      <p className="text-[11px] text-haze/70 leading-relaxed mt-2.5">{t.reading.axesExplain}</p>
    </div>
  );
}

// The AI-written, chart-grounded reading (the premium centerpiece). Falls back
// silently: if prose is null the card simply isn't rendered by the deck.
function ProseCard({ prose, loading }: { prose: CoupleProse | null; loading: boolean }) {
  const t = useT();
  return (
    <div className="glass p-6 sm:p-9 stagger">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80 text-center">{t.reading.proseTitle}</div>
      {loading && !prose ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-8 text-haze/80">
          <span className="text-2xl text-gold/60 animate-pulse" aria-hidden>✦</span>
          <p className="text-sm" aria-live="polite">{t.reading.proseWriting}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-5 max-w-2xl mx-auto">
          {prose?.sections.map((s) => (
            <div key={s.key}>
              <h4 className="font-display text-lg text-goldbright">{s.title}</h4>
              <p className="text-[15px] text-cream/90 leading-relaxed mt-1.5 whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// The composite chart — the relationship's OWN chart (midpoints of both people),
// not his-vs-hers. Its Sun/Moon/Venus describe the bond as a third thing, plus
// its tightest internal aspect. Fully deterministic (no API key needed).
function CompositeCard({ composite, names }: { composite: CompositeChart; names: { a: string; b: string } }) {
  const { palette: pal } = useTheme();
  const ELEMENT_COLOR: Record<string, string> = {
    fire: pal.aspect.tension, earth: pal.sub.commitment, air: pal.aspect.harmonious, water: pal.personB,
  };
  const Placement = ({ glyph, role, p }: { glyph: string; role: string; p: CompositeChart["core"] }) =>
    p ? (
      <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-4 text-center">
        <div className="text-2xl" style={{ fontFamily: GLYPH_FONT, color: ELEMENT_COLOR[p.element] ?? pal.aspect.blending }}>{glyph}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-haze/80 mt-1">{role}</div>
        <div className="font-display text-lg text-cream mt-0.5">{p.sign}</div>
        <div className="text-[10px] uppercase tracking-wider text-haze/55">{p.element}</div>
      </div>
    ) : null;
  return (
    <div className="glass p-6 sm:p-8 stagger">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80 text-center">Your relationship chart</div>
      <h3 className="font-display text-2xl text-cream text-center mt-1 mb-1">The two of you as one chart</h3>
      <p className="text-xs text-haze/80 text-center mb-5 max-w-lg mx-auto leading-relaxed">
        Not {names.a}&apos;s chart or {names.b}&apos;s — the <span className="text-cream/90">composite</span>: a single chart built from the midpoint of your two, describing the bond itself as a third being.
      </p>
      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
        <Placement glyph="☉" role="Its purpose" p={composite.core} />
        <Placement glyph="☾" role="Its heart" p={composite.heart} />
        <Placement glyph="♀" role="How it loves" p={composite.love} />
      </div>
      {composite.summary && (
        <p className="text-[14px] text-cream/90 leading-relaxed text-center max-w-lg mx-auto mt-5">{composite.summary}</p>
      )}
      {composite.strongest && (
        <div className="mt-5 max-w-xl mx-auto rounded-2xl border border-gold/15 bg-gold/[0.04] px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold/80 text-center">{composite.strongest.headline}</div>
          <div className="mt-3 space-y-2.5">
            {composite.strongest.sections.map((s, i) => (
              <div key={i}>
                <div className="text-[10px] uppercase tracking-[0.16em] text-goldbright/90">{s.kicker}</div>
                <p className="text-[13.5px] text-cream/90 leading-snug mt-0.5">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-haze/55 tabular-nums text-center mt-3">{composite.strongest.proof}</p>
        </div>
      )}
    </div>
  );
}

function ArchetypeCard({ reading, teasers = [] }: { reading: ArchetypeReading; teasers?: string[] }) {
  const { palette: pal } = useTheme();
  const t = useT();
  const a = reading.anchor;
  const aMeta = a ? BODIES.find((x) => x.key === a.aBody) : null;
  const bMeta = a ? BODIES.find((x) => x.key === a.bBody) : null;
  const vc = a ? pal.aspect[a.valence] : pal.personA;
  return (
    <div className="glass p-6 sm:p-8 text-center stagger">
      <div className="text-[10px] uppercase tracking-[0.34em] text-gold/80">{t.compat.youTwoAre}</div>
      <h3 className="font-display text-5xl sm:text-6xl tracking-[-0.02em] leading-[0.98] name-reveal mt-2 pb-1">{reading.name}</h3>
      <p className="text-haze/80 text-sm max-w-md mx-auto mt-2 italic">{reading.definition}</p>
      <p className="text-cream/90 text-[15px] max-w-lg mx-auto mt-4 leading-relaxed">{reading.blurb}</p>

      <div className="grid sm:grid-cols-2 gap-3 mt-6 max-w-2xl mx-auto text-left">
        <div className="rounded-2xl bg-gold/[0.06] border border-gold/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-gold/90 flex items-center gap-1.5"><span aria-hidden>✦</span>{t.compat.leanInto}</div>
          <div className="text-sm text-cream/90 mt-1.5 leading-snug">{reading.leanInto}</div>
        </div>
        <div className="rounded-2xl bg-cream/[0.03] border border-cream/10 p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-haze/90 flex items-center gap-1.5"><span aria-hidden>☾</span>{t.compat.gentlyWatch}</div>
          <div className="text-sm text-cream/90 mt-1.5 leading-snug">{reading.watch}</div>
        </div>
      </div>

      <div className="mt-6 max-w-2xl mx-auto rounded-2xl border border-gold/15 bg-gold/[0.04] px-4 py-4">
        <div className="text-[10px] uppercase tracking-[0.24em] text-gold/80 text-center">{t.compat.whyThisType}</div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-cream/90">{reading.topFacet.label}</span>
            <span className="tabular-nums text-goldbright">{reading.topFacet.value}<span className="text-haze/55 text-xs"> / 100</span></span>
            <span className="text-[10px] uppercase tracking-wider text-haze/70">{t.compat.strongest}</span>
          </span>
          <span className="inline-flex items-center gap-2 text-haze/85 tabular-nums">
            <span style={{ color: pal.aspect.harmonious }}>{fill(t.compat.easyCount, { n: reading.flowCount })}</span>
            <span className="text-haze/40">·</span>
            <span style={{ color: pal.aspect.tension }}>{fill(t.compat.growthCount, { n: reading.growCount })}</span>
          </span>
        </div>

        <p className="text-[11px] text-haze/70 leading-relaxed mt-3 text-center max-w-lg mx-auto">
          Flowing contacts (trines and sextiles) come naturally; growth contacts (squares and oppositions)
          take effort and deepen you. Weighted by how exact each one is, your bond carries
          {" "}<span className="tabular-nums" style={{ color: pal.aspect.harmonious }}>{reading.flowPoints}</span> flowing
          {" "}to <span className="tabular-nums" style={{ color: pal.aspect.tension }}>{reading.growPoints}</span> growth points,
          so it leans {reading.tilt === "harmonious" ? "toward ease" : "toward growth"}.
        </p>

        {a && (() => {
          const af = contactFacts(a);
          const tier: Record<string, string> = { exact: "near-exact", tight: "tight", moderate: "moderate", wide: "wide" };
          return (
          <div className="mt-4 pt-4 border-t border-cream/10 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-haze/60 mb-2">The contact that anchors it</div>
            <div className="flex items-center justify-center gap-2 text-2xl" style={{ fontFamily: GLYPH_FONT }}>
              <span style={{ color: pal.personA }}>{aMeta?.glyph ?? "↑"}</span>
              <span style={{ color: vc, fontSize: "0.8em" }}>{ASPECT_GLYPH[a.aspect]}</span>
              <span style={{ color: pal.personB }}>{bMeta?.glyph ?? "↑"}</span>
            </div>
            <p className="text-[13px] text-cream/90 mt-2 leading-snug">{a.headline}</p>
            {/* Technical taste — the deterministic facts, free tier. The full
                breakdown (geometry, dignity, meaning) lives in the unlocked deck. */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[9.5px] uppercase tracking-wider font-medium">
              <span className="px-2 py-0.5 rounded-full" style={{ background: `${vc}22`, color: vc }}>{tier[af.orbTier]}, {a.orb.toFixed(1)}°</span>
              {af.sharedElement && <span className="px-2 py-0.5 rounded-full bg-cream/[0.06] text-haze/85">{af.sharedElement} {a.aspect}</span>}
              {af.mutualReception && <span className="px-2 py-0.5 rounded-full bg-gold/15 text-goldbright border border-gold/30">✦ mutual reception</span>}
            </div>
            {af.mutualReception && (
              <p className="text-[11.5px] text-goldbright/90 mt-2 leading-snug max-w-md mx-auto">
                A rare mutual reception: {a.aBody} sits in {af.aSign} ({a.bBody}&apos;s sign) while {a.bBody} sits in {af.bSign} ({a.aBody}&apos;s sign) — each planet in the other&apos;s home, mutually strengthening.
              </p>
            )}
            <p className="text-[12px] text-haze/85 mt-1 leading-snug max-w-md mx-auto">{a.why}</p>
            {(BODY_ROLE[a.aBody] || BODY_ROLE[a.bBody]) && (
              <p className="text-[11px] text-haze/65 mt-2 leading-snug max-w-md mx-auto">
                <span className="text-cream/75">{a.aBody}</span> is {BODY_ROLE[a.aBody] ?? "a key point"};
                {" "}<span className="text-cream/75">{a.bBody}</span> is {BODY_ROLE[a.bBody] ?? "a key point"}.
                {" "}{cap(a.aspect)}: {ASPECT_MEANING[a.aspect] ?? "a notable angle"}.
              </p>
            )}
            {/* The proof IS the product — display layer, not fine print. */}
            <p className="text-[12px] text-gold/80 mt-2.5 tabular-nums">{a.proof}</p>
          </div>
          );
        })()}
      </div>

      {/* Conditional, computed teases (locked only): the Moon-language line and,
          when the geometry exists, the destiny-line detection. */}
      {teasers.length > 0 && (
        <div className="mt-5 max-w-xl mx-auto space-y-2 text-left">
          {teasers.map((tz, i) => (
            <p key={i} className="text-[13px] text-goldbright/95 leading-snug rounded-xl border border-gold/20 bg-gold/[0.05] px-4 py-3">{tz}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// "What you each need" — the decode-them card. Nobody runs a couple check to
// learn about herself: this is the other person's manual, receipts attached.
function NeedsCard({ np }: { np: NeedsProfile }) {
  const { palette: pal } = useTheme();
  const Person = ({ p, accent }: { p: NeedsPerson; accent: string }) => (
    <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-4 text-left">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
        <h4 className="font-display text-lg text-cream">{p.name}</h4>
      </div>
      <div className="space-y-3.5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-haze/85 flex items-center gap-1.5">
            <span style={{ fontFamily: GLYPH_FONT }} className="text-goldbright text-sm">☾</span>
            To feel loved <span className="text-gold/70 tabular-nums normal-case tracking-normal">· {p.moon.proof}{p.moon.timeSensitive ? " (time-sensitive)" : ""}</span>
          </div>
          <p className="text-[13.5px] text-cream/90 leading-snug mt-1">{p.moon.needs}</p>
          <p className="text-[12px] text-haze/85 leading-snug mt-1.5"><span className="text-rose/85">The tell:</span> {p.moon.tell}</p>
          {p.moon.dignity && <p className="text-[11.5px] text-gold/80 leading-snug mt-1">☾ {p.moon.dignity}.</p>}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-haze/85 flex items-center gap-1.5">
            <span style={{ fontFamily: GLYPH_FONT }} className="text-goldbright text-sm">♀</span>
            How they love <span className="text-gold/70 tabular-nums normal-case tracking-normal">· {p.venus.proof}</span>
          </div>
          <p className="text-[13.5px] text-cream/90 leading-snug mt-1">{p.venus.gives}</p>
          <p className="text-[12px] text-haze/85 leading-snug mt-1.5"><span className="text-goldbright/90">Craves:</span> {p.venus.craves}</p>
          {p.venus.dignity && <p className="text-[11.5px] text-gold/80 leading-snug mt-1">♀ {p.venus.dignity}.</p>}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-haze/85 flex items-center gap-1.5">
            <span style={{ fontFamily: GLYPH_FONT }} className="text-goldbright text-sm">♂</span>
            The spark <span className="text-gold/70 tabular-nums normal-case tracking-normal">· {p.mars.proof}</span>
          </div>
          <p className="text-[13.5px] text-cream/90 leading-snug mt-1">{p.mars.spark}</p>
        </div>
      </div>
    </div>
  );
  return (
    <div className="glass p-6 sm:p-8 stagger">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80 text-center">The decoder</div>
      <h3 className="font-display text-2xl text-cream text-center mt-1 mb-1">What you each need</h3>
      <p className="text-xs text-haze/80 text-center mb-5 max-w-lg mx-auto leading-relaxed">
        Not guesses — read from each Moon (what safety means), Venus (how love is given and what it craves back) and Mars (how desire moves). Exact degrees attached.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {np.a && <Person p={np.a} accent={pal.personA} />}
        {np.b && <Person p={np.b} accent={pal.personB} />}
      </div>
    </div>
  );
}

// The Moon match — "Sun signs flirt. Moon signs decide who stays."
function MoonMatchCard({ mm, names }: { mm: MoonMatch; names: { a: string; b: string } }) {
  const { palette: pal } = useTheme();
  const vc = mm.valence ? pal.aspect[mm.valence] : pal.aspect.blending;
  return (
    <div className="glass p-6 sm:p-8 stagger text-center">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80">Your Moon match</div>
      <div className="mt-3 flex items-center justify-center gap-3 text-3xl" style={{ fontFamily: GLYPH_FONT }}>
        <span style={{ color: pal.personA }}>☾</span>
        <span className="text-cream/60 text-base">{mm.aSign} × {mm.bSign}</span>
        <span style={{ color: pal.personB }}>☾</span>
      </div>
      <p className="text-[11px] text-haze/75 mt-1">Sun signs flirt. Moon signs decide who stays.</p>
      <div className="mt-5 max-w-xl mx-auto text-left space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-goldbright/90 mb-1">How you each read safety</div>
          <p className="text-[14px] text-cream/90 leading-relaxed">{mm.elementRead}</p>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: vc }}>
            The angle between your Moons{mm.aspect !== "none" ? ` — ${mm.aspect}` : ""}
          </div>
          <p className="text-[14px] text-cream/90 leading-relaxed">{mm.aspectRead}</p>
        </div>
      </div>
      <p className="text-[11.5px] text-gold/75 tabular-nums mt-4">{mm.proof}{mm.timeSensitive ? " · time-sensitive (birth time unknown)" : ""}</p>
    </div>
  );
}

// "Why it runs hot and cold" — the highest-scored feature in the audit: names
// the exact withholding geometry and what actually reassures.
function HotColdCard({ hc }: { hc: HotCold }) {
  const { palette: pal } = useTheme();
  return (
    <div className="glass overflow-hidden stagger">
      <div className="px-6 sm:px-8 pt-6 pb-5 text-center border-b border-cream/10" style={{ background: `linear-gradient(150deg, ${pal.aspect.tension}14, transparent 60%)` }}>
        <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80">Why it runs hot and cold</div>
        <h3 className="font-display text-2xl text-cream mt-2">{hc.signature}</h3>
        <p className="text-[13px] text-haze/90 mt-1.5">{hc.headline}</p>
      </div>
      <div className="px-6 sm:px-8 py-4 border-b border-cream/[0.06]">
        <div className="text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: pal.aspect.tension }}>What the pull-back actually is</div>
        <p className="text-[14.5px] text-cream/90 leading-relaxed">{hc.what}</p>
      </div>
      <div className="px-6 sm:px-8 py-4 border-b border-cream/[0.06]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-goldbright mb-1.5">What actually reassures</div>
        <p className="text-[14.5px] text-cream/90 leading-relaxed">{hc.reassure}</p>
      </div>
      <p className="px-6 sm:px-8 py-3 text-[11.5px] text-gold/75 tabular-nums overflow-x-auto whitespace-nowrap">
        {hc.proof}{hc.timeSensitive ? " · time-sensitive (birth time unknown)" : ""}
      </p>
    </div>
  );
}

// "Does he feel it too?" — directional synastry, with the honest even branch.
function DirectionalCard({ dir, names }: { dir: DirectionalSplit; names: { a: string; b: string } }) {
  const { palette: pal } = useTheme();
  const Side = ({ name, side, color }: { name: string; side: DirectionalSide; color: string }) => (
    <div className="text-left flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] uppercase tracking-wider text-haze/90">{name} feels</span>
        <span className="text-sm tabular-nums" style={{ color }}>{side.share}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-cream/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${side.share}%`, background: color, transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
      {side.strongest && (
        <p className="text-[11.5px] text-haze/85 leading-snug mt-2">Feels most: <span className="text-cream/90">{side.strongest.headline}</span></p>
      )}
    </div>
  );
  return (
    <div className="glass p-6 sm:p-8 stagger text-center">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80">Who feels it more</div>
      <h3 className="font-display text-2xl text-cream mt-1 mb-1">Compatibility isn&apos;t symmetric</h3>
      <p className="text-xs text-haze/80 mb-5 max-w-lg mx-auto leading-relaxed">
        Every contact lands hardest on whoever&apos;s personal planet is in it. Re-weighing all of yours by who receives them shows which side of this bond carries more of the charge.
      </p>
      <div className="flex gap-6 max-w-xl mx-auto">
        <Side name={names.a} side={dir.a} color={pal.personA} />
        <Side name={names.b} side={dir.b} color={pal.personB} />
      </div>
      <p className="text-[14px] text-cream/90 leading-relaxed max-w-lg mx-auto mt-5">{dir.line}</p>
    </div>
  );
}

// "Fate or rerun?" — node-axis contacts, the destiny conversation with a degree.
function NodeContactsCard({ nc }: { nc: NodeContacts }) {
  return (
    <div className="glass p-6 sm:p-8 stagger">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80 text-center">Fate or rerun?</div>
      <h3 className="font-display text-2xl text-cream text-center mt-1 mb-1">Your destiny-line contacts</h3>
      <p className="text-xs text-haze/80 text-center mb-5 max-w-lg mx-auto leading-relaxed">
        The lunar nodes are your chart&apos;s past-and-future axis. A planet landing on one is the classical &ldquo;why does this feel fated&rdquo; signature — ☊ pulls you forward, ☋ feels instantly familiar. These are TRUE nodes, computed to the arcminute.
      </p>
      <div className="space-y-3.5 max-w-xl mx-auto">
        {nc.contacts.map((c, i) => (
          <div key={i} className={`rounded-2xl border p-4 ${c.node === "north" ? "border-gold/25 bg-gold/[0.05]" : "border-cream/12 bg-cream/[0.03]"}`}>
            <div className="flex items-center gap-2">
              <span className="text-goldbright text-lg" style={{ fontFamily: GLYPH_FONT }} aria-hidden>{c.node === "north" ? "☊" : "☋"}</span>
              <h4 className="text-[14.5px] text-cream font-medium leading-snug">{c.headline}</h4>
            </div>
            <p className="text-[13.5px] text-cream/90 leading-relaxed mt-2">{c.read}</p>
            <p className="text-[11.5px] text-gold/75 tabular-nums mt-2">{c.proof}{c.timeSensitive ? " · time-sensitive" : ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// "Your year together" — the dated shared windows (couple timing).
function CoupleTimingCard({ timing }: { timing: CoupleTiming }) {
  const badge = (w: CoupleTiming["windows"][number]) =>
    w.kind === "shared"
      ? { label: "both charts", cls: "bg-gold/15 text-goldbright border border-gold/30" }
      : { label: w.label, cls: "bg-cream/[0.06] text-haze" };
  const fmtRange = (s: string, e: string) => {
    const d = (x: string) => new Date(x + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return s === e ? d(s) : `${d(s)} – ${d(e)}`;
  };
  return (
    <div className="glass p-6 sm:p-7 stagger">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80 text-center">Your year together</div>
      <h3 className="font-display text-2xl text-cream text-center mt-1 mb-1">The windows, dated</h3>
      <p className="text-xs text-haze/80 text-center mb-5 max-w-lg mx-auto leading-relaxed">
        Real transits over the next twelve months — stretches where the moving sky supports this bond. Windows, never guarantees; plan the good conversations and the trips inside them.
      </p>
      {!timing.available ? (
        <p className="text-sm text-haze/85 text-center">{timing.note}</p>
      ) : (
        <ul className="space-y-2.5">
          {timing.windows.map((w, i) => (
            <li key={i} className="rounded-xl border border-cream/10 bg-cream/[0.03] px-4 py-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] tabular-nums text-goldbright">{fmtRange(w.start, w.end)}</span>
                <span className={`text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-full ${badge(w).cls}`}>{badge(w).label}</span>
              </div>
              <p className="text-[13.5px] text-cream/90 leading-snug mt-1">{w.headline}</p>
              <p className="text-[11.5px] text-haze/80 leading-snug mt-0.5">{w.blurb}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ThreadCard({ thread, names }: { thread: Thread; names: { a: string; b: string } }) {
  const { palette: pal } = useTheme();
  const t = useT();
  const { aspect: a } = thread;
  const aMeta = BODIES.find((x) => x.key === a.aBody);
  const bMeta = BODIES.find((x) => x.key === a.bBody);
  const vc = pal.aspect[a.valence];
  // Deterministic technical depth (mutual reception, element, modality, orb
  // tier) — computed, never guessed, and fully available with no API key.
  const facts = contactFacts(a);
  const sections = enrichSections(a, names);
  const tierLabel: Record<string, string> = { exact: "near-exact", tight: "tight", moderate: "moderate", wide: "wide" };
  const kickerColor = (kind: string) => (kind === "dignity" ? pal.aspect.blending : kind === "watch" ? pal.aspect.tension : pal.gauge.from);

  return (
    <div className="glass overflow-hidden stagger">
      <div className="px-6 sm:px-8 pt-6 pb-5 text-center border-b border-cream/10">
        <div className="text-[10px] uppercase tracking-[0.34em] text-gold/80">{t.compat.strongestThread}</div>
        <div className="mt-3 flex items-center justify-center gap-3 text-4xl" style={{ fontFamily: GLYPH_FONT }}>
          <span className="planet-pop" style={{ color: pal.personA, animationDelay: "0s" }}>{aMeta?.glyph ?? "↑"}</span>
          <span className="planet-pop" style={{ color: vc, fontSize: "0.8em", animationDelay: "0.12s", filter: `drop-shadow(0 0 6px ${vc})` }}>{ASPECT_GLYPH[a.aspect]}</span>
          <span className="planet-pop" style={{ color: pal.personB, animationDelay: "0.24s" }}>{bMeta?.glyph ?? "↑"}</span>
        </div>
        <p className="font-display text-xl sm:text-2xl text-cream max-w-md mx-auto mt-4">{a.headline}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase tracking-wider font-medium">
          <span className="px-2.5 py-1 rounded-full" style={{ background: `${vc}22`, color: vc }}>{tierLabel[facts.orbTier]}, {a.orb.toFixed(1)}°</span>
          {facts.sharedElement && (
            <span className="px-2.5 py-1 rounded-full bg-cream/[0.06] text-haze">{facts.sharedElement} {a.aspect}</span>
          )}
          {facts.mutualReception && (
            <span className="px-2.5 py-1 rounded-full bg-gold/15 text-goldbright border border-gold/30">✦ mutual reception</span>
          )}
        </div>
      </div>

      {sections.map((s) => (
        <div
          key={s.kind}
          className="px-6 sm:px-8 py-4 border-b border-cream/[0.06] text-left"
          style={s.spotlight ? { background: `linear-gradient(120deg, ${pal.aspect.tension}14, transparent 70%)` } : undefined}
        >
          <div className="text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: kickerColor(s.kind) }}>{s.kicker}</div>
          <p className="text-[14.5px] text-cream/90 leading-relaxed">{s.body}</p>
        </div>
      ))}

      <p className="px-6 sm:px-8 py-3 text-[11px] text-haze/60 tabular-nums leading-relaxed overflow-x-auto whitespace-nowrap">{a.proof}</p>
    </div>
  );
}

function DimensionsCard({ syn, reads }: { syn: SynastryResult; reads: SubscoreRead }) {
  const { palette: pal } = useTheme();
  const t = useT();
  const s = syn.subscores;
  return (
    <div className="glass p-6 sm:p-8 stagger">
      <h3 className="font-display text-xl text-cream text-center">{t.compat.fiveDimensions}</h3>
      <p className="text-sm text-haze text-center mt-1">{dimensionsLead(reads)}</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 max-w-3xl mx-auto">
        <SubBar label="Emotional" value={s.emotional} color={pal.sub.emotional} index={0} highlight={reads.strong.key === "emotional"} />
        <SubBar label="Attraction" value={s.attraction} color={pal.sub.attraction} index={1} highlight={reads.strong.key === "attraction"} />
        <SubBar label="Affection" value={s.affection} color={pal.sub.affection} index={2} highlight={reads.strong.key === "affection"} />
        <SubBar label="Communication" value={s.communication} color={pal.sub.communication} index={3} highlight={reads.strong.key === "communication"} />
        <SubBar label="Commitment" value={s.commitment} color={pal.sub.commitment} index={4} highlight={reads.strong.key === "commitment"} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-6 max-w-3xl mx-auto">
        <ReadBox tone="strong" label={`${t.compat.strongestLabel}, ${reads.strong.label} (${reads.strong.value})`} line={reads.strong.line} />
        <ReadBox tone="tender" label={`${t.compat.tenderestLabel}, ${reads.tender.label} (${reads.tender.value})`} line={reads.tender.line} />
      </div>
    </div>
  );
}

function ReadBox({ tone, label, line }: { tone: "strong" | "tender"; label: string; line: string }) {
  const strong = tone === "strong";
  return (
    <div className={`rounded-2xl border p-4 text-left ${strong ? "bg-gold/[0.06] border-gold/20" : "bg-cream/[0.03] border-cream/10"}`}>
      <div className={`text-[11px] uppercase tracking-[0.16em] ${strong ? "text-gold/90" : "text-haze/90"}`}>{label}</div>
      <div className="text-sm text-cream/90 mt-1.5 leading-snug">{line}</div>
    </div>
  );
}

function TendCard({ syn }: { syn: SynastryResult }) {
  const t = useT();
  const items: TendItem[] = tendToList(syn);
  return (
    <div className="glass p-6 sm:p-8 stagger">
      <h3 className="font-display text-xl text-cream text-center">{t.compat.tendTitle}</h3>
      <p className="text-xs text-haze text-center mt-1 mb-5">{t.compat.tendSub}</p>
      <ul className="space-y-3.5 max-w-2xl mx-auto">
        {items.map((it, i) => (
          <li key={i} className="rounded-2xl bg-cream/[0.03] border border-cream/10 p-4">
            <div className="text-cream font-medium leading-snug">{it.fact}</div>
            <div className="text-sm text-haze/90 mt-1 leading-snug">{it.why}</div>
            <div className="text-sm text-gold/90 mt-2 flex items-start gap-2">
              <span aria-hidden>✦</span><span>{it.doThis}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlowGrowCard({ syn }: { syn: SynastryResult }) {
  const t = useT();
  const story = flowGrowStory(syn, 3);
  const [showAll, setShowAll] = useState(false);
  const flow = showAll ? story.allFlow.filter((a) => !isOuter(a)) : story.topFlow;
  const grow = showAll ? story.allGrow.filter((a) => !isOuter(a)) : story.topGrow;
  const more = story.flowCount + story.growCount;
  return (
    <div className="glass p-6 sm:p-8">
      <h3 className="font-display text-xl text-cream text-center">{t.compat.flowGrowTitle}</h3>
      <p className="text-xs text-haze text-center mt-1 mb-5">{t.compat.flowGrowSub}</p>
      <div className="grid lg:grid-cols-2 gap-6">
        <AspectGroup title={t.compat.whereFlow} subtitle={t.compat.whereFlowSub} items={flow} count={story.flowCount} accent="harmonious" />
        <AspectGroup title={t.compat.whereGrow} subtitle={t.compat.whereGrowSub} items={grow} count={story.growCount} accent="tension" />
      </div>

      {story.gen.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {story.gen.map((g) => (
            <span key={g.planet} className="text-[11px] text-haze/85 rounded-full border border-cream/10 bg-cream/[0.03] px-3 py-1.5">
              {fill(t.compat.plusStreak, { planet: g.planet, count: g.count, contacts: g.count === 1 ? "contact" : "contacts", meaning: g.meaning })}
            </span>
          ))}
        </div>
      )}

      {(story.flowCount > 3 || story.growCount > 3) && (
        <div className="text-center mt-5">
          <button onClick={() => setShowAll((s) => !s)} className="text-xs uppercase tracking-[0.18em] text-gold/80 hover:text-gold underline underline-offset-4">
            {showAll ? t.compat.showLess : fill(t.compat.seeAll, { n: more })}
          </button>
        </div>
      )}
    </div>
  );
}

const isOuter = (a: SynAspect) => ["Uranus", "Neptune", "Pluto"].includes(a.aBody) || ["Uranus", "Neptune", "Pluto"].includes(a.bBody);

function AspectGroup({ title, subtitle, items, count, accent }: { title: string; subtitle: string; items: SynAspect[]; count: number; accent: "harmonious" | "tension" }) {
  const { palette: pal } = useTheme();
  const t = useT();
  const c = pal.aspect[accent];
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-4 h-[2px] rounded" style={{ background: c }} />
        <h4 className="text-sm uppercase tracking-[0.14em] text-cream">{title}</h4>
        <span className="text-xs tabular-nums px-2 py-0.5 rounded-full" style={{ background: `${c}22`, color: c }}>{count}</span>
      </div>
      <p className="text-[11px] text-haze/85 mb-3">{subtitle}</p>
      {items.length === 0 ? (
        <p className="text-sm text-haze/70 italic">{t.compat.noneNormal}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((asp, i) => (<AspectRow key={i} asp={asp} />))}
        </ul>
      )}
    </div>
  );
}

function AspectRow({ asp }: { asp: SynAspect }) {
  const { palette: pal } = useTheme();
  const aMeta = BODIES.find((x) => x.key === asp.aBody);
  const bMeta = BODIES.find((x) => x.key === asp.bBody);
  const vc = pal.aspect[asp.valence];
  return (
    <li className="flex items-start gap-3 rounded-xl bg-cream/[0.03] border border-cream/10 px-3 py-2.5">
      <span className="mt-0.5 inline-flex items-center gap-1 shrink-0" style={{ fontFamily: GLYPH_FONT }}>
        <span style={{ color: pal.personA }}>{aMeta?.glyph ?? "↑"}</span>
        <span style={{ color: vc, fontSize: "0.85em" }}>{ASPECT_GLYPH[asp.aspect]}</span>
        <span style={{ color: pal.personB }}>{bMeta?.glyph ?? "↑"}</span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] text-cream/90 leading-snug">{asp.headline}</span>
        <span className="block text-[11px] text-haze/80 leading-snug mt-0.5">{asp.why}</span>
        <span className="block text-[10px] text-haze/55 leading-snug mt-1 tabular-nums">{asp.proof}</span>
      </span>
      <span className="text-xs tabular-nums shrink-0" style={{ color: vc }}>+{asp.points.toFixed(1)}</span>
    </li>
  );
}

function WheelCard({ a, b, syn }: { a: ChartFacts; b: ChartFacts; syn: SynastryResult }) {
  const { palette: pal } = useTheme();
  const t = useT();
  return (
    <div className="glass p-5 sm:p-6">
      <h3 className="font-display text-xl text-cream text-center mb-3">{t.compat.wheelTitle}</h3>
      <div className="aspect-square max-w-[560px] mx-auto">
        <SynastryWheel chartA={a} chartB={b} syn={syn} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-3 text-[11px] text-haze">
        <Legend c={pal.personA} t={`${syn.names.a} (${t.compat.inner})`} dot />
        <Legend c={pal.personB} t={`${syn.names.b} (${t.compat.outer})`} dot />
        <Legend c={pal.aspect.harmonious} t={t.compat.harmonious} />
        <Legend c={pal.aspect.tension} t={t.compat.challenging} />
        <Legend c={pal.aspect.blending} t={t.compat.conjunction} />
      </div>
    </div>
  );
}

function BringsCard({ syn }: { syn: SynastryResult }) {
  const { palette: pal } = useTheme();
  const t = useT();
  const aBrings = syn.overlays.filter((o) => o.from === "A");
  const bBrings = syn.overlays.filter((o) => o.from === "B");
  return (
    <div className="glass p-6 sm:p-8">
      <h3 className="font-display text-xl text-cream text-center mb-1">{t.compat.bringsTitle}</h3>
      <p className="text-xs text-haze text-center mb-5">{t.compat.bringsSub}</p>
      <div className="grid sm:grid-cols-2 gap-5">
        <BringCol name={syn.names.a} accent={pal.personA} items={aBrings} />
        <BringCol name={syn.names.b} accent={pal.personB} items={bBrings} />
      </div>
    </div>
  );
}

function BringCol({ name, accent, items }: { name: string; accent: string; items: SynOverlay[] }) {
  const t = useT();
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
        <h4 className="font-display text-lg text-cream">{name} {t.compat.brings}</h4>
      </div>
      <p className="text-sm text-cream/85 mb-3">{bringsLead(name, items)}</p>
      {items.length === 0 ? (
        <p className="text-sm text-haze/70 italic">{t.compat.noOverlays}</p>
      ) : (
        <ul className="space-y-2 text-sm text-cream/85">
          {items.map((o, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gold shrink-0">+{o.bonus}</span>
              <span>{o.sentence}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ShineCard({ reads }: { reads: SubscoreRead }) {
  const t = useT();
  return (
    <div className="glass p-6 sm:p-8 text-center stagger">
      <h3 className="font-display text-xl text-cream">{t.compat.shineTitle}</h3>
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left mt-5">
        <div className="rounded-2xl bg-gold/[0.06] border border-gold/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-gold/90">{t.compat.youShine}</div>
          <div className="text-cream mt-1.5 leading-snug">
            <span className="text-goldbright">{reads.strong.label}, {reads.strong.value}.</span> {reads.strong.line}
          </div>
        </div>
        <div className="rounded-2xl bg-cream/[0.03] border border-cream/10 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-haze/90">{t.compat.oneToTend}</div>
          <div className="text-cream/90 mt-1.5 leading-snug">
            <span className="text-cream">{reads.tender.label}, {reads.tender.value}.</span> {reads.tender.line}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── share ─────────────────────────
function ShareRow({ syn, forms }: { syn: SynastryResult; forms: { a: BirthFormValues; b: BirthFormValues } }) {
  const t = useT();
  const [copied, setCopied] = useState<string | null>(null);
  // Prefer the PII-safe encrypted link (?s=). It's minted server-side, so we
  // fetch it once; until it arrives (or if it fails), fall back to the legacy
  // cleartext ?r= link so sharing never breaks.
  const [shareLink, setShareLink] = useState<string>("");
  const card = buildShareCard(syn);
  const caps = buildCaptions(syn);

  const legacyLink = () => {
    if (typeof window === "undefined") return "https://astro-love.app/";
    const base = window.location.origin;
    try { return `${base}/?r=${encodeReading(forms.a, forms.b)}`; } catch { return `${base}/`; }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = encodeReading(forms.a, forms.b);
        const res = await fetch("/api/share/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ r }),
        });
        const d = await res.json();
        if (!cancelled && d?.s) setShareLink(`${window.location.origin}/?s=${encodeURIComponent(d.s)}`);
      } catch { /* keep the legacy fallback */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(forms)]);

  const link = () => shareLink || legacyLink();
  const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const text = caps.story;

  const channels = [
    { key: "telegram", label: "Telegram", on: () => open(`https://t.me/share/url?url=${encodeURIComponent(link())}&text=${encodeURIComponent(text)}`) },
    { key: "whatsapp", label: "WhatsApp", on: () => open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link()}`)}`) },
    { key: "x", label: "X", on: () => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link())}`) },
    { key: "vk", label: "VK", on: () => open(`https://vk.com/share.php?url=${encodeURIComponent(link())}`) },
  ];

  const copy = async (what: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(what); setTimeout(() => setCopied(null), 1600); } catch { /* ignore */ }
  };

  const saveImage = () => {
    const canvas = drawShareCanvas(card);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean; share?: (d: unknown) => Promise<void> };
      const file = new File([blob], "astro-love.png", { type: "image/png" });
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        nav.share({ files: [file], text: caps.oneLiner }).catch(() => { /* user cancelled */ });
        return;
      }
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement("a");
      aEl.href = url; aEl.download = "astro-love.png"; aEl.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="mt-7">
      <div className="text-[10px] uppercase tracking-[0.24em] text-haze/85 mb-2.5">{t.compat.share.title}</div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {channels.map((ch) => (<Chip key={ch.key} onClick={ch.on}>{ch.label}</Chip>))}
        <Chip onClick={() => copy("link", link())}>{copied === "link" ? t.compat.share.copied : t.compat.share.copyLink}</Chip>
        <Chip onClick={() => copy("caption", caps.story)}>{copied === "caption" ? t.compat.share.copied : t.compat.share.copyCaption}</Chip>
        <Chip onClick={saveImage}>{t.compat.share.saveImage}</Chip>
      </div>
    </div>
  );
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-xs rounded-full px-3.5 py-1.5 border border-gold/25 bg-gold/[0.06] text-cream/90 hover:border-gold/55 hover:bg-gold/[0.12] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      {children}
    </button>
  );
}

// Offscreen portrait card (Stories size). Velvet palette baked in so the
// shared image looks the same everywhere; data comes only from buildShareCard.
function drawShareCanvas(card: ShareCard): HTMLCanvasElement {
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d")!;

  const bg = x.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2a0f1a"); bg.addColorStop(0.5, "#1c0a14"); bg.addColorStop(1, "#150812");
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.4, 680);
  glow.addColorStop(0, "rgba(190,46,80,0.38)"); glow.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = glow; x.fillRect(0, 0, W, H);

  const wrap = (text: string, cx: number, cy: number, maxW: number, lh: number) => {
    const words = text.split(" "); let line = ""; let y = cy;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (x.measureText(test).width > maxW && line) { x.fillText(line, cx, y); line = w; y += lh; }
      else line = test;
    }
    if (line) x.fillText(line, cx, y);
    return y;
  };

  x.textAlign = "center";
  x.fillStyle = "#e7ad94"; x.font = "600 34px Georgia, serif"; x.fillText("✦  ASTRO-LOVE  ✦", W / 2, 150);
  x.fillStyle = "#f4e0e3"; x.font = "italic 66px Georgia, serif"; x.fillText(card.title, W / 2, 300);
  x.fillStyle = "#f3c9b0"; x.font = "700 240px Georgia, serif"; x.fillText(card.scoreLine.split(" ")[0], W / 2, 640);
  x.fillStyle = "#c99aa6"; x.font = "500 38px Georgia, serif"; x.fillText(`/ 100   ·   ${card.bandLabel}`, W / 2, 712);
  x.fillStyle = "#f3c9b0"; x.font = "italic 74px Georgia, serif"; x.fillText(card.archetypeName, W / 2, 890);
  x.fillStyle = "#f4e0e3"; x.font = "400 38px Georgia, serif"; wrap(card.archetypeLine, W / 2, 962, 900, 50);
  x.fillStyle = "#c99aa6"; x.font = "400 34px Georgia, serif"; wrap(card.threadLine, W / 2, 1130, 920, 46);
  x.fillStyle = "#e7ad94"; x.font = "500 32px Georgia, serif"; x.fillText(card.footer, W / 2, 1288);
  return cv;
}

// ───────────────────────── shared bits ─────────────────────────
function SubBar({ label, value, color, index = 0, highlight }: { label: string; value: number; color: string; index?: number; highlight?: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 260 + index * 110);
    return () => clearTimeout(t);
  }, [value, index]);
  return (
    <div className="text-left">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] uppercase tracking-wider text-haze/90 flex items-center gap-1">
          {highlight && <span className="text-gold">✦</span>}{label}
        </span>
        <span className="text-sm tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className={`h-1.5 rounded-full bg-cream/10 overflow-hidden ${highlight ? "bar-glow ring-1 ring-gold/40" : ""}`}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${w}%`,
            background: `linear-gradient(90deg, ${color} 0%, ${color} 88%, rgba(255,240,230,0.6) 100%)`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
            transition: "width 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
    </div>
  );
}

function Legend({ c, t, dot }: { c: string; t: string; dot?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={dot ? "inline-block w-2.5 h-2.5 rounded-full" : "inline-block w-4 h-[2px] rounded"} style={{ background: c }} />
      {t}
    </span>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const { palette: pal } = useTheme();
  const r = 76;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(score); setOffset(circ * (1 - score / 100)); setDone(true); return; }
    const dur = 1600;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let raf = 0;
    const start = performance.now();
    const startTimer = setTimeout(() => {
      setOffset(circ * (1 - score / 100));
      const tick = (now: number) => {
        const p = Math.min(1, (now - start - 150) / dur);
        setShown(Math.round(score * ease(p)));
        if (p < 1) raf = requestAnimationFrame(tick); else setDone(true);
      };
      raf = requestAnimationFrame(tick);
    }, 150);
    return () => { clearTimeout(startTimer); cancelAnimationFrame(raf); };
  }, [score, circ]);

  return (
    <div className="relative" style={{ width: 180, height: 180 }} aria-label={`Compatibility score ${score} out of 100`}>
      {done && <span key="bloom" className="score-bloom" aria-hidden />}
      <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={pal.gauge.from} />
            <stop offset="55%" stopColor={pal.gauge.mid} />
            <stop offset="100%" stopColor={pal.gauge.to} />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={r} fill="none" style={{ stroke: "rgb(var(--c-cream) / 0.12)" }} strokeWidth="11" />
        <circle
          cx="90" cy="90" r={r} fill="none" stroke="url(#gauge)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl text-goldbright leading-none tabular-nums" aria-hidden style={{ textShadow: "0 0 18px rgb(var(--c-gold) / 0.35)" }}>{shown}</span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-haze mt-1">/ 100</span>
      </div>
    </div>
  );
}
