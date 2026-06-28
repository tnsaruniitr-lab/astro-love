# Astro-Love — Technical & Product Specification (v1)

**Working title:** Astro-Love (брендинг TBD — see §13)
**One line:** A Russian-native, synastry-first Web PWA that answers love questions from *real* astrological math (computed planetary positions + transparent aspect scoring), with warm, grounded AI readings in Russian, Ukrainian, and English.
**Status:** Draft spec for review. No code yet.
**Branch:** `claude/horoscope-love-app-slavic-6xm8ai`

> This document is the engineering + product contract for the MVP. The astrology *math* (Part B) and the few genuine accuracy traps in it have been fact-checked against the `astronomy-engine` source, Kerykeion, astrology references, the IANA tz database, GDPR text, and the Claude API reference. Points that **must be verified during implementation** are tagged **⚠️ VERIFY**.

---

## 0. Decisions locked for v1

| Decision | Choice | Why |
|---|---|---|
| Platform | **Web app (Next.js App Router PWA)** | Works everywhere via link, installable, no app-store gatekeeping; Telegram bot is a fast-follow channel (§11). |
| Languages | **Russian + Ukrainian + English** | Russian-first audience; Ukrainian is a first-class language, **not** a Russian variant; English for diaspora/SEO. |
| Astrology engine | **`astronomy-engine` (MIT)** + our own astrology layer | License-safe for a closed-source commercial app (avoids Swiss Ephemeris AGPL/commercial fee). |
| AI layer | **Claude API** (`claude-opus-4-8` deep / `claude-haiku-4-5` volume), strictly grounded | Generates the *words*, never the *numbers*. |
| Core product shape | **Synastry-first, math-explainable** | The market gap (see §4): not vague sun-signs, not a black-box score. |

---

## 1. Vision & the core idea

Most horoscope apps feel like fortune cookies because they use only **sun signs**. Astro-Love is differentiated by being **computationally real**: the "science/math" of astrology is *astronomy* — the precise positions of the Sun, Moon, and planets at an exact birth moment and place. That is a deterministic calculation. Love compatibility then comes from **established synastry techniques applied to two charts**, scored with a transparent, weighted rubric where *every point traces to a named aspect*.

So the promise — "accurate, math-based love answers" — is delivered by **computing real positions** and **explaining the score**, and an AI layer turns the numbers into warm, readable answers in the user's language.

**Two strictly separated layers:**

```
┌──────────────────────────────────────────────────────────────────┐
│  A. DETERMINISTIC ENGINE (the math) — no LLM                       │
│     birth data → UTC + lat/long → planet longitudes → Asc/MC/      │
│     houses → aspects → synastry score → composite/Davison          │
│     ───────────────────────────────────────────────────────────   │
│     OUTPUT: versioned "chart-facts" JSON (the single source of     │
│             truth, with stable fact_ids)                            │
└──────────────────────────────────────────────────────────────────┘
                                │  chart-facts JSON
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  B. AI INTERPRETATION LAYER (the words) — Claude                    │
│     interprets ONLY the chart-facts JSON; never invents or          │
│     recomputes a placement; writes natively in ru/uk/en            │
└──────────────────────────────────────────────────────────────────┘
```

This separation is the central design rule. The LLM is an **interpreter/writer**, never a calculator. If we ever let it "verify" or recompute astronomy, we reintroduce exactly the hallucination risk the architecture removes.

---

## 2. Product principles

1. **Synastry-first.** The hero feature is two-person compatibility, not a solo daily horoscope.
2. **Transparent math ("прозрачная математика").** Every score shows *why*: the named aspects that produced it. Brand wedge: *"не мистика, а точные наблюдения"* — not mysticism, precise observation.
3. **Russian-native, not translated.** UI and AI copy authored natively per locale.
4. **Warm, non-fatalistic, respectful.** Empowerment framing, not "when will you marry" pressure; never deterministic doom.
5. **Trust & honesty.** Entertainment framing; name both strengths and frictions; graceful degradation when birth time is unknown.
6. **Privacy by design.** Birth data is sensitive; partner data is handled with special care (§9).

---

## 3. Scope

### v1 (MVP) — in scope
- Birth-data intake for the user and a partner (date, **exact time**, place).
- Geocoding (place → lat/long) + correct **historical** timezone resolution.
- Natal chart computation (10 planets + Asc/MC/houses).
- **Synastry**: inter-chart aspects + a 0–100 compatibility score with 5 sub-scores, fully explainable.
- AI love reading grounded in the computed facts, in the user's locale.
- Pay-per-question / freemium paywall (§11).
- Trilingual UI (ru/uk/en) with the astrology glossary (§8).
- Legal: entertainment disclaimer, GDPR-compliant consent + deletion, Russia geo-exclusion (§9).

### v1 — explicitly out of scope (fast-follows)
- Telegram Mini App + bot (high-value channel; v1.1).
- Composite & Davison relationship charts (engine designed for them now; surface later).
- Transits / "good timing for love" predictions.
- Live human-astrologer consultations (high-ARPU tier, later).
- Native iOS/Android.
- Sidereal zodiac / Vedic.

---

## 4. Market & differentiation (brief)

