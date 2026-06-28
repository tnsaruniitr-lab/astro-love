"use client";

import { useState } from "react";
import { loveQuestions } from "@/lib/astro/natalReading";
import type { ChartFacts } from "@/lib/astro/types";

/** Tap-to-open love questions, answered deterministically from the chart. */
export default function LoveQuestions({ chart }: { chart: ChartFacts }) {
  const items = loveQuestions(chart);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="glass p-6 sm:p-7">
      <h3 className="font-display text-2xl text-cream mb-1">Ask your chart about love</h3>
      <p className="text-haze text-sm mb-5">
        Real answers from your placements, no fortune telling. Tap a question.
      </p>
      <ul className="space-y-2.5">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <li key={it.key} className="rounded-xl border border-cream/10 bg-cream/[0.03] overflow-hidden transition-colors">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-cream/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded-xl"
              >
                <span className="text-cream/90 text-[15px]">{it.q}</span>
                <span className={`text-gold text-lg leading-none transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} aria-hidden>+</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 fade-up">
                  <p className="text-sm text-haze/90 leading-relaxed">{it.answer}</p>
                  {it.note && <p className="text-xs text-gold/75 mt-2 leading-relaxed">✦ {it.note}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
