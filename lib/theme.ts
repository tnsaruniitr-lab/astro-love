// Theme system: five switchable aesthetics.
//  - night    Cosmic Night  — deep, dark, starlit (the SaaS-leaning default)
//  - dawn     Rose Aurora   — soft warm cream, drifting blooms (love-suited)
//  - velvet   Velvet Rouge  — deep wine + rose-gold, rising hearts (love)
//  - peony    Peony Bloom   — soft pink, falling petals (love)
//  - twilight Twilight      — dusk indigo/violet, gentle aurora
//
// UI surfaces re-theme via CSS variables (globals.css). The SVG chart wheels
// use the resolved palette object below (CSS vars aren't reliable in SVG
// presentation attributes). `fx` drives the animated particle layer.

export type ThemeKey = "night" | "dawn" | "velvet" | "peony" | "twilight";
export type ThemeFx = "hearts" | "petals" | null;

export const THEME_KEYS: ThemeKey[] = ["night", "dawn", "velvet", "peony", "twilight"];

export const THEMES: {
  key: ThemeKey;
  label: string;
  hint: string;
  swatch: string;
  fx: ThemeFx;
}[] = [
  { key: "night", label: "Cosmic Night", hint: "deep & starlit", swatch: "linear-gradient(135deg,#0c0a1d,#2a2150 58%,#e8c887)", fx: null },
  { key: "dawn", label: "Rose Aurora", hint: "soft & warm", swatch: "linear-gradient(135deg,#fde3e6,#ffd9c9 52%,#cf8f80)", fx: null },
  { key: "velvet", label: "Velvet Rouge", hint: "deep & romantic ♥", swatch: "linear-gradient(135deg,#240b16,#7a1f3a 58%,#e7ad94)", fx: "hearts" },
  { key: "peony", label: "Peony Bloom", hint: "soft & dreamy ❀", swatch: "linear-gradient(135deg,#fbe2ea,#f6c3d4 52%,#d4567f)", fx: "petals" },
  { key: "twilight", label: "Twilight", hint: "dusk & violet", swatch: "linear-gradient(135deg,#191236,#5b46b0 55%,#e9b690)", fx: null },
];

export const themeMeta = (k: ThemeKey) => THEMES.find((t) => t.key === k)!;

export interface WheelPalette {
  discFrom: string;
  discMid: string;
  discTo: string;
  ring: string;
  ringSoft: string;
  ringFaint: string;
  tick: string;
  wedgeA: string;
  wedgeB: string;
  element: { fire: string; earth: string; air: string; water: string };
  planet: string;
  planetLabel: string;
  leader: string;
  leaderDot: string;
  core: string;
  coreStar: string;
  coreDot: string;
  axis: string;
  axisSoft: string;
  aspect: { harmonious: string; tension: string; blending: string };
  houseNum: string;
  houseNumAngular: string;
  personA: string;
  personB: string;
  sub: { emotional: string; attraction: string; affection: string; communication: string; commitment: string };
  gauge: { from: string; mid: string; to: string };
}

const NIGHT: WheelPalette = {
  discFrom: "#1a1538", discMid: "#100d28", discTo: "#0a0820",
  ring: "rgba(232,200,135,0.45)", ringSoft: "rgba(232,200,135,0.25)", ringFaint: "rgba(232,200,135,0.12)",
  tick: "rgba(232,200,135,0.22)", wedgeA: "rgba(232,200,135,0.05)", wedgeB: "rgba(120,86,200,0.06)",
  element: { fire: "#E0794B", earth: "#9DB07A", air: "#D8C36B", water: "#6FA8C7" },
  planet: "#f4e0b0", planetLabel: "rgba(239,233,246,0.75)", leader: "rgba(232,200,135,0.30)", leaderDot: "#e8c887",
  core: "rgba(232,200,135,0.30)", coreStar: "rgba(232,200,135,0.35)", coreDot: "#f4e0b0",
  axis: "rgba(232,200,135,0.6)", axisSoft: "rgba(232,200,135,0.45)",
  aspect: { harmonious: "#74b2c4", tension: "#dd8fa6", blending: "#e8c887" },
  houseNum: "rgba(167,159,196,0.55)", houseNumAngular: "rgba(244,224,176,0.8)",
  personA: "#f4e0b0", personB: "#c9b6f2",
  sub: { emotional: "#6fa8c7", attraction: "#dd8fa6", affection: "#e0a96b", communication: "#d8c36b", commitment: "#9db07a" },
  gauge: { from: "#f4e0b0", mid: "#e8c887", to: "#dd8fa6" },
};

const DAWN: WheelPalette = {
  discFrom: "#fdeef0", discMid: "#f8e2e6", discTo: "#f1d6dd",
  ring: "rgba(150,70,80,0.45)", ringSoft: "rgba(150,70,80,0.28)", ringFaint: "rgba(150,70,80,0.14)",
  tick: "rgba(150,70,80,0.28)", wedgeA: "rgba(189,111,111,0.07)", wedgeB: "rgba(154,130,196,0.08)",
  element: { fire: "#c75a3a", earth: "#6f8a4e", air: "#b1923a", water: "#3f7e93" },
  planet: "#7a3b46", planetLabel: "rgba(74,46,58,0.72)", leader: "rgba(150,70,80,0.4)", leaderDot: "#b56b73",
  core: "rgba(207,126,126,0.32)", coreStar: "rgba(189,111,111,0.4)", coreDot: "#c97e7e",
  axis: "rgba(150,70,80,0.55)", axisSoft: "rgba(150,70,80,0.4)",
  aspect: { harmonious: "#4f8693", tension: "#c4546f", blending: "#b97e74" },
  houseNum: "rgba(150,116,130,0.7)", houseNumAngular: "rgba(122,59,70,0.85)",
  personA: "#b56b73", personB: "#8a70b8",
  sub: { emotional: "#4f8693", attraction: "#c4546f", affection: "#c47e52", communication: "#a98a35", commitment: "#6f8a4e" },
  gauge: { from: "#e8a597", mid: "#cf7e7e", to: "#b56b73" },
};

