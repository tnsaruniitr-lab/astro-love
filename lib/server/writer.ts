// The grounded AI reading writer (SPEC §7, finally built).
//
// Contract: the engine computes FACTS (aspects with stable ids, proofs,
// subscores, axes, overlays); the writer turns facts into warm prose in the
// user's language. The writer NEVER computes astrology — every claim must
// trace to a supplied fact id, and a validator + optional faithfulness pass
// enforce it. On any failure the caller falls back to the deterministic
// template copy, so the product never blocks on the model.
//
// Env:
//   ANTHROPIC_API_KEY       required for prose (absent → {available:false})
//   WRITER_MODEL            default claude-opus-4-8
//   FAITHFULNESS_MODEL      default claude-haiku-4-5 ("" disables the pass)

import Anthropic from "@anthropic-ai/sdk";
import type { SynastryResult } from "../astro/synastry";
import type { ChartFacts } from "../astro/types";
import { archetypeReading } from "../astro/insights";
import { contactFacts } from "../astro/enrich";

const WRITER_MODEL = process.env.WRITER_MODEL || "claude-opus-4-8";
const FAITHFULNESS_MODEL = process.env.FAITHFULNESS_MODEL ?? "claude-haiku-4-5";

export interface ProseSection {
  key: "essence" | "strengths" | "growth" | "advice";
  title: string;
  body: string;
}

export interface CoupleProse {
  sections: ProseSection[];
  usedFactIds: string[];
  locale: string;
  model: string;
  /** "passed" = the faithfulness model confirmed no invented astrology;
   *  "skipped" = the check was explicitly disabled (FAITHFULNESS_MODEL=""). */
  faithfulness: "passed" | "skipped";
}

export function proseAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// A single client with tight bounds: no SDK-level retries and a per-call
// timeout well under the /api/reading route budget, so a slow model can't hang
// the request (the caller falls back to template copy on timeout).
function anthropic(): Anthropic {
  return new Anthropic({ maxRetries: 0, timeout: 90_000 });
}

// ───────────────────────── fact contract ─────────────────────────

interface FactContract {
  names: { a: string; b: string };
  locale: string;
  score: number;
  band: string;
  axes: { ease: number; intensity: number };
  archetype: { name: string; topFacet: string; tilt: string };
  subscores: SynastryResult["subscores"];
  aspects: Array<{
    id: string;
    headline: string;
    valence: string;
    proof: string;
    timeSensitive?: boolean;
    // Deterministic technical mechanics the writer may reason over (never
    // invent beyond these): the aspect's element/modality and any dignity.
    mechanics: {
      aspect: string;
      orbTier: string;
      sharedElement: string | null;
      aModality: string;
      bModality: string;
      mutualReception: boolean;
      oneWayReception: boolean;
    };
  }>;
  overlays: Array<{ id: string; sentence: string }>;
  warnings: string[];
}

function buildFactContract(syn: SynastryResult, locale: string): FactContract {
  const arch = archetypeReading(syn);
  return {
    names: syn.names,
    locale,
    score: syn.score,
    band: syn.band.label,
    axes: syn.axes,
    archetype: { name: arch.name, topFacet: arch.topFacet.label, tilt: arch.tilt },
    subscores: syn.subscores,
    // Cap the fact list to the strongest contacts so the prompt stays lean;
    // outer-planet noise past 20 rarely changes a reading. Internal scoring
    // magnitudes (points/bonus) are deliberately omitted — grounding needs the
    // named contact and its proof, not the weight, and leaking the rubric into
    // the prompt/logs invites magnitude editorializing.
    aspects: syn.aspects.slice(0, 20).map((a) => {
      const f = contactFacts(a);
      return {
        id: a.id,
        headline: a.headline,
        valence: a.valence,
        proof: a.proof,
        ...(a.timeSensitive ? { timeSensitive: true } : {}),
        mechanics: {
          aspect: f.aspect,
          orbTier: f.orbTier,
          sharedElement: f.sharedElement,
          aModality: f.aModality,
          bModality: f.bModality,
          mutualReception: f.mutualReception,
          oneWayReception: !f.mutualReception && (f.aInBRuled || f.bInARuled),
        },
      };
    }),
    overlays: syn.overlays.map((o) => ({ id: o.id, sentence: o.sentence })),
    warnings: syn.warnings,
  };
}

// ───────────────────────── writer ─────────────────────────

const PROSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sections", "used_fact_ids"],
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "title", "body"],
        properties: {
          key: { type: "string", enum: ["essence", "strengths", "growth", "advice"] },
          title: { type: "string" },
          body: { type: "string" },
        },
      },
    },
    used_fact_ids: { type: "array", items: { type: "string" } },
  },
} as const;

