"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import BirthFields, { type BirthFormValues } from "./BirthFields";
import SynastryWheel from "./SynastryWheel";
import TopNav from "./TopNav";
import PaywallGate from "./Paywall";
import { useUnlocked } from "@/lib/entitlement";
import { useTheme } from "./ThemeProvider";
import { useT } from "./LocaleProvider";
import { fill } from "@/lib/i18n";
import { BODIES } from "@/lib/astro/zodiac";
import { computeChart } from "@/lib/astro/chart";
import { computeSynastry, type SynastryResult, type SynAspect, type SynOverlay } from "@/lib/astro/synastry";
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
}

const ASPECT_GLYPH: Record<string, string> = {
  conjunction: "☌", sextile: "⚹", square: "□", trine: "△", quincunx: "⚻", opposition: "☍",
};

const COMPAT_KEY = "am_compat";

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
  const [error, setError] = useState<string | null>(null);
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
    return { a: chartA, b: chartB, syn };
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
    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 280)); // keep the "Reading the stars…" beat
    try {
      setResult(compute(a, b));
      setRevealKey((k) => k + 1);
      try { localStorage.setItem(COMPAT_KEY, JSON.stringify({ a, b })); } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
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

      {result
        ? <Result key={revealKey} result={result} staged={revealKey > 0} forms={{ a, b }} />
        : <EmptyState />}

      <footer className="mt-14 text-center text-xs text-haze/60 space-y-1">
        <p>{t.compat.footer1}</p>
        <p className="text-haze/40">{t.compat.footer2}</p>
      </footer>
    </main>
  );
}

function EmptyState() {
  const t = useT();
  return (
    <section className="mt-12 mb-2 text-center">
      <div className="inline-flex flex-col items-center gap-2 text-haze/70">
        <span className="text-2xl text-gold/55" aria-hidden>✦</span>
        <p className="text-sm">{t.compat.empty}</p>
      </div>
    </section>
  );
}

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
  const { a, b, syn } = result;
  const t = useT();

  const archReading = archetypeReading(syn);
  const thread = strongestThread(syn);
  const reads = subscoreRead(syn);

  const h = t.compat.hints;
  const cards: { key: string; hint: string; node: React.ReactNode }[] = [
    { key: "score", hint: h.score, node: <ScoreCard syn={syn} forms={forms} /> },
    { key: "type", hint: h.type, node: <ArchetypeCard reading={archReading} /> },
    ...(thread ? [{ key: "thread", hint: h.thread, node: <ThreadCard thread={thread} /> }] : []),
    { key: "dims", hint: h.dims, node: <DimensionsCard syn={syn} reads={reads} /> },
    { key: "tend", hint: h.tend, node: <TendCard syn={syn} /> },
    { key: "flowgrow", hint: h.flowgrow, node: <FlowGrowCard syn={syn} /> },
    { key: "wheel", hint: h.wheel, node: <WheelCard a={a} b={b} syn={syn} /> },
    ...(syn.overlays.length > 0 ? [{ key: "brings", hint: h.brings, node: <BringsCard syn={syn} /> }] : []),
    { key: "shine", hint: h.shine, node: <ShineCard reads={reads} /> },
  ];

  // Free tier: the score and the couple-type cards. Everything past that sits
  // behind a single $2 unlock. The gate reads entitlement reactively, so a
  // confirmed payment reveals the rest without a reload.
  const unlocked = useUnlocked();
  const FREE = 2;
  const total = cards.length;
  const gateAt = unlocked ? total : Math.min(FREE, total);
  const locked = !unlocked && total > gateAt;

  const [revealed, setRevealed] = useState(staged ? 0 : total);
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
        <div className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] text-haze">
          <span><span key={done} className="count-tick">✦ {fill(t.compat.revealedOfTotal, { n: done, total })}</span> {t.compat.revealedWord}</span>
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
        <PaywallGate blurb={t.pay.compat} next={next} peek={cards[gateAt]?.node} />
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
function ScoreCard({ syn, forms }: { syn: SynastryResult; forms: { a: BirthFormValues; b: BirthFormValues } }) {
  const { palette: pal } = useTheme();
  return (
    <div className="glass p-6 sm:p-8 text-center">
      <div className="stagger flex flex-col items-center">
        <div className="text-sm text-haze tracking-wide">
          <span style={{ color: pal.personA }}>{syn.names.a}</span>
          <span className="mx-2 text-gold">✦</span>
          <span style={{ color: pal.personB }}>{syn.names.b}</span>
        </div>
        <div className="mt-3"><ScoreGauge score={syn.score} /></div>
        <h2 className="font-display text-3xl text-goldbright mt-3">{syn.band.label}</h2>
        <p className="text-cream/85 max-w-md mx-auto mt-2 text-[15px] leading-relaxed">{scoreMeaning(syn)}</p>
      </div>
      <ShareRow syn={syn} forms={forms} />
    </div>
  );
}