The astrology-app market is ~$4–5B and growing ~20–25%/yr; subscriptions ≈46% of revenue; women 18–40 dominate; **compatibility/synastry is the #1 paid-feature category.**

| App | What it is | Synastry depth |
|---|---|---|
| Co-Star | Social/AI, minimalist, NASA ephemeris | Light comparison |
| The Pattern | Psychological profiling (not real planets/houses) | "Bonds" = psychological, not astrological |
| Nebula | Most polished mass-market relationship app + psychic chat | Strong (the one to beat) |
| Sanctuary / CHANI | Live readers / human-written content & rituals | Consultation/content-led |
| **RU/CIS incumbents** | Telegram bots (Natalon ~100₽/mo, LunaCode, Astario, Saturn.Love) + free web calculators (geocult, astro-seek RU, Chronos, Misterius) | Mostly vague or free web tools |

**Gap Astro-Love fills:** a **Russian-native, synastry-first, math-explainable** product that shows *why* a couple scores what they score (by planet/aspect), versus vague sun-sign blurbs (Co-Star/web calculators) and opaque psychological scores (The Pattern). English-centric apps have weak/awkward RU localization and unreliable RU payments.

*(Figures are directional vendor estimates; validate before putting in a business model. "Stellar" as a major synastry player could not be confirmed.)*

---

# PART A — The Deterministic Engine (the math)

This is where credibility lives. The engine is a pure, deterministic function of birth data → `chart-facts` JSON. Same inputs ⇒ identical output, always reproducible, no randomness anywhere.

## 5. Data flow: birth input → UTC instant + coordinates

Accurate charts depend entirely on getting the **exact UTC instant** and **lat/long** right. This is the most error-prone non-obvious step.

### 5.1 Place → latitude/longitude (geocoding)
- **Recommended:** bundle a **GeoNames cities database** (e.g. `cities500`/`cities1000`) and offer a typeahead city picker. Offline, privacy-friendly (no per-keystroke calls to a third party), deterministic, and avoids sending birth-place to an external geocoder.
- **Fallback / long tail:** OpenStreetMap **Nominatim** or a commercial geocoder (Google/Mapbox) for places not in the bundle. Note the privacy implication: a geocoding request leaks birth place to a third party — prefer the bundled DB; if you must call out, do it server-side and don't log it.

### 5.2 lat/long → IANA time zone
- **Recommended (server-side): `geo-tz`** — exact timezone-polygon lookup, the most accurate option (~892 kB; ~30% of random points / ~10% of inhabited points near borders disagree with the cheaper approximators). Its full dataset is appropriate for pre-1970 coordinates too.
- **Lightweight alt:** `tz-lookup` / `@photostructure/tz-lookup` (~72 kB, ~100× faster, approximate near borders) — only if you need a tiny browser bundle. **For a Next.js app, resolve the zone server-side with `geo-tz`** and keep the client thin.
- Output is a standard IANA zone id (e.g. `Europe/Moscow`, `Europe/Kyiv`).

### 5.3 Local birth time + IANA zone → UTC instant ⚠️ critical for accuracy
- Resolve the **historical** offset for the *exact birth instant* using the **IANA tz database** via **Luxon** (`DateTime.fromObject({...}, { zone })` → `.toUTC()`) or `date-fns-tz`. **Do not apply the modern offset to an old birth.**
- **Why it matters (confirmed):** Eastern Europe / former-USSR have a notoriously messy DST/offset history, and the IANA db encodes it. Example: USSR Council of Ministers Act No. 925 (1980-10-24) set DST transitions for **1981–1984** (forward Apr 1 00:00; back Oct 1 00:00 in 1981–1983); Russia introduced permanent "decree time," abolished DST in 2011, and shifted again in 2014. Applying today's `Europe/Moscow` offset to a 1983 Moscow birth shifts the chart by an hour → **Ascendant and house cusps off by ~15°** (the Asc moves ~1°/4 min). The IANA db (post-1970 reliable; pre-1970 `backzone`, less reliable) captures these transitions; Luxon reads them. This is the difference between a credible chart and a wrong one.
- Pre-1970 births: IANA uses LMT (local mean time) before standardization in many zones — acceptable for astrology, but flag lower confidence.

### 5.4 Unknown birth time
Many users (especially via SEO "по дате рождения") won't know their birth time. Degrade gracefully:
- Compute with **noon local** as a placeholder.
- **Disable** all time-dependent features: Ascendant, MC, houses, and house overlays.
- Widen the **Moon** caveat (the Moon moves ~12–15°/day, so its degree — and any Moon aspect orb — is uncertain).
- Mark `birth_time_known: false` in the facts JSON; the AI layer must say so and upsell "add your birth time for the full chart."

---

## 6. Ephemeris: using `astronomy-engine` correctly

`astronomy-engine` (cosinekitty, MIT) is a high-precision **positional-astronomy** library. It has **no astrology layer** — no Ascendant, MC, or house-cusp functions exist. We compute all of that ourselves (§6.3).

### 6.1 Planet ecliptic longitudes (the zodiac positions)

