"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getUI, isRtl, LOCALE_CODES, type Locale, type UIStrings } from "@/lib/i18n";

interface LocaleCtx { locale: Locale; setLocale: (l: Locale) => void; t: UIStrings }

const Ctx = createContext<LocaleCtx>({ locale: "en", setLocale: () => {}, t: getUI("en") });

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Start at "en" on server + first client render (matches the SSR HTML) to
  // avoid hydration mismatch; sync to the saved locale right after mount.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("astro-locale")) as Locale | null;
    if (saved && (LOCALE_CODES as string[]).includes(saved)) setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    document.documentElement.setAttribute("lang", l);
    document.documentElement.setAttribute("dir", isRtl(l) ? "rtl" : "ltr");
    try { localStorage.setItem("astro-locale", l); } catch { /* ignore */ }
  };

  // Keep <html lang/dir> in sync whenever the locale changes (incl. initial restore).
  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", isRtl(locale) ? "rtl" : "ltr");
  }, [locale]);

  return <Ctx.Provider value={{ locale, setLocale, t: getUI(locale) }}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);
/** Shortcut to the current UI strings. */
export const useT = () => useContext(Ctx).t;