const VELVET: WheelPalette = {
  discFrom: "#2e1320", discMid: "#20101a", discTo: "#160a12",
  ring: "rgba(231,173,148,0.45)", ringSoft: "rgba(231,173,148,0.25)", ringFaint: "rgba(231,173,148,0.12)",
  tick: "rgba(231,173,148,0.22)", wedgeA: "rgba(231,173,148,0.05)", wedgeB: "rgba(200,80,110,0.07)",
  element: { fire: "#ff8a5c", earth: "#b7c08a", air: "#e6cf8a", water: "#8fc0d6" },
  planet: "#f3c9b0", planetLabel: "rgba(243,223,226,0.75)", leader: "rgba(231,173,148,0.3)", leaderDot: "#e7ad94",
  core: "rgba(231,120,140,0.32)", coreStar: "rgba(231,173,148,0.4)", coreDot: "#f3c9b0",
  axis: "rgba(231,173,148,0.6)", axisSoft: "rgba(231,173,148,0.45)",
  aspect: { harmonious: "#7fb6c4", tension: "#ff7e9c", blending: "#e7ad94" },
  houseNum: "rgba(201,154,166,0.6)", houseNumAngular: "rgba(243,201,176,0.85)",
  personA: "#f3c9b0", personB: "#c9a7e6",
  sub: { emotional: "#7fb6c4", attraction: "#ff7e9c", affection: "#e7ad94", communication: "#e6cf8a", commitment: "#b7c08a" },
  gauge: { from: "#f3c9b0", mid: "#e88fa0", to: "#d4567f" },
};

const PEONY: WheelPalette = {
  discFrom: "#fbe2ea", discMid: "#f6d3df", discTo: "#efc3d4",
  ring: "rgba(150,60,90,0.42)", ringSoft: "rgba(150,60,90,0.26)", ringFaint: "rgba(150,60,90,0.13)",
  tick: "rgba(150,60,90,0.26)", wedgeA: "rgba(196,84,127,0.06)", wedgeB: "rgba(154,130,196,0.07)",
  element: { fire: "#c75a3a", earth: "#6f8a4e", air: "#b1923a", water: "#3f7e93" },
  planet: "#6e2e44", planetLabel: "rgba(90,46,68,0.72)", leader: "rgba(150,60,90,0.4)", leaderDot: "#c25f86",
  core: "rgba(212,86,127,0.28)", coreStar: "rgba(196,84,127,0.4)", coreDot: "#c25f86",
  axis: "rgba(150,60,90,0.5)", axisSoft: "rgba(150,60,90,0.38)",
  aspect: { harmonious: "#4f8693", tension: "#d4567f", blending: "#c98f86" },
  houseNum: "rgba(168,125,143,0.7)", houseNumAngular: "rgba(110,46,68,0.85)",
  personA: "#c25f86", personB: "#8a70b8",
  sub: { emotional: "#4f8693", attraction: "#d4567f", affection: "#c47e52", communication: "#a98a35", commitment: "#6f8a4e" },
  gauge: { from: "#f0a6be", mid: "#de6f93", to: "#c14f7c" },
};

const TWILIGHT: WheelPalette = {
  discFrom: "#241b46", discMid: "#191236", discTo: "#110d28",
  ring: "rgba(233,182,144,0.42)", ringSoft: "rgba(233,182,144,0.25)", ringFaint: "rgba(233,182,144,0.12)",
  tick: "rgba(233,182,144,0.22)", wedgeA: "rgba(233,182,144,0.05)", wedgeB: "rgba(150,120,230,0.07)",
  element: { fire: "#f0936a", earth: "#aebf86", air: "#e6cf8a", water: "#86c0d6" },
  planet: "#f3d3b0", planetLabel: "rgba(233,228,245,0.75)", leader: "rgba(233,182,144,0.3)", leaderDot: "#e9b690",
  core: "rgba(231,154,192,0.3)", coreStar: "rgba(233,182,144,0.4)", coreDot: "#f3d3b0",
  axis: "rgba(233,182,144,0.55)", axisSoft: "rgba(233,182,144,0.42)",
  aspect: { harmonious: "#86c0d0", tension: "#e79ac0", blending: "#e9b690" },
  houseNum: "rgba(169,159,201,0.6)", houseNumAngular: "rgba(243,211,176,0.85)",
  personA: "#f3d3b0", personB: "#c3aef0",
  sub: { emotional: "#86c0d0", attraction: "#e79ac0", affection: "#e9b690", communication: "#e6cf8a", commitment: "#aebf86" },
  gauge: { from: "#f3d3b0", mid: "#e79ac0", to: "#c3aef0" },
};

export const PALETTES: Record<ThemeKey, WheelPalette> = {
  night: NIGHT, dawn: DAWN, velvet: VELVET, peony: PEONY, twilight: TWILIGHT,
};
