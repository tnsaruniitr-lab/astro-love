"use client";

import { useTheme } from "./ThemeProvider";
import { THEMES, type ThemeKey } from "@/lib/theme";

/** Top-of-page theme selector: a row of gradient swatch pills. */
export default function ThemeSwatches() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="Theme">
      <span className="text-[10px] uppercase tracking-[0.22em] text-haze/70 mr-1 hidden sm:inline">Theme</span>
      {THEMES.map((t) => {
        const active = t.key === theme;
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={active}
            title={`${t.label} — ${t.hint}`}
            onClick={() => setTheme(t.key as ThemeKey)}
            className={`group inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 border transition-all ${
              active
                ? "border-gold/60 bg-gold/10"
                : "border-cream/10 hover:border-gold/30 bg-cream/[0.02]"
            }`}
          >
            <span
              className="inline-block w-5 h-5 rounded-full ring-1 ring-black/10"
              style={{ background: t.swatch, boxShadow: active ? "0 0 0 2px rgb(var(--c-gold) / 0.5)" : undefined }}
            />
            <span className={`text-[11px] tracking-wide ${active ? "text-cream" : "text-haze"}`}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
