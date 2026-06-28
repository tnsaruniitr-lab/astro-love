"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeSwatches from "./ThemeSwatches";
import { useTheme } from "./ThemeProvider";
import { QUESTIONS, scoreLoveLanguage, type Mode, type LoveLanguageResult } from "@/lib/loveLanguage";

export default function LoveLanguageQuiz() {
  const [answers, setAnswers] = useState<Mode[]>([]);
  const done = answers.length === QUESTIONS.length;

  const pick = (m: Mode) => setAnswers((a) => [...a, m]);
  const back = () => setAnswers((a) => a.slice(0, -1));
  const reset = () => setAnswers([]);

  const step = answers.length;
  const q = QUESTIONS[step];
  const progress = Math.round((step / QUESTIONS.length) * 100);

  return (
    <main className="relative mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <nav className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 order-2 sm:order-1 text-xs uppercase tracking-[0.2em]">
          <Link href="/" className="text-haze hover:text-gold transition-colors">← Love compatibility</Link>
          <Link href="/natal" className="text-haze hover:text-gold transition-colors">Natal chart →</Link>
        </div>
        <div className="order-1 sm:order-2"><ThemeSwatches /></div>
      </nav>

      <header className="text-center">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-gold/80">
          <span>✦</span> Astro-Love · Love Language <span>✦</span>
        </div>
        <h1 className="font-display text-4xl sm:text-6xl leading-tight mt-3">
          <span className="gold-text">How you</span>{" "}
          <span className="text-cream italic">give &amp; receive love.</span>
        </h1>
        <p className="text-haze mt-4 max-w-xl mx-auto">
          A quick, honest quiz. Eight questions, no birth data needed. Find the way you most feel loved.
        </p>
      </header>

      <div className="mt-10">
        {done ? (
          <Result result={scoreLoveLanguage(answers)} onRetake={reset} />
        ) : (
          <div className="glass p-6 sm:p-8">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-haze mb-2">
              <span>Question {step + 1} of {QUESTIONS.length}</span>
              {step > 0 && (
                <button onClick={back} className="text-gold/80 hover:text-gold underline underline-offset-4">Back</button>
              )}
            </div>
            <div className="h-1 rounded-full bg-cream/10 overflow-hidden mb-6">
              <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>

            <h2 className="font-display text-2xl text-cream text-center mb-6">{q.prompt}</h2>
            <ul className="space-y-2.5">
              {q.options.map((o, i) => (
                <li key={i}>
                  <button
                    onClick={() => pick(o.mode)}
                    className="w-full text-left rounded-xl border border-cream/10 bg-cream/[0.03] hover:border-gold/45 hover:bg-gold/[0.07] transition-colors px-4 py-3.5 text-cream/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="mt-14 text-center text-xs text-haze/60 space-y-1">
        <p>A self-reflection quiz, separate from your astrology chart.</p>
        <p className="text-haze/40">Astro-Love · Love language</p>
      </footer>
    </main>
  );
}

function Result({ result, onRetake }: { result: LoveLanguageResult; onRetake: () => void }) {
  const { palette: pal } = useTheme();
  const { primary, secondary, ranking } = result;

  return (
    <div className="space-y-5">
      <div className="glass p-6 sm:p-8 text-center reveal-in">
        <div className="text-[10px] uppercase tracking-[0.34em] text-gold/80">Your love language</div>
        <h2 className="font-display text-5xl sm:text-6xl tracking-[-0.02em] leading-[0.98] gold-text mt-2 pb-1">{primary.title}</h2>
        <p className="text-cream/85 text-[15px] max-w-md mx-auto mt-3 leading-relaxed">{primary.desc}</p>
        <p className="text-haze text-sm max-w-md mx-auto mt-3">With a strong secondary note of <span className="text-cream">{secondary.title}</span>.</p>

        <div className="mt-7 max-w-md mx-auto space-y-2.5 text-left">
          {ranking.map((r, i) => (
            <div key={r.mode.key}>
              <div className="flex justify-between text-[11px] uppercase tracking-wider mb-1">
                <span className={i === 0 ? "text-gold" : "text-haze/85"}>{i === 0 ? "✦ " : ""}{r.mode.title}</span>
                <span className="tabular-nums" style={{ color: i === 0 ? "rgb(var(--c-goldbright))" : "rgb(var(--c-haze))" }}>{r.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-cream/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: i === 0 ? "var(--gold-grad)" : "rgb(var(--c-haze) / 0.5)" }} />
              </div>
            </div>
          ))}
        </div>

        <ShareLang title={primary.title} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-gold/90">Ask for it</div>
          <p className="text-sm text-cream/90 mt-1.5 leading-snug">{primary.askFor}</p>
        </div>
        <div className="glass p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-haze/90">Speak it to others</div>
          <p className="text-sm text-cream/90 mt-1.5 leading-snug">{primary.speak}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={onRetake} className="text-xs uppercase tracking-[0.18em] text-gold/80 hover:text-gold underline underline-offset-4">Retake quiz</button>
        <Link href="/" className="btn-gold px-7 py-2.5 text-sm">✦ Check love compatibility →</Link>
      </div>
    </div>
  );
}

function ShareLang({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const link = () => (typeof window !== "undefined" ? `${window.location.origin}/love-language/` : "https://astro-love.app/love-language/");
  const text = `My love language is ${title}. What's yours? Find out on Astro-Love.`;
  const open = (u: string) => window.open(u, "_blank", "noopener,noreferrer");
  const copy = async () => { try { await navigator.clipboard.writeText(`${text} ${link()}`); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ } };

  return (
    <div className="mt-7">
      <div className="text-[10px] uppercase tracking-[0.24em] text-haze/85 mb-2.5">Share your result</div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Chip onClick={() => open(`https://t.me/share/url?url=${encodeURIComponent(link())}&text=${encodeURIComponent(text)}`)}>Telegram</Chip>
        <Chip onClick={() => open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link()}`)}`)}>WhatsApp</Chip>
        <Chip onClick={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link())}`)}>X</Chip>
        <Chip onClick={copy}>{copied ? "Copied ✓" : "Copy"}</Chip>
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
