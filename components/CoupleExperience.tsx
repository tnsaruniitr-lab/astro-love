"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Link from "next/link";
import BirthFields, { type BirthFormValues } from "./BirthFields";
import SynastryWheel from "./SynastryWheel";
import ThemeSwatches from "./ThemeSwatches";
import { useTheme } from "./ThemeProvider";
import { BODIES } from "@/lib/astro/zodiac";
import { computeChart } from "@/lib/astro/chart";
import { computeSynastry, type SynastryResult, type SynAspect, type SynOverlay } from "@/lib/astro/synastry";
import {
  coupleArchetype, strongestThread, flowGrow, subscoreRead,
  type Archetype, type Thread, type SubscoreRead,
} from "@/lib/astro/insights";
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

export default function CoupleExperience({
  initialA,
  initialB,
  initialResult,
}: {
  initialA: BirthFormValues;
  initialB: BirthFormValues;
  initialResult: CoupleResult;
}) {
  const { palette: pal } = useTheme();
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [result, setResult] = useState<CoupleResult>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 0 = initial/SSR result (show everything). Each Calculate bumps this and
  // remounts <Result> into the staged tap-to-reveal "ritual".
  const [revealKey, setRevealKey] = useState(0);

  async function calculate() {
    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 280)); // keep the "Reading the stars…" beat
    try {
      const toInput = (f: BirthFormValues, who: string): ChartInput => {
        const p = f.place;
        if (!p) throw new Error(`Please choose ${who}'s birthplace from the list`);
        return {
          name: f.name || undefined, place: p.label,
          year: f.year, month: f.month, day: f.day, hour: f.hour, minute: f.minute,
          timeKnown: f.timeKnown, lat: p.lat, lon: p.lon, tz: p.tz,
        };
      };
      const inA = toInput(a, "Person A");
      const inB = toInput(b, "Person B");
      const chartA = computeChart(inA);
      const chartB = computeChart(inB);
      const syn = computeSynastry(chartA, chartB, inA.name ?? "Person A", inB.name ?? "Person B");
      setResult({ a: chartA, b: chartB, syn });
      setRevealKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <nav className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 mb-8">
        <Link href="/" className="text-xs uppercase tracking-[0.2em] text-haze hover:text-gold transition-colors order-2 sm:order-1">
          ← Single natal chart
        </Link>
        <div className="order-1 sm:order-2">
          <ThemeSwatches />
        </div>
      </nav>

      <header className="text-center">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-gold/80">
          <span>✦</span> Astro-Love · Compatibility <span>✦</span>
        </div>
        <h1 className="font-display text-4xl sm:text-6xl leading-tight mt-3">
          <span className="gold-text">Two charts,</span>{" "}
          <span className="text-cream italic">one connection.</span>
        </h1>
        <p className="text-haze mt-4 max-w-xl mx-auto">
          Real synastry: we measure the angles between your planets and theirs, and
          score them by what actually drives love. Every point is explained below —{" "}
          <span className="text-cream/80">прозрачная математика.</span>
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-5 mt-10">
        <Panel label="Person A" accent={pal.personA}>
          <BirthFields value={a} onChange={setA} namePlaceholder="e.g. Anna" />
        </Panel>
        <Panel label="Person B" accent={pal.personB}>
          <BirthFields value={b} onChange={setB} namePlaceholder="e.g. Dmitri" />
        </Panel>
      </div>
      <div className="flex flex-col items-center mt-5">
        <button onClick={calculate} disabled={loading} className="btn-gold px-10 py-3">
          {loading ? "Reading the stars…" : "Calculate compatibility"}
        </button>
        {error && <p className="mt-3 text-sm text-rose/90">{error}</p>}
      </div>

      <Result key={revealKey} result={result} staged={revealKey > 0} />

      <footer className="mt-14 text-center text-xs text-haze/60 space-y-1">
        <p>For entertainment &amp; self-reflection. Not a substitute for professional advice.</p>
        <p className="text-haze/40">Astro-Love · Milestone 2 — synastry scoring · tropical zodiac, whole-sign houses</p>
      </footer>
    </main>
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
function Result({ result, staged }: { result: CoupleResult; staged: boolean }) {
  const { a, b, syn } = result;

  const archetype = coupleArchetype(syn);
  const thread = strongestThread(syn);
  const { flow, grow } = flowGrow(syn);
  const reads = subscoreRead(syn);

  const cards: { key: string; hint: string; node: React.ReactNode }[] = [
    { key: "score", hint: "your compatibility score", node: <ScoreCard syn={syn} /> },
    { key: "type", hint: "your couple type", node: <ArchetypeCard archetype={archetype} /> },
    ...(thread ? [{ key: "thread", hint: "your strongest thread", node: <ThreadCard thread={thread} /> }] : []),
    { key: "dims", hint: "your five dimensions", node: <DimensionsCard syn={syn} reads={reads} /> },
    { key: "flowgrow", hint: "where you flow & grow", node: <FlowGrowCard flow={flow} grow={grow} /> },
    { key: "wheel", hint: "your synastry wheel", node: <WheelCard a={a} b={b} syn={syn} /> },
    ...(syn.overlays.length > 0 ? [{ key: "brings", hint: "what you each bring", node: <BringsCard syn={syn} /> }] : []),
    { key: "shine", hint: "where you shine", node: <ShineCard reads={reads} /> },
  ];

  const total = cards.length;
  const [revealed, setRevealed] = useState(staged ? 0 : total);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (staged && revealed > 0 && revealed < total) {
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [revealed, staged, total]);

  const done = Math.min(revealed, total);

  return (
    <section className="mt-10 space-y-5">
      {staged && (
        <div className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] text-haze">
          <span>✦ {done} / {total} revealed</span>
          {revealed < total && (
            <button onClick={() => setRevealed(total)} className="text-gold/80 hover:text-gold underline underline-offset-4">
              Reveal all
            </button>
          )}
        </div>
      )}

      {cards.map((c, i) => {
        if (i < revealed) return <div key={c.key} className="reveal-in">{c.node}</div>;
        if (i === revealed) {
          return (
            <FacedownCard key={c.key} ref={activeRef} hint={c.hint} onReveal={() => setRevealed(i + 1)} />
          );
        }
        return null;
      })}

      {revealed >= total && syn.warnings.length > 0 && (
        <div className="text-xs text-gold/75 bg-gold/5 border border-gold/15 rounded-xl px-4 py-3">
          {syn.warnings.map((w, i) => (
            <p key={i}>✦ {w}</p>
          ))}
        </div>
      )}
    </section>
  );
}

