// Zodiac + body metadata: names (en/ru), glyphs, and degree helpers.

import type { PlanetName } from "./types";

export const norm360 = (d: number): number => ((d % 360) + 360) % 360;

export interface SignMeta {
  key: string;
  en: string;
  ru: string;
  glyph: string;
  element: "fire" | "earth" | "air" | "water";
}

// Index 0 = Aries (tropical zodiac starts at 0° Aries = vernal point).
export const SIGNS: SignMeta[] = [
  { key: "Aries", en: "Aries", ru: "Овен", glyph: "♈", element: "fire" },
  { key: "Taurus", en: "Taurus", ru: "Телец", glyph: "♉", element: "earth" },
  { key: "Gemini", en: "Gemini", ru: "Близнецы", glyph: "♊", element: "air" },
  { key: "Cancer", en: "Cancer", ru: "Рак", glyph: "♋", element: "water" },
  { key: "Leo", en: "Leo", ru: "Лев", glyph: "♌", element: "fire" },
  { key: "Virgo", en: "Virgo", ru: "Дева", glyph: "♍", element: "earth" },
  { key: "Libra", en: "Libra", ru: "Весы", glyph: "♎", element: "air" },
  { key: "Scorpio", en: "Scorpio", ru: "Скорпион", glyph: "♏", element: "water" },
  { key: "Sagittarius", en: "Sagittarius", ru: "Стрелец", glyph: "♐", element: "fire" },
  { key: "Capricorn", en: "Capricorn", ru: "Козерог", glyph: "♑", element: "earth" },
  { key: "Aquarius", en: "Aquarius", ru: "Водолей", glyph: "♒", element: "air" },
  { key: "Pisces", en: "Pisces", ru: "Рыбы", glyph: "♓", element: "water" },
];

export const ELEMENT_COLOR: Record<SignMeta["element"], string> = {
  fire: "#E0794B",
  earth: "#9DB07A",
  air: "#D8C36B",
  water: "#6FA8C7",
};

export interface BodyMeta {
  key: PlanetName;
  en: string;
  ru: string;
  glyph: string;
}

export const BODIES: BodyMeta[] = [
  { key: "Sun", en: "Sun", ru: "Солнце", glyph: "☉" },
  { key: "Moon", en: "Moon", ru: "Луна", glyph: "☽" },
  { key: "Mercury", en: "Mercury", ru: "Меркурий", glyph: "☿" },
  { key: "Venus", en: "Venus", ru: "Венера", glyph: "♀" },
  { key: "Mars", en: "Mars", ru: "Марс", glyph: "♂" },
  { key: "Jupiter", en: "Jupiter", ru: "Юпитер", glyph: "♃" },
  { key: "Saturn", en: "Saturn", ru: "Сатурн", glyph: "♄" },
  { key: "Uranus", en: "Uranus", ru: "Уран", glyph: "♅" },
  { key: "Neptune", en: "Neptune", ru: "Нептун", glyph: "♆" },
  { key: "Pluto", en: "Pluto", ru: "Плутон", glyph: "♇" },
];

export const bodyMeta = (k: PlanetName): BodyMeta =>
  BODIES.find((b) => b.key === k)!;

export const signIndexFromLon = (lon: number): number =>
  Math.floor(norm360(lon) / 30) % 12;

export const degInSign = (lon: number): number => norm360(lon) % 30;

export const signFromLon = (lon: number): SignMeta => SIGNS[signIndexFromLon(lon)];

/** Format an ecliptic longitude as "23°12′ Taurus". */
export function formatLon(lon: number, lang: "en" | "ru" = "en"): string {
  const s = signFromLon(lon);
  const d = degInSign(lon);
  const deg = Math.floor(d);
  const min = Math.round((d - deg) * 60);
  const dd = min === 60 ? deg + 1 : deg;
  const mm = min === 60 ? 0 : min;
  return `${dd}°${String(mm).padStart(2, "0")}′ ${lang === "ru" ? s.ru : s.en}`;
}
