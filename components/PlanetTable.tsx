"use client";

import { BODIES, SIGNS, formatLon } from "@/lib/astro/zodiac";
import { useTheme } from "./ThemeProvider";
import type { ChartFacts } from "@/lib/astro/types";

const GLYPH_FONT =
  '"Noto Sans Symbols2","Segoe UI Symbol","Apple Symbols","DejaVu Sans",serif';

export default function PlanetTable({ chart }: { chart: ChartFacts }) {
  const { palette: pal } = useTheme();
  return (
    <div className="fade-up">
      {chart.asc && chart.mc && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <AnglePill label="Ascendant" lon={chart.asc.lon} />
          <AnglePill label="Midheaven" lon={chart.mc.lon} />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gold/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-haze/80 text-xs uppercase tracking-wider">
              <th className="py-2.5 pl-4 font-medium">Planet</th>
              <th className="py-2.5 font-medium">Position</th>
              <th className="py-2.5 pr-4 font-medium text-right">House</th>
            </tr>
          </thead>
          <tbody>
            {chart.planets.map((p) => {
              const meta = BODIES.find((b) => b.key === p.body)!;
              const sign = SIGNS.find((s) => s.key === p.sign)!;
              return (
                <tr key={p.id} className="hairline">
                  <td className="py-2.5 pl-4">
                    <span className="inline-flex items-center gap-2.5">
                      <span style={{ fontFamily: GLYPH_FONT }} className="text-goldbright text-lg leading-none">
                        {meta.glyph}
                      </span>
                      <span className="text-cream">{meta.en}</span>
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span style={{ color: pal.element[sign.element], fontFamily: GLYPH_FONT }}>{sign.glyph}</span>
                      <span className="text-cream/90 tabular-nums">{formatLon(p.lon)}</span>
                      {p.retrograde && <span className="text-rose text-xs">℞</span>}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-haze tabular-nums">
                    {p.house ?? "·"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnglePill({ label, lon }: { label: string; lon: number }) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-haze/80">{label}</div>
      <div className="font-display text-xl text-goldbright mt-0.5 tabular-nums">{formatLon(lon)}</div>
    </div>
  );
}