const FacedownCard = forwardRef<HTMLButtonElement, { hint: string; onReveal: () => void }>(
  function FacedownCard({ hint, onReveal }, ref) {
    return (
      <button
        ref={ref}
        onClick={onReveal}
        className="facedown w-full rounded-[22px] border border-dashed border-gold/30 bg-cream/[0.02] hover:border-gold/60 hover:bg-cream/[0.04] transition-colors p-8 sm:p-10 text-center group"
      >
        <div className="text-3xl text-gold/70 group-hover:text-gold transition-colors" style={{ fontFamily: GLYPH_FONT }}>✦</div>
        <div className="mt-2 text-[11px] uppercase tracking-[0.24em] text-haze/80">Tap to reveal</div>
        <div className="font-display text-xl text-cream mt-1 capitalize">{hint}</div>
      </button>
    );
  }
);

// ───────────────────────── individual cards ─────────────────────────
function ScoreCard({ syn }: { syn: SynastryResult }) {
  const { palette: pal } = useTheme();
  return (
    <div className="glass p-6 sm:p-8 text-center">
      <div className="text-sm text-haze tracking-wide">
        <span style={{ color: pal.personA }}>{syn.names.a}</span>
        <span className="mx-2 text-gold">✦</span>
        <span style={{ color: pal.personB }}>{syn.names.b}</span>
      </div>
      <div className="flex flex-col items-center mt-3">
        <ScoreGauge score={syn.score} />
        <h2 className="font-display text-3xl text-goldbright mt-3">{syn.band.label}</h2>
        <p className="text-haze max-w-md mx-auto mt-2 text-sm leading-relaxed">{syn.band.blurb}</p>
      </div>
    </div>
  );
}

function ArchetypeCard({ archetype }: { archetype: Archetype }) {
  return (
    <div className="glass p-6 sm:p-8 text-center">
      <div className="text-[11px] uppercase tracking-[0.24em] text-haze/80">You two are</div>
      <h3 className="font-display text-4xl sm:text-5xl gold-text mt-2 pb-1">{archetype.name}</h3>
      <p className="text-cream/85 max-w-md mx-auto mt-3">{archetype.definition}</p>
    </div>
  );
}