| Body | Function | Read |
|---|---|---|
| Sun | `SunPosition(time)` | `.elon` (geocentric, ecliptic-of-date) |
| Moon | `EclipticGeoMoon(time)` | `.lon` (geocentric, **true ecliptic of date**) |
| Mercury…Pluto | `GeoVector(body, time, /*aberration*/ true)` → `Ecliptic(vec)` | `.elon` |

**⚠️ VERIFY — the single most important engine gotcha (two parts):**
1. **Never use `EclipticLongitude(body, time)`** — it is **heliocentric** (Sun-centered), not geocentric. Using it produces wrong zodiac positions. This is the most likely bug.
2. **Frame of `Ecliptic()`**: the engine docs describe `SunPosition`/`EclipticGeoMoon` as **ecliptic-of-date (ECT)** = the tropical zodiac (already precessed + nutated; no ayanamsa needed). The adversarial review flagged that `Ecliptic(GeoVector(...))` for the **planets** may return **J2000-frame** longitudes, not of-date — which would introduce a **precession error of ~50″/yr (~0.36° by 2026)**. **Implementation must confirm the planet path is of-date**; if `Ecliptic()` is J2000, rotate the vector EQJ→EQD→ECT (the library provides the rotation matrices) **before** reading longitude. Validate against astro.com reference charts (§6.6). The Sun/Moon convenience functions are confirmed of-date.

Bodies available: `Body.Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto` (Pluto included). Chiron/asteroids/Lilith are **not** available — would need another ephemeris; out of scope for v1.

### 6.2 Retrograde, nodes, sidereal time
- **Retrograde:** no built-in flag. Sample geocentric ecliptic longitude at `t` and `t + ~0.5 day`, unwrap across 0/360; if `d(elon)/dt < 0` it's retrograde. Skip Sun/Moon (never retrograde geocentrically).
- **Lunar nodes:** `SearchMoonNode` / `NextMoonNode` give the **true** node. If we want the **mean** node (common in Western astrology), compute from a Meeus polynomial (`Ω = 125.04452 − 1934.136261·T + …`, T = Julian centuries TT from J2000). **Open decision** (§13): true vs mean node — they can differ >1°.
- **Sidereal time:** `SiderealTime(date)` returns **Greenwich Apparent Sidereal Time (GAST) in hours [0,24)**. Multiply by 15 for degrees. ⚠️ It's in *hours*, not degrees or radians.

### 6.3 Ascendant, Midheaven, and houses (we implement these)

Let `phi` = geographic latitude (north +), `eps` = obliquity of the ecliptic (use **true** obliquity for frame consistency with ECT longitudes + GAST), and:

```
GAST_deg = SiderealTime(time) * 15
LST_deg  = (GAST_deg + observerLongitudeEast_deg) mod 360   // RAMC
```
⚠️ Observer longitude must be **east-positive**. Many datasets store west-positive; getting it backwards mirrors the chart east/west.

**Midheaven (MC):**
```
MC = atan2( sin(RAMC), cos(RAMC) * cos(eps) )   // normalize to [0,360)
```

**Ascendant:**
```
Asc = atan2( cos(RAMC), -( sin(RAMC)*cos(eps) + tan(phi)*sin(eps) ) )   // [0,360)
```
⚠️ Use two-argument `atan2`, not `atan` (single-arg is quadrant-ambiguous and silently yields a chart 180° off). Apply the explicit quadrant fix so the Ascendant leads the MC by ~90° (add 180° if `(Asc − MC)` normalized is not in `(0,180)`).

