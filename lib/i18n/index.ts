// i18n core: locale list, RTL set, the UI string shape, and a tiny interpolator.
// Stage 1 covers UI chrome. The generated reading copy is localized in Stage 2.

import { EN } from "./en";
import { RU } from "./ru";
import { UK } from "./uk";
import { SK } from "./sk";
import { PL } from "./pl";
import { DE } from "./de";
import { ES } from "./es";
import { AR } from "./ar";

export type Locale = "en" | "ru" | "uk" | "sk" | "pl" | "de" | "es" | "ar";

export const LOCALES: { code: Locale; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "sk", name: "Slovenčina" },
  { code: "pl", name: "Polski" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "ar", name: "العربية" },
];

export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const RTL_LOCALES: Locale[] = ["ar"];
export const isRtl = (l: Locale) => RTL_LOCALES.includes(l);

export interface UIStrings {
  nav: { compatibility: string; natal: string; loveLanguage: string };

  birth: {
    nameOptional: string; placeholderA: string; placeholderB: string;
    birthplace: string; birthplaceHelp: string;
    day: string; month: string; year: string; hour: string; minute: string;
    timeUnknown: string; months: string[];
  };

  compat: {
    eyebrow: string; h1a: string; h1b: string; subtitle: string; empty: string;
    personA: string; personB: string; calculate: string; calculating: string;
    choosePlace: string; // "Please choose {who}'s birthplace from the list"
    revealedOfTotal: string; // "{n} / {total}"
    revealedWord: string; revealAll: string; tapToReveal: string;
    hints: { score: string; type: string; thread: string; dims: string; tend: string; flowgrow: string; wheel: string; brings: string; shine: string };
    youTwoAre: string;
    leanInto: string; gentlyWatch: string; whyThisType: string; strongest: string;
    easyCount: string; growthCount: string; // "{n} easy", "{n} growth"
    strongestThread: string; strongestThreadTag: string; almostExact: string; remarkablyTight: string;
    fiveDimensions: string; strongestLabel: string; tenderestLabel: string;
    tendTitle: string; tendSub: string;
    flowGrowTitle: string; flowGrowSub: string; whereFlow: string; whereFlowSub: string; whereGrow: string; whereGrowSub: string;
    noneNormal: string; plusStreak: string; seeAll: string; showLess: string;
    wheelTitle: string; inner: string; outer: string; harmonious: string; challenging: string; conjunction: string;
    bringsTitle: string; bringsSub: string; brings: string; noOverlays: string;
    shineTitle: string; youShine: string; oneToTend: string;
    share: { title: string; copyLink: string; copyCaption: string; saveImage: string; copied: string };
    footer1: string; footer2: string;
  };

  natal: {
    eyebrow: string; h1a: string; h1b: string; subtitle: string; empty: string;
    yourBirthDetails: string; birthDetailsSub: string; revealChart: string; readingSky: string;
    yourChart: string; sun: string; moon: string; rising: string; unknown: string;
    ascendant: string; midheaven: string; planet: string; position: string; house: string;
    timeUnknownTag: string;
    whyReal: string; whyRealBody: string;
    askLove: string; askLoveSub: string;
    footer1: string; footer2: string;
  };

  ll: {
    eyebrow: string; h1a: string; h1b: string; subtitle: string;
    questionOf: string; back: string;
    yourLoveLanguage: string; secondaryNote: string; // "With a strong secondary note of {x}."
    shareResult: string; askForIt: string; speakToOthers: string; retake: string; checkCompat: string;
    howYouPair: string; howYouPairSub: string; // "When your {lang} meets someone who speaks…"
    levels: { effortless: string; naturalFit: string; translation: string };
    footer1: string; footer2: string;
  };

  pay: {
    title: string; cta: string; price: string;
    perkOnce: string; perkInstant: string; perkAll: string;
    compat: string; natal: string; love: string;
  };
}

const DICTS: Record<Locale, UIStrings> = { en: EN, ru: RU, uk: UK, sk: SK, pl: PL, de: DE, es: ES, ar: AR };

export const getUI = (locale: Locale): UIStrings => DICTS[locale] ?? EN;

/** Replace {name} placeholders, e.g. t("{n} / {total}", {n:3, total:8}). */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