function ThreadCard({ thread }: { thread: Thread }) {
  const { palette: pal } = useTheme();
  const { aspect: a, tightness } = thread;
  const aMeta = BODIES.find((x) => x.key === a.aBody);
  const bMeta = BODIES.find((x) => x.key === a.bBody);
  const vc = pal.aspect[a.valence];
  return (
    <div className="glass p-6 sm:p-8 text-center">
      <div className="text-[11px] uppercase tracking-[0.24em] text-gold/80">Your strongest thread</div>
      <div className="mt-3 flex items-center justify-center gap-3 text-4xl" style={{ fontFamily: GLYPH_FONT }}>
        <span style={{ color: pal.personA }}>{aMeta?.glyph ?? "↑"}</span>
        <span style={{ color: vc, fontSize: "0.8em" }}>{ASPECT_GLYPH[a.aspect]}</span>
        <span style={{ color: pal.personB }}>{bMeta?.glyph ?? "↑"}</span>
      </div>
      <p className="font-display text-lg sm:text-xl text-cream max-w-md mx-auto mt-4">{a.sentence}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-haze">
        {tightness && (
          <span className="px-2.5 py-1 rounded-full bg-gold/10 text-gold/90 uppercase tracking-wider">
            {tightness} · {a.orb.toFixed(1)}°
          </span>
        )}
        <span>the single strongest contact between your charts.</span>
      </div>
    </div>
  );
}

function DimensionsCard({ syn, reads }: { syn: SynastryResult; reads: SubscoreRead }) {
  const { palette: pal } = useTheme();
  const s = syn.subscores;
  return (
    <div className="glass p-6 sm:p-8">
      <h3 className="font-display text-xl text-cream text-center">Your five dimensions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 max-w-3xl mx-auto">
        <SubBar label="Emotional" value={s.emotional} color={pal.sub.emotional} highlight={reads.strong.key === "emotional"} />
        <SubBar label="Attraction" value={s.attraction} color={pal.sub.attraction} highlight={reads.strong.key === "attraction"} />
        <SubBar label="Affection" value={s.affection} color={pal.sub.affection} highlight={reads.strong.key === "affection"} />
        <SubBar label="Communication" value={s.communication} color={pal.sub.communication} highlight={reads.strong.key === "communication"} />
        <SubBar label="Commitment" value={s.commitment} color={pal.sub.commitment} highlight={reads.strong.key === "commitment"} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-6 max-w-3xl mx-auto">
        <ReadBox tone="strong" label={`Strongest · ${reads.strong.label} (${reads.strong.value})`} line={reads.strong.line} />
        <ReadBox tone="tender" label={`Tenderest · ${reads.tender.label} (${reads.tender.value})`} line={reads.tender.line} />
      </div>
    </div>
  );
}

function ReadBox({ tone, label, line }: { tone: "strong" | "tender"; label: string; line: string }) {
  const strong = tone === "strong";
  return (
    <div className={`rounded-2xl border p-4 text-left ${strong ? "bg-gold/[0.06] border-gold/20" : "bg-cream/[0.03] border-cream/10"}`}>
      <div className={`text-[11px] uppercase tracking-[0.16em] ${strong ? "text-gold/90" : "text-haze/80"}`}>{label}</div>
      <div className="text-sm text-cream/90 mt-1.5 leading-snug">{line}</div>
    </div>
  );
}

function FlowGrowCard({ flow, grow }: { flow: SynAspect[]; grow: SynAspect[] }) {
  return (
    <div className="glass p-6 sm:p-8">
      <h3 className="font-display text-xl text-cream text-center">Where you flow &amp; grow</h3>
      <p className="text-xs text-haze text-center mt-1 mb-5">Every contact, split by how it feels — strongest first.</p>
      <div className="grid lg:grid-cols-2 gap-6">
        <AspectGroup title="Where you flow" subtitle="the easy current between you" items={flow} accent="harmonious" />
        <AspectGroup title="Where you grow" subtitle="friction here is fuel, not a flaw" items={grow} accent="tension" />
      </div>
    </div>
  );
}

function AspectGroup({ title, subtitle, items, accent }: { title: string; subtitle: string; items: SynAspect[]; accent: "harmonious" | "tension" }) {
  const { palette: pal } = useTheme();
  const c = pal.aspect[accent];
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-4 h-[2px] rounded" style={{ background: c }} />
        <h4 className="text-sm uppercase tracking-[0.14em] text-cream">{title}</h4>
        <span className="text-xs tabular-nums px-2 py-0.5 rounded-full" style={{ background: `${c}22`, color: c }}>{items.length}</span>
      </div>
      <p className="text-[11px] text-haze/80 mb-3">{subtitle}</p>
      {items.length === 0 ? (
        <p className="text-sm text-haze/70 italic">None this time — and that's perfectly normal.</p>
      ) : (
        <ul className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {items.map((asp, i) => (
            <AspectRow key={i} asp={asp} />
          ))}
        </ul>
      )}
    </div>
  );
}

