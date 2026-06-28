"use client";

import { SIGNS, BODIES, norm360 } from "@/lib/astro/zodiac";
import { polar, wedge, declump } from "@/lib/astro/wheel";
import { useTheme } from "./ThemeProvider";
import type { ChartFacts, PlacedBody } from "@/lib/astro/types";

const SIZE = 600;
const C = SIZE / 2;

const R = {
  signOuter: 288,
  signInner: 246,
  signGlyph: 267,
  houseNum: 224,
  planet: 196,
  leaderDot: 242,
  aspect: 150,
  center: 64,
};

const GLYPH_FONT =
  '"Noto Sans Symbols2","Segoe UI Symbol","Apple Symbols","DejaVu Sans",serif';

export default function ChartWheel({ chart }: { chart: ChartFacts }) {
  const { palette: pal } = useTheme();
  const orient = chart.asc?.lon ?? 0;
  const hasTime = chart.asc !== null;

  const placed = declump(chart.planets.map((p) => ({ item: p, lon: p.lon })), orient, 9);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="wheel-rise w-full h-full" role="img" aria-label="Natal chart wheel">
      <defs>
        <radialGradient id="disc" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={pal.discFrom} />
          <stop offset="60%" stopColor={pal.discMid} />
          <stop offset="100%" stopColor={pal.discTo} />
        </radialGradient>
        <radialGradient id="core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={pal.core} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={C} cy={C} r={R.signOuter} fill="url(#disc)" />
      <circle cx={C} cy={C} r={R.signOuter} fill="none" stroke={pal.ring} strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R.signInner} fill="none" stroke={pal.ringSoft} strokeWidth={1} />
      <circle cx={C} cy={C} r={R.aspect} fill="none" stroke={pal.ringFaint} strokeWidth={1} />

      {SIGNS.map((s, i) => {
        const start = i * 30;
        const div = polar(C, C, R.signOuter, start, orient);
        const divIn = polar(C, C, R.signInner, start, orient);
        const g = polar(C, C, R.signGlyph, start + 15, orient);
        return (
          <g key={s.key}>
            <path d={wedge(C, C, R.signInner, R.signOuter, start, start + 30, orient)} fill={i % 2 === 0 ? pal.wedgeA : pal.wedgeB} />
            <line x1={divIn.x} y1={divIn.y} x2={div.x} y2={div.y} stroke={pal.ringSoft} strokeWidth={1} />
            <text x={g.x} y={g.y} fontSize={24} fill={pal.element[s.element]} fontFamily={GLYPH_FONT} textAnchor="middle" dominantBaseline="central" opacity={0.95}>
              {s.glyph}
            </text>
          </g>
        );
      })}

      {Array.from({ length: 360 }, (_, deg) => {
        const major = deg % 10 === 0;
        if (deg % 5 !== 0) return null;
        const len = major ? 10 : 5;
        const a = polar(C, C, R.signInner, deg, orient);
        const b = polar(C, C, R.signInner - len, deg, orient);
        return <line key={deg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={pal.tick} strokeWidth={major ? 1 : 0.6} />;
      })}

      {hasTime &&
        chart.houseCusps!.map((cusp, i) => {
          const mid = norm360(cusp + 15);
          const p = polar(C, C, R.houseNum, mid, orient);
          const angular = i === 0 || i === 3 || i === 6 || i === 9;
          return (
            <text key={i} x={p.x} y={p.y} fontSize={11} fill={angular ? pal.houseNumAngular : pal.houseNum} textAnchor="middle" dominantBaseline="central" fontFamily='"Inter",sans-serif'>
              {i + 1}
            </text>
          );
        })}

      {chart.aspects.map((asp, idx) => {
        const pa = chart.planets.find((p) => p.id === asp.a)!;
        const pb = chart.planets.find((p) => p.id === asp.b)!;
        const A = polar(C, C, R.aspect, pa.lon, orient);
        const B = polar(C, C, R.aspect, pb.lon, orient);
        return (
          <line key={idx} className="aspect-line" x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={pal.aspect[asp.valence]} strokeWidth={asp.aspect === "conjunction" ? 1.4 : 1} opacity={0.5} style={{ animationDelay: `${0.5 + idx * 0.04}s` }} />
        );
      })}

      {hasTime && <Axes chart={chart} orient={orient} />}

      <circle cx={C} cy={C} r={R.center} fill="url(#core)" />
      <circle cx={C} cy={C} r={6} fill={pal.coreDot} filter="url(#glow)" />
      <FourStar cx={C} cy={C} r={16} fill={pal.coreStar} />

      {placed.map((pg, idx) => {
        const p = pg.item as PlacedBody;
        const meta = BODIES.find((b) => b.key === p.body)!;
        const glyphPt = polar(C, C, R.planet, pg.plotLon, orient);
        const truePt = polar(C, C, R.leaderDot, p.lon, orient);
        const labelPt = polar(C, C, R.planet - 24, pg.plotLon, orient);
        return (
          <g key={p.id} className="planet-pop" style={{ animationDelay: `${0.9 + idx * 0.07}s` }}>
            <line x1={truePt.x} y1={truePt.y} x2={glyphPt.x} y2={glyphPt.y} stroke={pal.leader} strokeWidth={0.7} />
            <circle cx={truePt.x} cy={truePt.y} r={1.7} fill={pal.leaderDot} />
            <text x={glyphPt.x} y={glyphPt.y} fontSize={22} fill={pal.planet} fontFamily={GLYPH_FONT} textAnchor="middle" dominantBaseline="central" filter="url(#glow)">
              {meta.glyph}
            </text>
            <text x={labelPt.x} y={labelPt.y} fontSize={9.5} fill={pal.planetLabel} textAnchor="middle" dominantBaseline="central" fontFamily='"Inter",sans-serif'>
              {Math.floor(p.degInSign)}°{p.retrograde ? " ℞" : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Axes({ chart, orient }: { chart: ChartFacts; orient: number }) {
  const { palette: pal } = useTheme();
  const asc = chart.asc!.lon;
  const mc = chart.mc!.lon;
  const ascP = polar(C, C, R.signInner, asc, orient);
  const descP = polar(C, C, R.signInner, asc + 180, orient);
  const mcP = polar(C, C, R.signInner, mc, orient);
  const icP = polar(C, C, R.signInner, mc + 180, orient);
  const label = (lon: number, t: string) => {
    const p = polar(C, C, R.signOuter + 14, lon, orient);
    return (
      <text x={p.x} y={p.y} fontSize={12} fill={pal.coreDot} textAnchor="middle" dominantBaseline="central" fontFamily='"Inter",sans-serif' fontWeight={600} letterSpacing="0.05em">
        {t}
      </text>
    );
  };
  return (
    <g>
      <line x1={ascP.x} y1={ascP.y} x2={descP.x} y2={descP.y} stroke={pal.axis} strokeWidth={1.4} />
      <line x1={mcP.x} y1={mcP.y} x2={icP.x} y2={icP.y} stroke={pal.axisSoft} strokeWidth={1.1} strokeDasharray="4 4" />
      {label(asc, "AC")}
      {label(asc + 180, "DC")}
      {label(mc, "MC")}
      {label(mc + 180, "IC")}
    </g>
  );
}

function FourStar({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts = [
    `${cx},${cy - r}`, `${cx + r * 0.18},${cy - r * 0.18}`, `${cx + r},${cy}`, `${cx + r * 0.18},${cy + r * 0.18}`,
    `${cx},${cy + r}`, `${cx - r * 0.18},${cy + r * 0.18}`, `${cx - r},${cy}`, `${cx - r * 0.18},${cy - r * 0.18}`,
  ].join(" ");
  return <polygon points={pts} fill={fill} />;
}