const WRITER_SYSTEM = `You write the paid relationship reading for AstroMatch, a compatibility app whose whole promise is "real math, every point traces to a named aspect".

You receive computed astrological FACTS about one couple: inter-chart aspects (each with a stable id and an exact proof line), house overlays, sub-scores, and a two-axis score (ease = which way the contacts lean; intensity = how much is going on).

DEPTH — this is what people pay for. Each aspect carries "mechanics": its element (a trine shares an element), the two planets' modality (cardinal initiates, fixed sustains, mutable adapts), the orb tier (exact = one of the loudest notes), and dignity. When mechanics.mutualReception is true, SAY SO and explain it plainly — the two planets each sit in a sign the other rules, so they host each other and each makes the other stronger; it is the rarest and strongest cooperative signature, never skip it. Reason from these mechanics like an astrologer showing their work, not a horoscope column.

ABSOLUTE RULES — the product's credibility depends on them:
- Never invent, assume, or embellish a placement, aspect, sign, or house that is not in the supplied facts (including the mechanics). If a fact isn't there, it doesn't exist.
- Every astrological claim you make must be traceable to a fact id. List every fact id you drew on in used_fact_ids (at least 4).
- Facts marked timeSensitive depend on an unknown birth time — if you use one, say so naturally ("if the birth time holds…").
- Never predict events, dates, breakups, marriages, pregnancies, health or money outcomes. The chart shows how they relate, not what will happen. No fatalism: tension contacts are growth material, never doom.
- Write in the language given by "locale" (en, ru, uk, de, es, pl, sk, ar) at native quality — not translated-sounding. Use the couple's names naturally.

VOICE: warm, specific, grounded — like a wise friend who actually read their charts, not a horoscope column. Concrete over mystical. Second person plural ("you two") where natural in the target language. No em-dashes. Each section 60-120 words.

Write exactly four sections:
- essence: who these two are together — the shape of the bond in one vivid paragraph, anchored on the strongest contacts.
- strengths: what genuinely flows, citing the specific contacts behind it.
- growth: where the friction lives and what it's FOR — honest but constructive, citing the tension contacts.
- advice: three or four concrete, doable things this specific couple can act on this week, each rooted in a fact.`;

/** One grounded prose generation. Returns null when unavailable or when the
 *  output fails validation twice — callers then use the template fallback. */
