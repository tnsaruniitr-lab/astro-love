// Standalone "Love Language" quiz. Self-report (NOT astrology), kept separate
// from the chart engine. Uses the five widely-known love languages with our own
// wording and scenario questions (no trademarked assessment). Deterministic
// scorer, no em-dashes.
//
// Honest framing: the five love languages (Chapman, 1992) are a popular lens,
// but empirical support is mixed: studies find the categories overlap and most
// people value several, and matching one "primary" language does not predict
// relationship satisfaction better than general affection. We present this as a
// conversation starter, not a verdict. See RESEARCH_NOTE.

export type Mode = "words" | "acts" | "gifts" | "time" | "touch";

export interface ModeInfo {
  key: Mode;
  title: string;   // full name, e.g. "Words of Affirmation"
  short: string;   // compact, e.g. "Words"
  tagline: string;
  desc: string;
  askFor: string;
  speak: string;
}

export const MODES: ModeInfo[] = [
  {
    key: "words", title: "Words of Affirmation", short: "Words", tagline: "Spoken & written love",
    desc: "You feel most loved through affection put into words: specific compliments, encouragement, hearing 'I love you' and 'I'm proud of you' out loud or in a message. Vague praise does little, but precise, heartfelt words land deepest.",
    askFor: "Tell your partner that hearing it matters, and be specific about the kind of words that reach you. A detailed compliment outweighs a generic thanks.",
    speak: "Say what you appreciate, often and precisely. Leave a note, send a mid-day text.",
  },
  {
    key: "acts", title: "Acts of Service", short: "Acts", tagline: "Love shown through doing",
    desc: "You feel loved when your partner eases your load: doing a chore unasked, handling a dreaded task, taking responsibility so you do not carry it alone. To you, effort is affection and follow-through is everything.",
    askFor: "Name the few tasks that would mean the most, then let them genuinely help without redoing it after.",
    speak: "Do the useful thing before being asked, and follow through on it.",
  },
  {
    key: "gifts", title: "Receiving Gifts", short: "Gifts", tagline: "Thoughtful tokens",
    desc: "It is the thought, not the price. A well-chosen gift, even a tiny one, is a visible symbol that says 'I saw this and thought of you.' Forgotten occasions tend to sting more for you than for most.",
    askFor: "Share that small, thoughtful surprises mean more to you than expensive ones, and that dates and occasions matter.",
    speak: "Notice what they mention wanting, then surprise them with meaningful little tokens.",
  },
  {
    key: "time", title: "Quality Time", short: "Time", tagline: "Undivided attention",
    desc: "You feel loved through undivided attention: phones away, real conversation, doing things side by side. Presence beats presents, and being half-there can feel like being absent.",
    askFor: "Ask for protected, distraction-free time. Focus and eye contact matter more than how long it lasts.",
    speak: "Put devices away and give your full attention, even for ten real minutes.",
  },
  {
    key: "touch", title: "Physical Touch", short: "Touch", tagline: "Closeness you can feel",
    desc: "You feel loved through everyday physical closeness: a hand on your back, a hug, holding hands, falling asleep close. It is reassurance you can feel, and its absence reads as distance.",
    askFor: "Let your partner know that everyday touch, not only intimacy, is what keeps you connected.",
    speak: "Offer affection freely, a touch on the arm, a hug at hello and at goodbye.",
  },
];

export const modeInfo = (m: Mode) => MODES.find((x) => x.key === m)!;

export const RESEARCH_NOTE =
  "Based on the five love languages (Chapman, 1992), a popular way to talk about how we give and receive love. Worth knowing: research finds the five overlap and most people value several, so treat this as a conversation starter, not a verdict, and showing affection in many ways matters most.";

export interface Question { prompt: string; options: { mode: Mode; label: string }[] }

