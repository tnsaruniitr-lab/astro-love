"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getUI, isRtl, LOCALE_CODES, type Locale, type UIStrings } from "@/lib/i18n";

interface LocaleCtx { locale: Locale; setLocale: (l: Locale) => void; t: UIStrings }

const Ctx = createContext<LocaleCtx>({ locale: "en", setLocale: () => {}, t: getUI("en") });

const LOCALE_COOKIE = "astro-locale";

function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)astro-locale=([^;]*)/);
  const v = m ? decodeURIComponent(m[1]) : null;
  return v && (LOCALE_CODES as string[]).includes(v) ? (v as Locale) : null;
}

function writeLocaleCookie(l: Locale): void {
  try {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch { /* ignore */ }
}

export function LocaleProvider({ initial = "en", children }: { initial?: Locale; children: React.ReactNode }) {
  // `initial` is resolved server-side (middleware -> root layout), so the first
  // paint is already in the right language. Seeding state with it is what keeps
  // SSR and hydration in agreement.
  const [locale, setLocaleState] = useState<Locale>(initial);

  useEffect(() => {
    // A cookie means the server already honoured the visitor's choice.
    if (readLocaleCookie()) return;
    // One-time migration: choices made before the cookie existed live in
    // localStorage, and the server can't see those. Promote and apply it, so a
    // returning visitor isn't silently re-language by Accept-Language.
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(LOCALE_COOKIE)) as Locale | null;
    if (saved && (LOCALE_CODES as string[]).includes(saved)) {
      writeLocaleCookie(saved);
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    document.documentElement.setAttribute("lang", l);
    document.documentElement.setAttribute("dir", isRtl(l) ? "rtl" : "ltr");
    // Cookie for the server (first-byte rendering), localStorage for continuity
    // with the older builds.
    writeLocaleCookie(l);
    try { localStorage.setItem(LOCALE_COOKIE, l); } catch { /* ignore */ }
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
