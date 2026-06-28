"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { PALETTES, THEME_KEYS, type ThemeKey, type WheelPalette } from "@/lib/theme";

interface ThemeCtx {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  palette: WheelPalette;
}

const Ctx = createContext<ThemeCtx>({
  theme: "velvet",
  setTheme: () => {},
  palette: PALETTES.velvet,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start at "velvet" on both server and first client render → no hydration
  // mismatch. The inline boot script in layout already set the correct CSS
  // theme (data-theme) before paint; we sync the JS palette right after mount.
  const [theme, setThemeState] = useState<ThemeKey>("velvet");

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme") as ThemeKey | null;
    if (attr && (THEME_KEYS as string[]).includes(attr)) setThemeState(attr);
  }, []);

  const setTheme = (t: ThemeKey) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("astro-theme", t);
    } catch {
      /* ignore */
    }
  };

  return (
    <Ctx.Provider value={{ theme, setTheme, palette: PALETTES[theme] }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