// Specific, scenario-based questions. Each offers all five modes as concrete actions.
export const QUESTIONS: Question[] = [
  {
    prompt: "After a stressful week, what would mean the most is your partner…",
    options: [
      { mode: "words", label: "telling you, in detail, how proud they are of how you handled it" },
      { mode: "acts", label: "quietly taking dinner, the dishes and the laundry off your plate" },
      { mode: "gifts", label: "bringing you flowers or a small gift, just because" },
      { mode: "time", label: "putting the phone away and giving you the whole evening" },
      { mode: "touch", label: "pulling you into a long hug and not letting go" },
    ],
  },
  {
    prompt: "Your partner quietly handles something stressful for you, the bills, a booking, a chore. What means the most is…",
    options: [
      { mode: "acts", label: "the plain relief that they just took care of it" },
      { mode: "words", label: "hearing them say they did it because they love you" },
      { mode: "time", label: "that it frees the two of you up to relax together" },
      { mode: "touch", label: "pulling them into a grateful hug for it" },
      { mode: "gifts", label: "the thought behind it, that they planned it just for you" },
    ],
  },
  {
    prompt: "A small thing that secretly means a lot: when they…",
    options: [
      { mode: "gifts", label: "pick up the exact thing you'd once mentioned wanting" },
      { mode: "words", label: "leave you a sweet note or text in the middle of the day" },
      { mode: "touch", label: "rest a hand on your back as they pass" },
      { mode: "acts", label: "fill up your car or fix the thing without being asked" },
      { mode: "time", label: "call just to hear about your day" },
    ],
  },
  {
    prompt: "What stings the most is when your partner…",
    options: [
      { mode: "time", label: "is right there but always on their phone" },
      { mode: "words", label: "stops noticing you, and never says thank you" },
      { mode: "touch", label: "goes cold and stops reaching for you" },
      { mode: "acts", label: "leaves you to carry everything alone" },
      { mode: "gifts", label: "forgets a date or occasion that mattered to you" },
    ],
  },
  {
    prompt: "On a genuinely hard day you most want…",
    options: [
      { mode: "touch", label: "to be held, words optional" },
      { mode: "words", label: "to hear 'you've got this, I believe in you'" },
      { mode: "acts", label: "someone to just take a task off your plate" },
      { mode: "time", label: "unhurried time to talk it all through" },
      { mode: "gifts", label: "a thoughtful little gift that says they were thinking of you" },
    ],
  },
  {
    prompt: "You are most likely to show love by…",
    options: [
      { mode: "acts", label: "doing practical things to make their life easier" },
      { mode: "words", label: "telling and texting them how much they mean to you" },
      { mode: "gifts", label: "picking out something they'd never buy themselves" },
      { mode: "time", label: "clearing your schedule to be fully present" },
      { mode: "touch", label: "being physically affectionate and close" },
    ],
  },
  {
    prompt: "The most romantic gesture, to you, is…",
    options: [
      { mode: "time", label: "a whole day together with nowhere to be" },
      { mode: "gifts", label: "a gift that shows they really get you" },
      { mode: "words", label: "a heartfelt letter you'll keep and reread" },
      { mode: "touch", label: "slow dancing in the kitchen" },
      { mode: "acts", label: "them handling every detail so you can relax" },
    ],
  },
  {
    prompt: "When you are apart for a while, you most miss…",
    options: [
      { mode: "touch", label: "their closeness, hugs and falling asleep together" },
      { mode: "words", label: "your daily 'good morning, I love you' messages" },
      { mode: "time", label: "your unhurried time together" },
      { mode: "acts", label: "the little things they quietly do around you" },
      { mode: "gifts", label: "the little gifts or souvenirs they'd bring back" },
    ],
  },
  {
    prompt: "Your partner says 'I love you' best when they…",
    options: [
      { mode: "words", label: "actually say it, often and specifically" },
      { mode: "touch", label: "show it through touch and closeness" },
      { mode: "acts", label: "show up and do, rather than just say" },
      { mode: "gifts", label: "mark it with something thoughtful" },
      { mode: "time", label: "give you their full, undivided attention" },
    ],
  },
  {
    prompt: "An ordinary Tuesday feels loving when they…",
    options: [
      { mode: "acts", label: "make your coffee or pack your lunch" },
      { mode: "touch", label: "kiss you hello and goodbye" },
      { mode: "words", label: "text you something sweet at lunch" },
      { mode: "time", label: "ask real questions about your day and listen" },
      { mode: "gifts", label: "surprise you with a small present for no reason" },
    ],
  },
  {
    prompt: "You would feel taken for granted if your partner stopped…",
    options: [
      { mode: "words", label: "complimenting you and saying thank you" },
      { mode: "acts", label: "helping out and pulling their weight" },
      { mode: "touch", label: "being physically affectionate" },
      { mode: "time", label: "making real time for just the two of you" },
      { mode: "gifts", label: "marking the little moments with a small gesture" },
    ],
  },
  {
    prompt: "Looking back, your happiest relationship moments were mostly about…",
    options: [
      { mode: "time", label: "time together, fully present" },
      { mode: "touch", label: "physical closeness and affection" },
      { mode: "words", label: "things that were said, out loud or in writing" },
      { mode: "acts", label: "the ways they showed up and took care of things" },
      { mode: "gifts", label: "meaningful things given and received" },
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

// ───────────────────── pairing with other love languages ─────────────────────
export type Level = "Effortless" | "Natural fit" | "Worth a little translation";
export interface Compat { level: Level; why: string }
export interface CompatRow { mode: ModeInfo; level: Level; why: string }

const ckey = (a: Mode, b: Mode) => [a, b].sort().join("|");

const PAIR_COMPAT: Record<string, Compat> = {
  "words|words": { level: "Effortless", why: "You both thrive on affirmation. Say it often and you will rarely feel unloved." },
  "acts|words": { level: "Worth a little translation", why: "One needs to hear it, one shows it by doing. Say it out loud as you do the deed." },
  "gifts|words": { level: "Natural fit", why: "Both love thoughtful gestures. A gift with a heartfelt note lands twice." },
  "time|words": { level: "Natural fit", why: "Affirmation lands deepest with full attention. Say it, eyes up, phone away." },
  "touch|words": { level: "Natural fit", why: "One speaks, one reaches. A warm word plus a touch covers you both." },
  "acts|acts": { level: "Effortless", why: "You both show love by doing. Actions speak, just add a few words now and then." },
  "acts|gifts": { level: "Natural fit", why: "Both express love through tangible things. A helpful act or a small gift, you each feel it." },
  "acts|time": { level: "Worth a little translation", why: "One shows love by doing, one wants presence. Do the task together and you meet in the middle." },
  "acts|touch": { level: "Natural fit", why: "One helps, one holds. Pair practical care with affection so neither feels missed." },
  "gifts|gifts": { level: "Effortless", why: "You both treasure thoughtful tokens. Keep them meaningful, not just frequent." },
  "gifts|time": { level: "Worth a little translation", why: "One gives objects, one gives hours. A planned day out is a gift and time in one." },
  "gifts|touch": { level: "Natural fit", why: "One treasures tokens, one craves closeness. Hand over the gift with a hug." },
  "time|time": { level: "Effortless", why: "You both crave presence. Protect your time together and you will thrive." },
  "time|touch": { level: "Effortless", why: "Both connect by being close and unhurried. This comes naturally." },
  "touch|touch": { level: "Effortless", why: "You both connect through closeness. Easy warmth, just keep words flowing too." },
};

export function compatFor(a: Mode, b: Mode): Compat {
  return PAIR_COMPAT[ckey(a, b)] ?? { level: "Natural fit", why: "Two ways of loving that can meet with a little care." };
}

/** Your primary language paired with each of the five, for the result page. */
export function compatList(primary: Mode): CompatRow[] {
  return MODES.map((m) => ({ mode: m, ...compatFor(primary, m.key) }));
}
