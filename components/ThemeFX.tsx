"use client";

import { useTheme } from "./ThemeProvider";
import { themeMeta } from "@/lib/theme";

// Deterministic pseudo-random in [0,1) — avoids hydration drift.
const rnd = (i: number, seed: number) => {
  const x = Math.sin((i + 1) * seed) * 10000;
  return x - Math.floor(x);
};

function Heart({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 21s-7.6-4.85-10.05-9.3C.36 9 1.07 5.2 4.6 4.7c2.16-.3 3.7 1 4.9 2.6 1.2-1.6 2.74-2.9 4.9-2.6 3.53.5 4.24 4.3 2.65 7-2.45 4.45-9.05 9.3-9.05 9.3z" />
    </svg>
  );
}

function Petal({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 20 28" fill={color} aria-hidden>
      <path d="M10 0C2 8 2 20 10 28 18 20 18 8 10 0Z" opacity="0.95" />
    </svg>
  );
}

export default function ThemeFX() {
  const { theme, palette: pal } = useTheme();
  const fx = themeMeta(theme).fx;
  if (!fx) return null;

  const count = fx === "hearts" ? 16 : 20;
  const heartColors = [pal.aspect.tension, pal.gauge.from, pal.gauge.to, pal.coreDot];
  const petalColors = [pal.gauge.from, pal.personA, pal.aspect.tension, "#f6cdd9"];

  return (
    <div className="fx-layer" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const left = rnd(i, 12.9898) * 100;
        const size = 12 + rnd(i, 78.233) * 18;
        const dur = 9 + rnd(i, 43.17) * 9; // 9–18s
        const delay = -rnd(i, 27.61) * dur; // pre-rolled so the screen starts full
        const o = 0.22 + rnd(i, 91.3) * 0.3;
        const dx = (rnd(i, 53.7) - 0.5) * 140;
        const r = (rnd(i, 31.4) - 0.5) * 540;
        const color = (fx === "hearts" ? heartColors : petalColors)[i % 4];
        const style = {
          left: `${left}%`,
          "--dur": `${dur}s`,
          "--delay": `${delay}s`,
          "--o": o,
          "--dx": `${dx}px`,
          "--r": `${r}deg`,
          "--s": 1,
        } as React.CSSProperties;
        return (
          <div key={i} className={`fx-item ${fx === "hearts" ? "fx-heart" : "fx-petal"}`} style={style}>
            {fx === "hearts" ? <Heart color={color} size={size} /> : <Petal color={color} size={size} />}
          </div>
        );
      })}
    </div>
  );
}