function WheelCard({ a, b, syn }: { a: ChartFacts; b: ChartFacts; syn: SynastryResult }) {
  const { palette: pal } = useTheme();
  return (
    <div className="glass p-5 sm:p-6">
      <h3 className="font-display text-xl text-cream text-center mb-3">Your synastry wheel</h3>
      <div className="aspect-square max-w-[560px] mx-auto">
        <SynastryWheel chartA={a} chartB={b} syn={syn} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-3 text-[11px] text-haze">
        <Legend c={pal.personA} t={`${syn.names.a} (inner)`} dot />
        <Legend c={pal.personB} t={`${syn.names.b} (outer)`} dot />
        <Legend c={pal.aspect.harmonious} t="harmonious" />
        <Legend c={pal.aspect.tension} t="challenging" />
        <Legend c={pal.aspect.blending} t="conjunction" />
      </div>
    </div>
  );
}

function BringsCard({ syn }: { syn: SynastryResult }) {
  const { palette: pal } = useTheme();
  const aBrings = syn.overlays.filter((o) => o.from === "A");
  const bBrings = syn.overlays.filter((o) => o.from === "B");
  return (
    <div className="glass p-6 sm:p-8">
      <h3 className="font-display text-xl text-cream text-center mb-1">What you each bring</h3>
      <p className="text-xs text-haze text-center mb-5">Where each person's planets land in the other's life areas.</p>
      <div className="grid sm:grid-cols-2 gap-5">
        <BringCol name={syn.names.a} accent={pal.personA} items={aBrings} />
        <BringCol name={syn.names.b} accent={pal.personB} items={bBrings} />
      </div>
    </div>
  );
}

function BringCol({ name, accent, items }: { name: string; accent: string; items: SynOverlay[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
        <h4 className="font-display text-lg text-cream">{name} brings</h4>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-haze/70 italic">No house overlays this time.</p>
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
  return (
    <div className="glass p-6 sm:p-8 text-center">
      <h3 className="font-display text-xl text-cream mb-5">Where you shine</h3>
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
        <div className="rounded-2xl bg-gold/[0.06] border border-gold/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-gold/90">You shine</div>
          <div className="text-cream mt-1.5 leading-snug">
            <span className="text-goldbright">{reads.strong.label} ({reads.strong.value})</span> — {reads.strong.line}
          </div>
        </div>
        <div className="rounded-2xl bg-cream/[0.03] border border-cream/10 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-haze/80">One thing to tend</div>
          <div className="text-cream/90 mt-1.5 leading-snug">
            <span className="text-cream">{reads.tender.label} ({reads.tender.value})</span> — {reads.tender.line}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── shared bits ─────────────────────────
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
      <span className="text-[13px] text-cream/85 leading-snug flex-1">{asp.sentence}</span>
      <span className="text-xs tabular-nums shrink-0" style={{ color: vc }}>+{asp.points.toFixed(1)}</span>
    </li>
  );
}

function SubBar({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 200);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="text-left">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] uppercase tracking-wider text-haze/80 flex items-center gap-1">
          {highlight && <span className="text-gold">✦</span>}{label}
        </span>
        <span className="text-sm tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className={`h-1.5 rounded-full bg-cream/10 overflow-hidden ${highlight ? "ring-1 ring-gold/40" : ""}`}>
        <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${w}%`, background: color }} />
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
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ * (1 - score / 100)), 150);
    return () => clearTimeout(t);
  }, [score, circ]);
  return (
    <div className="relative" style={{ width: 180, height: 180 }}>
      <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={pal.gauge.from} />
            <stop offset="55%" stopColor={pal.gauge.mid} />
            <stop offset="100%" stopColor={pal.gauge.to} />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={r} fill="none" style={{ stroke: "rgb(var(--c-cream) / 0.12)" }} strokeWidth="10" />
        <circle
          cx="90" cy="90" r={r} fill="none" stroke="url(#gauge)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl text-goldbright leading-none">{score}</span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-haze mt-1">/ 100</span>
      </div>
    </div>
  );
}
