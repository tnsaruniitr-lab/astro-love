"use client";

import { useState } from "react";
import Link from "next/link";
import BirthForm, { type BirthFormValues } from "./BirthForm";
import ChartWheel from "./ChartWheel";
import PlanetTable from "./PlanetTable";
import LoveQuestions from "./LoveQuestions";
import ThemeSwatches from "./ThemeSwatches";
import { useTheme } from "./ThemeProvider";
import { SIGNS, BODIES } from "@/lib/astro/zodiac";
import { computeChart } from "@/lib/astro/chart";
import type { ChartFacts } from "@/lib/astro/types";

const GLYPH_FONT =
  '"Noto Sans Symbols2","Segoe UI Symbol","Apple Symbols","DejaVu Sans",serif';

export default function Experience({
  initialChart,
  initialForm,
}: {
  initialChart: ChartFacts;
  initialForm: BirthFormValues;
}) {
  const [chart, setChart] = useState<ChartFacts>(initialChart);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(v: BirthFormValues) {
    setLoading(true);
    setError(null);
    // Compute in the browser (no server needed → static-host friendly).
    // A short beat keeps the "Reading the sky…" moment.
    await new Promise((r) => setTimeout(r, 250));
    try {
      const p = v.place;
      if (!p) throw new Error("Please choose your birthplace from the list");
      setChart(
        computeChart({
          name: v.name || undefined,
          place: p.label,
          year: v.year, month: v.month, day: v.day, hour: v.hour, minute: v.minute,
          timeKnown: v.timeKnown,
          lat: p.lat, lon: p.lon, tz: p.tz,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <nav className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 order-2 sm:order-1 text-xs uppercase tracking-[0.2em]">
          <Link href="/" className="text-haze hover:text-gold transition-colors">← Love compatibility</Link>
          <Link href="/love-language" className="text-haze hover:text-gold transition-colors">Love language →</Link>
        </div>
        <div className="order-1 sm:order-2">
          <ThemeSwatches />
        </div>
      </nav>
      <Header />

      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 mt-10">
        <div className="lg:col-span-2 lg:sticky lg:top-8 self-start">
          <BirthForm initial={initialForm} loading={loading} onSubmit={onSubmit} />
          {error && (
            <p className="mt-3 text-sm text-rose/90 text-center">{error}</p>
          )}
          <Science />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <ResultCard chart={chart} />
          <LoveQuestions chart={chart} />
        </div>
      </div>

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="text-center">
      <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-gold/80">
        <span>✦</span> Astro-Love <span>✦</span>
      </div>
      <h1 className="font-display text-4xl sm:text-6xl leading-tight mt-3">
        <span className="gold-text">The sky at the moment</span>
        <br />
        <span className="text-cream italic">you began.</span>
      </h1>
      <p className="text-haze mt-4 max-w-xl mx-auto">
        Your natal chart, computed from real astronomy, the precise foundation
        for math-based love and compatibility. <span className="text-cream/80">Не мистика, а точные наблюдения.</span>
      </p>
      <div className="mt-6">
        <Link href="/" className="btn-gold inline-flex items-center gap-2 px-7 py-2.5 text-sm">
          ✦ Check love compatibility →
        </Link>
      </div>
    </header>
  );
}

function ResultCard({ chart }: { chart: ChartFacts }) {
  const sun = chart.planets.find((p) => p.body === "Sun")!;
  const moon = chart.planets.find((p) => p.body === "Moon")!;
  const rising = chart.asc;

  return (
    <div className="glass p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-haze/80">
            {chart.subject.name ? chart.subject.name : "Your chart"}
          </div>
          <div className="font-display text-2xl text-cream mt-0.5">
            {chart.subject.place}
          </div>
          <div className="text-sm text-haze mt-0.5">{prettyLocal(chart.subject.localISO, chart.subject.timeKnown)}</div>
        </div>
      </div>

      {/* Big three */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <BigThree label="Sun" body="Sun" signKey={sun.sign} />
        <BigThree label="Moon" body="Moon" signKey={moon.sign} />
        <BigThree label="Rising" body={null} signKey={rising?.sign ?? null} />
      </div>

      {/* Wheel */}
      <div className="mt-6 aspect-square max-w-[560px] mx-auto">
        <ChartWheel chart={chart} />
      </div>

      <AspectLegend />

      {chart.warnings.length > 0 && (
        <div className="mt-4 text-xs text-gold/75 bg-gold/5 border border-gold/15 rounded-xl px-4 py-3">
          {chart.warnings.map((w, i) => (
            <p key={i}>✦ {w}</p>
          ))}
        </div>
      )}

      <div className="mt-6">
        <PlanetTable chart={chart} />
      </div>
    </div>
  );
}

function BigThree({ label, body, signKey }: { label: string; body: "Sun" | "Moon" | null; signKey: string | null }) {
  const sign = signKey ? SIGNS.find((s) => s.key === signKey) : null;
  const bodyGlyph = body ? BODIES.find((b) => b.key === body)?.glyph : "↑";
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <div className="text-[10px] uppercase tracking-[0.2em] text-haze/80 flex items-center justify-center gap-1.5">
        <span style={{ fontFamily: GLYPH_FONT }} className="text-gold">{bodyGlyph}</span> {label}
      </div>
      <div className="mt-2 text-3xl text-goldbright" style={{ fontFamily: GLYPH_FONT }}>
        {sign ? sign.glyph : "·"}
      </div>
      <div className="font-display text-lg text-cream mt-1">{sign ? sign.en : "Unknown"}</div>
      {sign && <div className="text-[11px] text-haze">{sign.ru}</div>}
    </div>
  );
}

function AspectLegend() {
  const { palette: pal } = useTheme();
  const items = [
    { c: pal.aspect.harmonious, t: "Harmonious, flow & ease" },
    { c: pal.aspect.tension, t: "Challenging, passion & growth" },
    { c: pal.aspect.blending, t: "Conjunction, blending" },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-4 text-[11px] text-haze">
      {items.map((i) => (
        <span key={i.t} className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-[2px] rounded" style={{ background: i.c }} /> {i.t}
        </span>
      ))}
    </div>
  );
}

function Science() {
  return (
    <div className="mt-5 text-sm text-haze/90 leading-relaxed glass rounded-2xl p-5">
      <h3 className="font-display text-lg text-cream mb-2">Why this is real</h3>
      <p>
        Every position here is computed from the actual motion of the Sun, Moon
        and planets, the same astronomy an observatory uses, corrected for your
        exact birthplace and the time zone <em>as it was on your birth date</em>.
        No guesswork, fully reproducible.
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-14 text-center text-xs text-haze/60 space-y-1">
      <p>For entertainment &amp; self-reflection. Not a substitute for professional advice.</p>
      <p className="text-haze/40">Astro-Love · natal engine + UX · tropical zodiac, whole-sign houses</p>
    </footer>
  );
}

function prettyLocal(iso: string, timeKnown: boolean): string {
  // iso like "1990-05-14T06:30:00+04:00"
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, y, mo, d, h, mi] = m;
  const date = `${+d} ${months[+mo - 1]} ${y}`;
  return timeKnown ? `${date}, ${h}:${mi}` : `${date} · time unknown`;
}
