// Standalone "Your Love Language" quiz. Self-report (NOT astrology) — kept
// deliberately separate from the chart engine. Original wording and questions
// so we use the common five modes of giving/receiving love without the
// trademarked branding. Deterministic scorer, no em-dashes.

export type Mode = "words" | "acts" | "gifts" | "time" | "touch";

export interface ModeInfo {
  key: Mode;
  title: string;
  tagline: string;
  desc: string;
  askFor: string;
  speak: string;
}

export const MODES: ModeInfo[] = [
  {
    key: "words", title: "Words", tagline: "Words of love",
    desc: "You feel most loved through spoken and written affection: compliments, encouragement, an honest 'I am proud of you.'",
    askFor: "Tell your partner that hearing it out loud matters. A specific compliment lands far harder than a generic thanks.",
    speak: "Say what you appreciate, often and specifically. Leave a note where they will find it.",
  },
  {
    key: "acts", title: "Acts", tagline: "Acts of care",
    desc: "You feel loved when someone lightens your load: handling a task, fixing the thing, showing up with help.",
    askFor: "Name the few things that would mean the most, and then let them actually help.",
    speak: "Do the small useful thing before being asked.",
  },
  {
    key: "gifts", title: "Gifts", tagline: "Thoughtful tokens",
    desc: "It is not about money, it is the thought. A small gift says 'I was thinking of you' in a form you can hold.",
    askFor: "Share that little thoughtful surprises mean more to you than big expensive ones.",
    speak: "Notice what they mention wanting, then surprise them with it.",
  },
  {
    key: "time", title: "Time", tagline: "Quality time",
    desc: "You feel loved through undivided attention: phones away, fully present, just the two of you.",
    askFor: "Ask for protected, distraction-free time together. Presence matters more than length.",
    speak: "Put devices away and give your full focus, even for ten minutes.",
  },
  {
    key: "touch", title: "Touch", tagline: "Physical closeness",
    desc: "You feel loved through everyday affection: a hand on your back, a hug, closeness that says 'I am here.'",
    askFor: "Let your partner know everyday touch, not only intimacy, keeps you connected.",
    speak: "Offer affection freely, a touch on the arm, a hug at hello.",
  },
];

export const modeInfo = (m: Mode) => MODES.find((x) => x.key === m)!;

export interface Question { prompt: string; options: { mode: Mode; label: string }[] }

// Each question offers all five modes, phrased per scenario.
export const QUESTIONS: Question[] = [
  {
    prompt: "A perfect evening together is…",
    options: [
      { mode: "time", label: "phones away, just the two of you" },
      { mode: "touch", label: "curled up close, no space between you" },
      { mode: "words", label: "talking for hours and really being heard" },
      { mode: "acts", label: "them handling everything so you can unwind" },
      { mode: "gifts", label: "a little surprise waiting for you" },
    ],
  },
  {
    prompt: "You feel most loved when your partner…",
    options: [
      { mode: "words", label: "tells you exactly what they admire about you" },
      { mode: "acts", label: "takes something off your plate unasked" },
      { mode: "touch", label: "reaches for your hand out of nowhere" },
      { mode: "gifts", label: "brings home something that made them think of you" },
      { mode: "time", label: "clears their schedule to be with you" },
    ],
  },
  {
    prompt: "After a hard day, you most want…",
    options: [
      { mode: "touch", label: "a long, wordless hug" },
      { mode: "words", label: "reassurance that you have got this" },
      { mode: "acts", label: "them to cook so you do not have to" },
      { mode: "time", label: "to just be together, no agenda" },
      { mode: "gifts", label: "a small treat to lift your mood" },
    ],
  },
  {
    prompt: "It stings the most when your partner…",
    options: [
      { mode: "time", label: "is always distracted or busy" },
      { mode: "words", label: "never notices or says thank you" },
      { mode: "touch", label: "pulls away physically" },
      { mode: "acts", label: "leaves you to handle everything alone" },
      { mode: "gifts", label: "forgets a date that mattered to you" },
    ],
  },
  {
    prompt: "You naturally show love by…",
    options: [
      { mode: "acts", label: "doing helpful things for them" },
      { mode: "touch", label: "being affectionate and close" },
      { mode: "words", label: "telling them how much they mean to you" },
      { mode: "gifts", label: "finding the perfect little present" },
      { mode: "time", label: "giving them your full attention" },
    ],
  },
  {
    prompt: "The line that melts you…",
    options: [
      { mode: "words", label: "\"You mean everything to me.\"" },
      { mode: "time", label: "\"Let us spend the whole day together.\"" },
      { mode: "touch", label: "\"Come here.\"" },
      { mode: "acts", label: "\"I took care of it so you would not have to.\"" },
      { mode: "gifts", label: "\"I saw this and thought of you.\"" },
    ],
  },
  {
    prompt: "On your birthday you would love…",
    options: [
      { mode: "gifts", label: "a gift chosen just for you" },
      { mode: "time", label: "a whole day together, nowhere to be" },
      { mode: "words", label: "a heartfelt message you will reread" },
      { mode: "acts", label: "them taking care of every detail" },
      { mode: "touch", label: "lots of closeness and affection" },
    ],
  },
  {
    prompt: "You feel disconnected when…",
    options: [
      { mode: "touch", label: "there is no physical affection" },
      { mode: "time", label: "you never get real time together" },
      { mode: "words", label: "there is no warmth in their words" },
      { mode: "acts", label: "you feel unsupported and alone in it" },
      { mode: "gifts", label: "the little gestures dry up" },
    ],
  },
];

export interface RankRow { mode: ModeInfo; count: number; pct: number }
export interface LoveLanguageResult { primary: ModeInfo; secondary: ModeInfo; ranking: RankRow[] }

// Tie-break order (most physically/temporally immediate first).
const TIE_ORDER: Mode[] = ["touch", "time", "words", "acts", "gifts"];

export function scoreLoveLanguage(answers: Mode[]): LoveLanguageResult {
  const counts = new Map<Mode, number>(MODES.map((m) => [m.key, 0]));
  for (const a of answers) counts.set(a, (counts.get(a) ?? 0) + 1);
  const total = answers.length || 1;

  const ranking: RankRow[] = MODES
    .map((m) => ({ mode: m, count: counts.get(m.key) ?? 0, pct: Math.round(((counts.get(m.key) ?? 0) / total) * 100) }))
    .sort((x, y) => y.count - x.count || TIE_ORDER.indexOf(x.mode.key) - TIE_ORDER.indexOf(y.mode.key));

  return { primary: ranking[0].mode, secondary: ranking[1].mode, ranking };
}
