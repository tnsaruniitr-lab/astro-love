"use client";

import { useLocale } from "./LocaleProvider";
import { LOCALES, type Locale } from "@/lib/i18n";

/** Compact language dropdown. Native names, persists choice, flips RTL for Arabic. */
export default function LanguageSelect() {
  const { locale, setLocale } = useLocale();
  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Language"
        className="field text-[11px] uppercase tracking-[0.12em] py-1.5 pl-3 pr-7 cursor-pointer"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>{l.name}</option>
        ))}
      </select>
    </label>
  );
}