export async function writeCoupleProse(
  syn: SynastryResult,
  locale: string,
): Promise<CoupleProse | null> {
  if (!proseAvailable()) return null;

  const client = anthropic();
  const facts = buildFactContract(syn, locale);
  const validIds = new Set<string>([
    ...facts.aspects.map((a) => a.id),
    ...facts.overlays.map((o) => o.id),
  ]);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: WRITER_MODEL,
        max_tokens: 4000,
        thinking: { type: "adaptive" },
        system: WRITER_SYSTEM,
        output_config: { format: { type: "json_schema", schema: PROSE_SCHEMA } },
        messages: [
          {
            role: "user",
            content: `FACTS (the only astrology that exists for this reading):\n${JSON.stringify(facts, null, 1)}${
              attempt > 0
                ? "\n\nYour previous attempt cited fact ids that do not exist. Cite only ids from the facts above."
                : ""
            }`,
          },
        ],
      });

      if (response.stop_reason === "refusal") return null;
      const text = response.content.find((b) => b.type === "text")?.text;
      if (!text) continue;
      const parsed = JSON.parse(text) as { sections: ProseSection[]; used_fact_ids: string[] };

      if (!validate(parsed, validIds)) continue;

      // Faithfulness: fail CLOSED. If the pass is enabled and does not return an
      // explicit "faithful" verdict (rejected, errored, or empty), we discard
      // this attempt rather than risk shipping invented astrology — the caller
      // then falls back to the always-faithful template copy.
      let faithfulness: CoupleProse["faithfulness"] = "skipped";
      if (FAITHFULNESS_MODEL) {
        if (!(await faithful(client, facts, parsed))) continue;
        faithfulness = "passed";
      }

      return {
        sections: parsed.sections,
        usedFactIds: parsed.used_fact_ids,
        locale,
        model: WRITER_MODEL,
        faithfulness,
      };
    } catch (err) {
      // API hiccup: one retry via the loop, then template fallback.
      console.error(`[writer] attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

/** Deterministic checks — cheap, no model involved. */
function validate(p: { sections: ProseSection[]; used_fact_ids: string[] }, validIds: Set<string>): boolean {
  if (!Array.isArray(p.sections) || p.sections.length !== 4) return false;
  const keys = new Set(p.sections.map((s) => s.key));
  if (!["essence", "strengths", "growth", "advice"].every((k) => keys.has(k as ProseSection["key"]))) return false;
  if (p.sections.some((s) => !s.body || s.body.trim().length < 80)) return false;
  if (!Array.isArray(p.used_fact_ids) || p.used_fact_ids.length < 4) return false;
  // Every cited fact must exist — the core anti-hallucination gate.
  return p.used_fact_ids.every((id) => validIds.has(id));
}

/** Second-model faithfulness pass: does every astrological claim in the prose
 *  trace to a supplied fact? Returns true ONLY on an explicit "faithful" verdict
 *  — fail CLOSED on rejection, error, or empty response, so a transient checker
 *  failure sends the reading to the (always-faithful) template fallback rather
 *  than shipping unverified prose. The checker sees the SAME fact set the
 *  deterministic validator authorized: aspects with proofs AND overlay
 *  sentences (not just headlines), so overlay-grounded prose isn't misjudged. */
async function faithful(
  client: Anthropic,
  facts: FactContract,
  prose: { sections: ProseSection[] },
): Promise<boolean> {
  const factLines = [
    ...facts.aspects.map((a) => `${a.headline} [${a.proof}]`),
    ...facts.overlays.map((o) => o.sentence),
  ];
  try {
    const response = await client.messages.create({
      model: FAITHFULNESS_MODEL,
      max_tokens: 300,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["faithful"],
            properties: { faithful: { type: "boolean" }, issue: { type: "string" } },
          },
        },
      },
      messages: [
        {
          role: "user",
          content: `FACTS (every real astrological contact for this couple):\n${JSON.stringify(factLines)}\n\nREADING:\n${prose.sections
            .map((s) => s.body)
            .join("\n\n")}\n\nDoes the reading make any astrological claim (a planet, sign, aspect, or house statement) that is NOT supported by the facts? Stylistic warmth and life advice are fine; invented astrology is not. Answer strictly.`,
        },
      ],
    });
    if (response.stop_reason === "refusal") return false;
    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) return false; // fail closed: no verdict means unverified
    const verdict = JSON.parse(text) as { faithful?: boolean; issue?: string };
    if (verdict.faithful !== true) console.warn("[writer] faithfulness pass rejected prose:", verdict.issue);
    return verdict.faithful === true;
  } catch {
    return false; // fail closed: a checker error must not pass unverified prose
  }
}

// ───────────────────────── natal love-answers prose ─────────────────────────

export interface NatalProse {
  answers: Array<{ q: string; body: string }>;
  locale: string;
  model: string;
}

const NATAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answers"],
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["q", "body"],
        properties: { q: { type: "string" }, body: { type: "string" } },
      },
    },
  },
} as const;

/** Grounded natal love-questions prose (the paid natal tier). */
export async function writeNatalProse(chart: ChartFacts, locale: string): Promise<NatalProse | null> {
  if (!proseAvailable()) return null;
  const client = anthropic();

  const placements = chart.planets.map((p) => ({
    body: p.body,
    sign: p.sign,
    house: p.house,
    retrograde: p.retrograde,
  }));
  const facts = {
    locale,
    name: chart.subject.name ?? null,
    timeKnown: chart.subject.timeKnown,
    placements,
    ascendantSign: chart.asc?.sign ?? null,
    warnings: chart.warnings,
  };

  try {
    const response = await client.messages.create({
      model: WRITER_MODEL,
      max_tokens: 3000,
      thinking: { type: "adaptive" },
      system: `You answer five love questions from ONE person's computed natal placements, for AstroMatch. Same absolute rules as all AstroMatch prose: only the supplied placements exist; never invent signs/houses; no event prediction or timing claims (a natal chart shows HOW someone loves, not WHEN things happen — say so if asked about timing); no fatalism; write natively in the "locale" language. Warm, specific, 50-90 words per answer. The five questions, in order: (1) What am I like in love? (2) What kind of partner suits me? (3) What do I need to feel loved? (4) When will I find love? — answer honestly that charts don't date events, then describe the energy they bring. (5) What helps my relationships last? If timeKnown is false, houses and the Ascendant are unavailable — say question 2 needs a birth time rather than guessing.`,
      output_config: { format: { type: "json_schema", schema: NATAL_SCHEMA } },
      messages: [{ role: "user", content: `PLACEMENTS:\n${JSON.stringify(facts, null, 1)}` }],
    });
    if (response.stop_reason === "refusal") return null;
    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as { answers: Array<{ q: string; body: string }> };
    if (!Array.isArray(parsed.answers) || parsed.answers.length !== 5) return null;
    if (parsed.answers.some((a) => !a.body || a.body.trim().length < 40)) return null;
    return { answers: parsed.answers, locale, model: WRITER_MODEL };
  } catch (err) {
    console.error("[writer] natal prose failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