function ArchetypeCard({ reading }: { reading: ArchetypeReading }) {
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
        <div className="text-[10px] uppercase tracking-[0.24em] text-gold/80">{t.compat.whyThisType}</div>
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
        {a && (
          <div className="mt-3 pt-3 border-t border-cream/10 text-center">
            <div className="flex items-center justify-center gap-2 text-2xl" style={{ fontFamily: GLYPH_FONT }}>
              <span style={{ color: pal.personA }}>{aMeta?.glyph ?? "↑"}</span>
              <span style={{ color: vc, fontSize: "0.8em" }}>{ASPECT_GLYPH[a.aspect]}</span>
              <span style={{ color: pal.personB }}>{bMeta?.glyph ?? "↑"}</span>
            </div>
            <p className="text-[13px] text-cream/85 mt-2 leading-snug">{a.headline}</p>
            <p className="text-[10px] text-haze/55 mt-1 tabular-nums">{a.proof}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadCard({ thread }: { thread: Thread }) {
  const { palette: pal } = useTheme();
  const t = useT();
  const { aspect: a, tightness } = thread;
  const aMeta = BODIES.find((x) => x.key === a.aBody);
  const bMeta = BODIES.find((x) => x.key === a.bBody);
  const vc = pal.aspect[a.valence];
  return (
    <div className="glass p-6 sm:p-8 text-center stagger">
      <div className="text-[10px] uppercase tracking-[0.34em] text-gold/80">{t.compat.strongestThread}</div>
      <div className="mt-3 flex items-center justify-center gap-3 text-4xl" style={{ fontFamily: GLYPH_FONT }}>
        <span className="planet-pop" style={{ color: pal.personA, animationDelay: "0s" }}>{aMeta?.glyph ?? "↑"}</span>
        <span className="planet-pop" style={{ color: vc, fontSize: "0.8em", animationDelay: "0.12s", filter: `drop-shadow(0 0 6px ${vc})` }}>{ASPECT_GLYPH[a.aspect]}</span>
        <span className="planet-pop" style={{ color: pal.personB, animationDelay: "0.24s" }}>{bMeta?.glyph ?? "↑"}</span>
      </div>
      <p className="font-display text-xl sm:text-2xl text-cream max-w-md mx-auto mt-4">{a.headline}</p>
      <p className="text-sm text-haze/85 max-w-md mx-auto mt-2 leading-snug">{a.why}</p>
      <p className="text-[11px] text-haze/55 max-w-md mx-auto mt-2 tabular-nums">{a.proof}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-haze">
        {tightness && (
          <span className="px-2.5 py-1 rounded-full bg-gold/10 text-gold/90 uppercase tracking-wider">{tightness}, {a.orb.toFixed(1)}°</span>
        )}
        <span>{t.compat.strongestThreadTag}</span>
      </div>
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
  const card = buildShareCard(syn);
  const caps = buildCaptions(syn);

  const link = () => {
    if (typeof window === "undefined") return "https://astro-love.app/";
    const base = window.location.origin;
    try { return `${base}/?r=${encodeReading(forms.a, forms.b)}`; } catch { return `${base}/`; }
  };
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
