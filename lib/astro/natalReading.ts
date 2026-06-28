// Deterministic natal LOVE reading: grounded answers to a fixed set of love
// questions, drawn only from real placements (Venus, Mars, Moon, the 7th house,
// Saturn). No AI, no transits, no fatalism, no em-dashes.
//
// Honest by design: a natal chart shows HOW someone loves, not WHEN events
// happen, so timing questions return the love pattern plus a clear note that
// dating the future needs transits (a future milestone), not a prediction.

import type { ChartFacts } from "./types";

const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const VENUS_LOVE: Record<string, string> = {
  Aries: "you love fast and head first, bold and direct",
  Taurus: "you love slowly and sensually, loyal once you commit",
  Gemini: "you love through words, wit and curiosity",
  Cancer: "you love tenderly and protectively, all in emotionally",
  Leo: "you love warmly and generously, with loyalty and flair",
  Virgo: "you love through care and small, practical acts",
  Libra: "you love through romance, harmony and true partnership",
  Scorpio: "you love intensely and all or nothing, fiercely loyal",
  Sagittarius: "you love freely and adventurously, craving a fellow explorer",
  Capricorn: "you love seriously and for keeps, showing it through commitment",
  Aquarius: "you love as a friend first, valuing freedom and ideas",
  Pisces: "you love dreamily and selflessly, romantic to the core",
};

const MARS_DESIRE: Record<string, string> = {
  Aries: "you pursue boldly and want spark and challenge",
  Taurus: "you pursue steadily and want sensual, reliable passion",
  Gemini: "you pursue playfully and want mental chemistry",
  Cancer: "you pursue gently and want emotional safety first",
  Leo: "you pursue with flair and want to be adored",
  Virgo: "you pursue thoughtfully and want quiet devotion",
  Libra: "you pursue with charm and want a true equal",
  Scorpio: "you pursue magnetically and want deep, total intimacy",
  Sagittarius: "you pursue freely and want fun and adventure",
  Capricorn: "you pursue patiently and want someone worth building with",
  Aquarius: "you pursue unconventionally and want a kindred spirit",
  Pisces: "you pursue romantically and want a soulful connection",
};

const MOON_NEED: Record<string, string> = {
  Aries: "excitement and honest, direct affection",
  Taurus: "steadiness, touch and comfort",
  Gemini: "conversation and mental closeness",
  Cancer: "nurturing, safety and to feel cherished",
  Leo: "warmth, attention and appreciation",
  Virgo: "to feel useful and quietly cared for",
  Libra: "harmony, fairness and togetherness",
  Scorpio: "depth, trust and emotional truth",
  Sagittarius: "freedom, optimism and room to roam",
  Capricorn: "reliability and a partner who shows up",
  Aquarius: "friendship, independence and acceptance",
  Pisces: "tenderness, romance and emotional attunement",
};

const PARTNER: Record<string, string> = {
  Aries: "bold, decisive, energizing people",
  Taurus: "steady, grounded, sensual people",
  Gemini: "curious, talkative, quick witted people",
  Cancer: "caring, emotionally present, home loving people",
  Leo: "confident, warm, generous people",
  Virgo: "thoughtful, capable, grounded people",
  Libra: "balanced, charming, partnership minded people",
  Scorpio: "intense, loyal, deep people",
  Sagittarius: "free, adventurous, optimistic people",
  Capricorn: "mature, reliable, ambitious people",
  Aquarius: "independent, original, friendship first people",
  Pisces: "gentle, dreamy, compassionate people",
};

const SATURN_LOVE: Record<string, string> = {
  Aries: "keeping passion alive while learning patience",
  Taurus: "steady loyalty without slipping into routine",
  Gemini: "honest, consistent communication",
  Cancer: "building real emotional security over time",
  Leo: "steady appreciation, never taking each other for granted",
  Virgo: "patience with imperfection, theirs and yours",
  Libra: "real commitment, not just keeping the peace",
  Scorpio: "deep trust built slowly, and easing the grip of control",
  Sagittarius: "freedom inside commitment, growing together",
  Capricorn: "shared goals and showing up, year after year",
  Aquarius: "commitment that still respects independence",
  Pisces: "clear boundaries alongside the romance",
};

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

export interface LoveAnswer { q: string; key: string; answer: string; note?: string }

export function loveQuestions(chart: ChartFacts): LoveAnswer[] {
  const find = (b: string) => chart.planets.find((p) => p.body === b);
  const venus = find("Venus");
  const mars = find("Mars");
  const moon = find("Moon");
  const saturn = find("Saturn");

  const vSign = venus?.sign ?? "Libra";
  const mSign = mars?.sign ?? "Aries";
  const moSign = moon?.sign ?? "Cancer";
  const saSign = saturn?.sign ?? "Capricorn";

  const out: LoveAnswer[] = [];

  // 1. Love nature
  out.push({
    q: "What am I like in love?",
    key: "nature",
    answer: `Your Venus in ${vSign} means ${VENUS_LOVE[vSign] ?? "you love in your own distinct way"}. With Mars in ${mSign}, ${MARS_DESIRE[mSign] ?? "you chase love your own way"}.`,
  });

  // 2. Ideal partner (needs the Ascendant / 7th house)
  if (chart.asc) {
    const descSign = SIGN_NAMES[(chart.asc.signIndex + 6) % 12];
    const inSeventh = chart.planets.filter((p) => p.house === 7).map((p) => p.body);
    const seventhNote = inSeventh.length
      ? ` With ${inSeventh.join(" and ")} in your 7th house, partnership is a central theme for you.`
      : "";
    out.push({
      q: "What kind of partner suits me?",
      key: "partner",
      answer: `Your 7th house of partnership is ${descSign}, so you are drawn to ${PARTNER[descSign] ?? "people who complement you"}.${seventhNote}`,
    });
  } else {
    out.push({
      q: "What kind of partner suits me?",
      key: "partner",
      answer: "Your ideal-partner picture lives in the 7th house, which needs your exact birth time to calculate.",
      note: "Add your birth time on the left to unlock this and the houses.",
    });
  }

  // 3. Emotional needs
  out.push({
    q: "What do I need to feel loved?",
    key: "need",
    answer: `Your Moon in ${moSign} means you need ${MOON_NEED[moSign] ?? "your own kind of care"}. Give your partner this map, and ask for theirs.`,
  });

  // 4. Timing (honest, never a date)
  out.push({
    q: "When will I find love?",
    key: "timing",
    answer: `Your chart shows how you love, not the date. Your Venus in ${vSign} means ${VENUS_LOVE[vSign] ?? "you love in your own way"}, so that is the energy you will bring when you meet someone.`,
    note: "A birth chart is a fixed snapshot, so it cannot time future events. Dating the future needs transits (the moving sky against your chart), which we plan to add next, and even then it is a window, never a guarantee.",
  });

  // 5. Longevity (reframes "will I separate", non-fatalist)
  const saHouse = saturn?.house;
  const houseClause = saHouse
    ? ` Saturn sits in your ${ordinal(saHouse)} house, ${saHouse === 7 ? "right in your zone of partnership, so commitment is a serious, central theme for you" : "shaping where you build long-term security"}.`
    : "";
  out.push({
    q: "What helps my relationships last?",
    key: "longevity",
    answer: `For you, lasting love is about ${SATURN_LOVE[saSign] ?? "patience and showing up"}.${houseClause}`,
    note: "This is not a prediction of staying together or splitting. Your choices matter most. It simply shows where steady effort pays off for you.",
  });

  return out;
}