**Obliquity:** replicate the engine's `mean_obliq` IAU polynomial
`arcsec = ((((( -0.0000000434*t -0.000000576)*t +0.00200340)*t -0.0001831)*t -46.836769)*t +84381.406)`, `t = TT_Julian_centuries/36525`, return `arcsec/3600`; add nutation `deps` for true obliquity. (Or derive from the library's `e_tilt`.)

**House systems:**
- **Whole-Sign (default, v1):** trivial and robust at all latitudes. `cusp1 = floor(Asc/30)*30`; `cuspN = (cusp1 + 30*(N-1)) mod 360`. Planets assigned by 30° sign. **Use this as the safe default**, especially above the polar circles.
- **Placidus (optional):** iterative trisection of diurnal/nocturnal semi-arcs (`SA = acos(-tan phi * tan delta)`, `delta = asin(sin eps * sin L)`), per the Munkasey formulary. ⚠️ **Undefined/unstable above |lat| > ~66.5°** — fall back to Whole-Sign/Porphyry there.

### 6.4 Aspects

For two longitudes: `angle = abs(lonA − lonB); if angle > 180: angle = 360 − angle`. For each major aspect, `orb = abs(angle − aspectAngle)`; it's an aspect if `orb ≤ allowedOrb`.

| Aspect | Angle | Base orb | Valence |
|---|---|---|---|
| Conjunction | 0° | 8° | blending (planet-dependent) |
| Sextile | 60° | 4° | harmonious |
| Square | 90° | 6° | tension (positive for romance) |
| Trine | 120° | 7° | harmonious |
| Quincunx | 150° | 3° | mild adjustment (toggleable) |
| Opposition | 180° | 7° | attraction + tension |

**Luminary bonus:** if either body is Sun/Moon, `allowedOrb += 1.5`; if both are luminaries, `+= 2.0` (use the larger, not additive). Orbs are mainstream-consensus and **must live in a config object** (astrologers disagree; expose them, don't hardcode as "truth").

### 6.5 Synastry compatibility score (the explainable rubric)

This is the heart of the product. It is fully deterministic and every point is a human-readable sentence.

**Bodies used:** Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, plus Ascendant/Descendant (and MC). Load-bearing for romance: Sun, Moon, Venus, Mars, Saturn, Asc.

**Pipeline:**

1. **Detect aspects** between every A-planet × B-planet pair (§6.4). De-duplicate symmetric pairs (A.Venus–B.Mars == B.Mars–A.Venus). **Keep both directions for planet-to-Angle contacts** (A.Venus on B's Asc ≠ B.Venus on A's Asc).

2. **Per-aspect points** `= W_pair × C_aspect × T_orb`:

   **`W_pair` (planet-pair weight, tunable):**
   | Pair | W | Pair | W |
   |---|---|---|---|
   | Sun–Moon | 10 | Moon–Mars | 6 |
   | Venus–Mars | 9 | Sun–Saturn / Moon–Saturn | 5 |
   | Moon–Venus / Sun–Venus | 7 | Mars–Mars | 5 |
   | Moon–Moon / Venus–Venus | 6 | Sun–Sun | 4 |
   | Venus–Saturn (commitment) | 6 | Mars–Saturn / Venus·Jupiter / Mars·Jupiter | 4 |
   | Asc ↔ Sun/Moon/Venus/Mars | 6 | Mercury–Mercury / Mercury–Moon | 4 |
   | (any other personal-planet pair) | 2 | (outer/filler) | 1 |

   **`C_aspect` (aspect-type coefficient — hard aspects are NET POSITIVE for romance):**
   trine 1.0; sextile 0.7; opposition 0.6; square 0.5; quincunx 0.3; **conjunction is planet-aware** — 1.0 for benefic blends (Venus, Moon, Sun, Jupiter), 0.6 for Saturn/Mars conjunct a personal planet (binding/heavy).

   **`T_orb` (tightness, rewards exactness):** `0.3 + 0.7 * (1 − orb/allowedOrb)` (exact → 1.0; edge → 0.3). Optional cosine taper.

3. **Each aspect record is tagged** `{personA_body, personB_body, aspect, orb, points, valence: harmonious|tension|binding, sentence}` — e.g. *"A's Venus trine B's Mars, orb 1.2°, +6.8 pts — effortless attraction."* **This is the explainability layer; the score is literally the sum of these sentences.**

4. **House-overlay bonus (when birth times known):** A's romance planet (Sun/Moon/Venus/Mars) in B's house → flat bonus: 7th +3 (commitment), 5th +3 (romance), 8th +2.5 (intimacy), 1st +2.5 (attraction), 4th +2. Weight Venus/Moon in 5th/7th and Mars in 8th most. **Cap total overlay at ~15 raw pts** so it supports, not dominates.

5. **Normalize to 0–100 with diminishing returns** (real compatibility = many reinforcing contacts, not one runaway sum): `score = 100 * (1 − exp(−raw / K))`, start `K = 45`, calibrate so a strong chart (raw ~60–80) maps to ~75–85.

6. **Five sub-scores** (same exp curve per bucket, smaller K), for richer explainability:
   - **Emotional** — Sun-Moon, Moon-Moon, Moon-Venus, Moon contacts
   - **Attraction/Passion** — Venus-Mars, Mars contacts, Asc contacts
   - **Affection/Values** — Venus-Venus, Sun-Venus
   - **Communication** — Mercury contacts
   - **Commitment/Stability** — Saturn contacts, 7th-house overlays

**Hard rules (gotchas):**
- ❌ **Never penalize hard aspects.** Venus-Mars square and Sun-Moon opposition are among the *most* magnetic romantic contacts. Score them positive-but-smaller with a "tension/growth" label. A model that subtracts for squares mis-ranks passionate, lasting couples as incompatible.
- Conjunction valence is planet-dependent (Venus-Moon = lovely; Saturn conjunct personal = heavy). Keep it planet-aware.
- Keep **all** weights/coefficients/`K` in one auditable config object.
- Without the saturating `exp` normalization, planet clusters pile up points and break the scale.

### 6.6 Composite & Davison (engine-ready now, surfaced post-v1)

- **Composite** = per-planet **circular midpoint** of the two longitudes. ⚠️ **Wraparound bug:** naive `(a+b)/2` is wrong across 0/360 — midpoint(350°,10°) must be **0°**, not 180°. Use the vector mean:
  ```
  mid = degrees( atan2( sin(a)+sin(b), cos(a)+cos(b) ) ) mod 360
  ```
  Handle the **exactly-180°-apart** degenerate case explicitly (atan2(0,0) undefined → pick a deterministic convention). Unit-test: midpoint(350,10)=0, (10,350)=0, (10,80)=45, (0,180)=90.
- **Davison** = a real chart cast for the **midpoint in time** (average **Julian Day in UTC** — never average wall-clock/local times) and the **great-circle geographic midpoint** (longitude wraps at ±180° just like the ecliptic — use the atan2 great-circle formula). Reuse the natal house engine.

### 6.7 The `chart-facts` JSON (engine ↔ AI contract)

Versioned, language-neutral, with stable `fact_ids` so the AI can cite what it used and a validator can check grounding.

```jsonc
{
  "schema_version": "1.0",
  "engine_version": "astronomy-engine@<ver>+astrolayer@<ver>",
  "zodiac": "tropical",
  "house_system": "whole_sign",
  "orb_profile_id": "default-v1",
  "subjects": {
    "a": {
      "birth_time_known": true,
      "utc": "1990-05-14T06:30:00Z",
      "lat": 55.7558, "lon": 37.6173, "tz": "Europe/Moscow",
      "planets": [
        { "id": "a.sun",   "body": "Sun",   "lon": 53.21, "sign": "Taurus", "deg_in_sign": 23.21, "house": 11, "retrograde": false }
        // ... Moon..Pluto
      ],
      "asc": { "id": "a.asc", "lon": 12.4, "sign": "Cancer" },
      "mc":  { "id": "a.mc",  "lon": 280.1, "sign": "Capricorn" },
      "houses": [ /* 12 cusp longitudes */ ]
    },
    "b": { /* same shape */ }
  },
  "synastry": {
    "score": 78,
    "subscores": { "emotional": 82, "attraction": 88, "affection": 71, "communication": 60, "commitment": 64 },
    "aspects": [
      {
        "id": "syn.0",
        "from": "a.venus", "to": "b.mars",
        "aspect": "trine", "orb": 1.2, "points": 6.8,
        "valence": "harmonious",
        "snippet_id": "venus_trine_mars_synastry"
      }
      // ...
    ],
    "house_overlays": [
      { "id": "ov.0", "planet": "a.venus", "in_house_of": "b", "house": 7, "bonus": 3 }
    ]
  },
  "warnings": []   // e.g. "b.birth_time_unknown"
}
```

### 6.8 Validation
Write golden-master unit tests against a reference ephemeris (astro.com / a Swiss-Ephemeris chart) for fixed birth datetime+location, asserting planet longitudes, Asc, MC, and house cusps **to within an arcminute**, plus the wraparound/midpoint cases. This catches the J2000-vs-of-date and east/west-longitude traps before they ship.

---

# PART B — The AI Interpretation Layer (the words)

## 7. Claude integration

### 7.1 Models & pricing (locked)
| Model | ID | $/1M in | $/1M out | Use |
|---|---|---|---|---|
| Claude Opus 4.8 | `claude-opus-4-8` | $5 | $25 | Deep readings, premium/interactive |
| Claude Haiku 4.5 | `claude-haiku-4-5` | $1 | $5 | Short answers, daily lines, moderation/faithfulness checks |

(Use exact ID strings, no date suffixes. `claude-sonnet-4-6` at $3/$15 is the middle option for default production volume if Opus is too costly.)

### 7.2 The grounding contract (the anti-hallucination core)
A **frozen system prompt** enforces grounding + abstention. Skeleton:
- **Role & brand voice.**
- **GROUNDING contract:** *"You interpret ONLY the facts in `<chart_facts>`. Never state, imply, or compute any planetary position, sign, degree, house, or aspect not present in `<chart_facts>`. If asked about something not covered, say it's outside this reading rather than inventing it."*
- **TONE contract:** warm, empathetic, plain-language, encouraging.
- **HONESTY/NON-FATALISM:** no certainty about the future, no doom; frame challenges as workable; name both strengths and frictions.
- **BOUNDARY:** entertainment/self-reflection only; not medical/financial/legal/relationship advice; suggest a professional for serious issues.
- **OUTPUT:** respond directly, no preamble, follow the schema.

### 7.3 Structured output + auditable grounding
Use `output_config: {format: {type: "json_schema", schema: …}}` (or `messages.parse()` with Zod/Pydantic). Each reading section carries a **`used_fact_ids`** array referencing the source JSON. Post-generation, a **deterministic validator** asserts every `used_fact_id` exists and (optionally) a cheap **Haiku 4.5 faithfulness pass** flags any sentence asserting a placement not in the facts. On failure → regenerate or fall back to a template.
⚠️ Structured outputs are incompatible with citations and with assistant prefill, and have JSON-schema limits (no `minLength`/`maximum`/recursion) — design the reading schema within them.

### 7.4 Deterministic snippet library (recommended)
Maintain a curated per-aspect / per-score-band **snippet library** (e.g. `venus_square_mars_synastry → "magnetic but volatile attraction"`). The engine emits `snippet_id`s; Claude's job is **selection, weaving, personalization, tone** — not inventing astrological *meaning*. Benefits: consistent meaning across users, astrologer-reviewable offline, fewer hallucinations, and the library caches as part of the frozen prefix. Trade-off: more authoring up front.

### 7.5 Multilingual generation
Generate **natively per locale** (ru/uk/en) by swapping a locale-specific **style block** while keeping the facts JSON and snippet semantic keys language-neutral. **Never machine-translate the finished reading** (tone drift + desync from facts). Keep localized snippet text (or variants) per locale; native review of the launch-set tone.

### 7.6 Thinking / sampling
Use `thinking: {type: "adaptive", display: "summarized"}` + `output_config: {effort: "medium"}` (the cost/quality sweet spot for warm readings). ⚠️ `temperature`, `top_p`, `top_k`, `budget_tokens` all **400** on Opus 4.8 — steer creativity via prompting and snippet selection, not sampling.

### 7.7 Cost control at volume
- **Prompt caching (prefix match):** freeze `[system prompt + interpretation corpus + snippet library + per-locale style block]` as the cached prefix with `cache_control: {type: "ephemeral"}` on its last block; inject the **volatile per-user facts JSON in the trailing user message**, after the breakpoint. Cache reads ≈ 0.1×, writes ≈ 1.25× (5-min TTL). ⚠️ Minimum cacheable prefix is **4096 tokens on Opus 4.8** (2048 on Sonnet) — size the corpus above it or it silently won't cache (check `usage.cache_read_input_tokens`). **Never** put per-user data (name, birth date, "today") in the system prefix — it breaks the cache every request. Optionally pre-warm with a `max_tokens: 0` request at the start of a traffic window.
- **Batches API (50% off, async):** precompute non-urgent content (daily/scheduled compatibility reports, bulk regeneration). Results are unordered — key by `custom_id`.
- **Model routing:** Opus 4.8 (streaming) for premium/interactive; Haiku 4.5 for short answers + the faithfulness/moderation pass; Batches for scheduled bulk.
- **Stream everything user-facing** (`.get_final_message()` / `.finalMessage()`), `max_tokens ~64000` for long readings.
- ⚠️ Guard `stop_reason` before reading `response.content` (a safety refusal yields empty/partial content); `stop_details` is `null` unless `stop_reason == "refusal"`.

---

# PART C — App, Localization, Data, Legal

## 8. Localization & i18n

- **Library: `next-intl`** (purpose-built for App Router + RSC, smallest footprint, native ICU + `Intl` formatting, auto hreflang). *(Avoid `next-i18next` — App Router support only landed v16/Mar-2026 and is still rough; built-in App-Router i18n was removed.)*
- **Routing:** subdirectory locales `/ru`, `/uk`, `/en` with `app/[locale]/…`, middleware locale detection, `generateMetadata` + `generateStaticParams` per locale, reciprocal **hreflang + x-default** on every route. Set `<html lang>` per request.
- **Formatting:** all dates/numbers/**plurals** via `Intl`/ICU. ru & uk have one/few/many/other plural forms — **never** concatenate (`"3 дома"` is wrong; `1 дім / 2 будинки / 5 будинків`).
- **Default/fallback for undetected visitor:** **en as x-default** (don't alienate Ukrainian users by defaulting them to ru), with `Accept-Language` detection. **Default a Ukrainian visitor to `uk`, never `ru`.**

### 8.1 Cultural copy notes
- **uk ≠ ru.** Treat Ukrainian as first-class with native copy; Ukrainian users increasingly reject Russian-language UX.
- **Marriage/soulmate framing is loaded.** Avoid pushy "when will you marry / find your husband." Use warm, respectful empowerment ("what your chart reveals about love and compatibility"). Keep inclusive (don't assume hetero-marriage as the only goal).
- "Synastry" and "composite chart" are **different** techniques — keep distinct labels.
- Keep the planet count at **10**; treat Chiron as optional/extra if ever added.

### 8.2 Starter astrology glossary (ru / uk)
*(uk column needs native-speaker review before launch.)*

| EN | RU | UK |
|---|---|---|
| Sun / Moon | Солнце / Луна | Сонце / Місяць |
| Mercury / Venus / Mars | Меркурий / Венера / Марс | Меркурій / Венера / Марс |
| Jupiter / Saturn | Юпитер / Сатурн | Юпітер / Сатурн |
| Uranus / Neptune / Pluto | Уран / Нептун / Плутон | Уран / Нептун / Плутон |
| Aries / Taurus / Gemini | Овен / Телец / Близнецы | Овен / Телець / Близнюки |
| Cancer / Leo / Virgo | Рак / Лев / Дева | Рак / Лев / Діва |
| Libra / Scorpio / Sagittarius | Весы / Скорпион / Стрелец | Терези / Скорпіон / Стрілець |
| Capricorn / Aquarius / Pisces | Козерог / Водолей / Рыбы | Козеріг / Водолій / Риби |
| Conjunction | Соединение | Сполучення (з'єднання) |
| Sextile / Square | Секстиль / Квадрат | Секстиль / Квадратура |
| Trine / Opposition | Тригон (трин) / Оппозиция | Тригон / Опозиція |
| Quincunx | Квиконс | Квінконс |
| Natal chart | Натальная карта | Натальна карта |
| Synastry | Синастрия | Синастрія |
| Compatibility | Совместимость | Сумісність |
| Composite chart | Композитная карта | Композитна карта |
| Davison chart | Карта Дэвисона | Карта Девісона |
| Ascendant | Асцендент | Асцендент |
| Midheaven (MC) | Середина неба (MC) | Середина неба (MC) |
| House | Дом | Будинок |
| Aspect / Zodiac | Аспект / Зодиак | Аспект / Зодіак |

Store as a translation namespace (`astrology.glossary`) and reuse it as the controlled vocabulary for the AI snippet prompts.

## 9. Data model, privacy & legal

This is a real compliance surface — birth data is sensitive and the product serves the EU/diaspora. **Treat the data as GDPR special-category by design.**

### 9.1 Data classification
- Birth **date/time/place** alone = ordinary personal data, but highly **identifying** → minimize and time-limit.
- A **love-compatibility** product can be pulled into **Art. 9 special-category** because it can infer/reveal philosophical belief (astrology-as-framework) and **sex life/sexual orientation** (e.g. same-sex pairings) "with a reasonable degree of certainty" → realistically requires **explicit, granular, unbundled consent** (no pre-ticked boxes, not buried in T&C).

### 9.2 The partner-data problem (the central GDPR gap — verified)
The partner is a **separate, non-consenting data subject**; the user's consent does **not** cover them. The household exemption protects the user, **not the app operator** (always the controller). Mitigations:
- **Default design: compute compatibility ephemerally from the partner's birth inputs, then discard — do NOT persist a partner profile.** This sidesteps most of the problem.
- If partner data is ever retained: need a **distinct lawful basis** (legitimate interests with a documented LIA + easy opt-out per Art. 21; consent is cleanest but impractical), an **Art. 14 notice** to the partner (or the documented "disproportionate effort" exemption + a public privacy notice), and **avoid generating/persisting special-category inferences** about a non-consenting partner.
- Prompt the user to confirm they have authority / the partner is informed.

### 9.3 Rights & retention
Self-service **delete account/data** (Art. 17), access (Art. 15), rectification, consent withdrawal; honor within ≤1 month; on withdrawal stop processing and delete sensitive data. Define a retention period; keep deletion logs but not the deleted data.

### 9.4 Disclaimers & marketing
- **"For entertainment purposes only"** at the point of result delivery **and** in ads; "not a substitute for professional medical/legal/psychological/financial/relationship advice."
- **Never** claim accuracy/certainty/guarantee ("accurate prediction," "guaranteed match," "scientifically proven") — deceptive-advertising (FTC / EU UCPD) and chargeback exposure. Use "insight," "guidance," "for fun."
- **Age gate ≥16** (consider 18 given relationship/sexual context); EU child-consent age varies 13–16 by state — don't target minors.

### 9.5 Russia (242-FZ / 152-FZ) — recommend geo-exclusion for v1
Since **1 July 2025**, **primary collection** of Russian citizens' personal data must occur in databases **physically located in Russia** (with Roskomnadzor notification); penalties escalated sharply (turnover fines up to 1–3% / 500M ₽; criminal liability). Standing up Russian infrastructure conflicts with EU/US sanctions and a Ukraine/EU-facing brand. **Default v1: geo-exclude Russian-resident users** (serve the Russian *language* to the diaspora/CIS-outside-RF, but not RF residents) unless the RF market is later deemed essential enough to justify in-country data residency. **⚠️ Open decision (§13).**

### 9.6 Payments — high-risk by default
Astrology/"psychic" is **restricted on Stripe (needs prior approval)** and **prohibited on PayPal/Square**; category is high-risk (MCC 7999, chargeback-prone). Plan: seek Stripe's explicit approval **or** use a high-risk-friendly acquirer; describe the business accurately (avoid the Mastercard MATCH list); minimize chargebacks via clear refund terms + the entertainment disclaimer.

### 9.7 Compliance documents to prepare
Privacy Policy (incl. Art. 13/14), ToS with entertainment disclaimer + liability limitation, Records of Processing (Art. 30), and a **DPIA (Art. 35)** (special-category profiling at scale). Identify a controller contact; EU representative (Art. 27) if needed.

## 10. Tech stack summary

| Layer | Choice |
|---|---|
| Frontend / app | **Next.js (App Router) PWA**, `next-intl`, React Server Components |
| Chart rendering | SVG wheel (AstroChart / `@astrodraw` or custom) |
| Astrology engine | **`astronomy-engine` (MIT)** + our astrology layer (TypeScript) |
| Geo / time | bundled **GeoNames** city DB; **`geo-tz`** (server) for IANA zone; **Luxon** for historical offset → UTC |
| AI | **Claude API** (`@anthropic-ai/sdk`), structured outputs, prompt caching, Batches |
| Backend/API | Next.js Route Handlers (or a small FastAPI service if engine is split out) |
| DB | Postgres (users, saved charts, billing); store minimal birth data, encrypted |
| Payments | High-risk-friendly acquirer / approved Stripe |
| Hosting | EU region (and **not** Russia) |

## 11. Monetization

- **Freemium hook:** one full compatibility **score + top-3 aspects free** per couple.
- **Paywall:** full report, additional couples, and **pay-per-question** AI follow-ups ("will we last?", "why do we fight?").
- **Pricing (mirror proven RU bands):** low entry subscription ~**199–299 ₽/mo**, per-couple/report unlocks ~**149–499 ₽**, annual plan as margin driver. (RU market is price-sensitive — note ~100 ₽ entry tiers; don't over-price the entry point.)
- **Later tier:** async/live human-astrologer relationship review (high ARPU).
- **Virality:** shareable compatibility cards (Telegram/Instagram), "invite your partner to unlock the full chart" referral, **Telegram bot as the lowest-friction RU/CIS surface** (v1.1).
- **Acquisition:** Telegram channel + paid placements (Telega.in); Instagram Reels with mid-tier RU influencer astrologers ("check your synastry" demos); SEO on **"совместимость по дате рождения"**, **"синастрия онлайн"** to intercept free-calculator demand. ⚠️ "по дате рождения" implies users often lack birth time → the graceful-degradation design (§5.4) is also an acquisition feature ("add birth time for the full chart").

## 12. Roadmap / build milestones

1. **M1 — Engine core (the math).** astronomy-engine integration; planet longitudes (with the of-date/J2000 verification + reference-chart tests); Asc/MC/Whole-Sign houses; geo+timezone pipeline; unknown-time degradation. *Deliverable: `chart-facts` JSON for one person, validated to ±1′.*
2. **M2 — Synastry.** Aspect detection + the weighted rubric + sub-scores + house overlays; config object; explainability sentences. *Deliverable: deterministic 0–100 score with per-aspect breakdown.*
3. **M3 — AI layer.** Grounding system prompt; snippet library (seed set); structured output + `used_fact_ids` validator; ru/uk/en style blocks; prompt caching. *Deliverable: a grounded reading from a chart-facts JSON, in 3 languages.*
4. **M4 — App & i18n.** Next.js PWA, intake flow (city picker), chart wheel, score UI with the "why" breakdown, `next-intl` + glossary + hreflang.
5. **M5 — Monetization & legal.** Freemium/paywall, payments, consent flow, deletion, disclaimers, geo-exclusion, DPIA.
6. **M6 — Launch + v1.1 Telegram channel.**

## 13. Open decisions (need product input)

1. **Russia:** geo-exclude RF residents for v1 (recommended), or invest in RF data residency?
2. **Lunar node:** mean (Western default) or true?
3. **House system surfaced to users:** Whole-Sign only, or also Placidus? (Engine supports both; Whole-Sign is the robust default.)
4. **Partner data:** ephemeral-only (recommended, simplest GDPR), or allow saving partners (needs Art. 14 + consent machinery)?
5. **Outer planets/Chiron/nodes in the score:** include Jupiter/Saturn only (v1), or add Uranus/Neptune/Pluto/nodes (more nuance, more noise)?
6. **Snippet library:** native-authored per locale (best idiom, more upkeep) vs one semantic library localized at render time?
7. **Default locale for undetected visitors:** en x-default (recommended) confirmed?
8. **Brand name** (working title "Astro-Love").

## 14. Sources

**Engine / math**
- astronomy-engine source & README — https://github.com/cosinekitty/astronomy , https://raw.githubusercontent.com/cosinekitty/astronomy/master/source/js/astronomy.ts
- Asc/MC/house formulas — alt.astrology.moderated archives; Munkasey "Astrological House Formulary"
- GAST/LST — https://aa.usno.navy.mil/faq/GAST
- Composite circular midpoint (Kerykeion `circular_mean`) — https://github.com/g-battaglia/kerykeion

**Synastry / techniques**
- Aspects/orbs — https://en.wikipedia.org/wiki/Astrological_aspect , https://astrolibrary.org/aspects-in-astrology/ , astrotheme.com
- Pair importance & house overlays — Cafe Astrology, lookupthestars.com, sasstrology.com
- Composite vs Davison — astro.com FAQ, astro-seek, augurine.com

**Geo / time**
- geo-tz — https://www.npmjs.com/package/geo-tz ; tz-lookup — https://github.com/photostructure/tz-lookup
- IANA tz database (USSR/Russia history) — https://www.iana.org/time-zones , https://data.iana.org/time-zones/tzdb/europe , https://timezonedb.com/time-zones/Europe/Moscow

**i18n**
- next-intl — https://next-intl.dev/docs/routing/configuration ; next-intl vs i18next — https://i18nexus.com/posts/i18next-vs-next-intl
- Native-vs-translated content effect — https://arxiv.org/pdf/2410.15956

**Legal / privacy**
- GDPR Arts. 6/8/9/14 — https://gdpr-info.eu/ ; special-category guidance — ICO
- Russia 242-FZ localization — https://learn.microsoft.com/en-us/compliance/regulatory/offering-russia-data-localization ; 2025 update — https://www.lidings.com/media/legalupdates/localization_pd_update/ ; penalties — solstico.legal
- Payments — Stripe restricted-business list; PayPal AUP; payatlas.com (MCC 7999)

**AI layer**
- Claude API reference (models/pricing, structured outputs, prompt caching, batches) — Anthropic `claude-api` skill
- Grounding/abstention — https://deepmind.google/blog/facts-grounding-a-new-benchmark-for-evaluating-the-factuality-of-large-language-models/

**Market**
- Market size/competitors — researchandmarkets.com, statista.com, taroscoper.com, lunarguideapp.com
- RU/CIS — natalon.app, lunacode.ru, geocult.ru, chronos.mg, misterius.ru

---

*Spec compiled from a verification-backed research pass (8 research dimensions + adversarial fact-checks on the error-prone engine/legal claims). Items tagged ⚠️ VERIFY are the known traps to confirm during implementation.*
