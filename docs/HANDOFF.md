# Agent Handoff — astro-love / AstroMatch

> Written 2026-07-11 for the next agent (or human) continuing this codebase.
> Everything here is verifiable in the repo; where a claim depends on infra,
> the owner's Railway/CareCompass dashboards are the source of truth.

## 1. What this is

**AstroMatch** (live at `astromatch.carecompass.me`) is a love-astrology app:
couple synastry, natal love reading, love-language quiz. Its differentiator is
**explainable astrology that shows its work** — every claim carries the exact
planetary positions, aspect and orb behind it ("receipts"), computed by a real
ephemeris verified to sub-arcminute accuracy against Swiss Ephemeris values.

- **Stack**: Next.js 14 App Router, TypeScript, Tailwind, `astronomy-engine`
  (MIT), Luxon. Postgres (via `pg`) as an optional enhancement, never a
  dependency. Anthropic API for the premium AI-written reading (optional —
  everything else is deterministic and works with no key).
- **Deploys**: pushing to `main` auto-deploys production (Railway, `next start`).
  `main` is the single source of truth. Historical note: before 2026-07-11 the
  deploy branch was `claude/rebuild-astor-love-487rg9`; it was merged into
  `main` (merge commit `2c2e7cc`) and the deploy trigger repointed. Don't
  develop on the old branch.
- **Payments**: a $2 one-time unlock. Checkout happens on a separate service
  (CareCompass, `pay.carecompass.me`, sibling repo `care-compass`); this app
  verifies a payment ref server-side via `/api/pay/verify` (fail-closed) and
  mints an HMAC **entitlement token**. Premium content is gated by that token,
  server-confirmed on every reading request.

## 2. Hard rules (do not break these)

1. **True values or visibly degraded — never plausible-wrong.** Unknown birth
   time ⇒ no Ascendant/houses, Moon carries an explicit day-range, Moon-based
   features are suppressed or flagged `timeSensitive`. Invalid timezone ⇒ same.
2. **The paywall is an ACCESS boundary, not a visual one.** No premium
   interpretation text may enter the unpaid DOM. Teases may name *placements
   and titles* (free-tier facts: signs, degrees, card names) but never the
   paid *reads*. No content-behind-CSS-blur.
3. **No fake teases.** Conditional features (hot-cold, node contacts) render
   NOTHING when the geometry doesn't exist. A tease must be computed from the
   actual charts, with an honest branch when the answer is boring ("remarkably
   even"). No Barnum lines that fit any couple.
4. **TRUE node, never mean node.** The mean-node shortcut drifts up to ~1.75°
   from what other apps show — a credibility wound. `lib/astro/points.ts`
   computes the osculating node from lunar position+velocity; golden tests
   freeze it against the Moon's actual ecliptic crossing.
5. **No AGPL/commercial ephemeris** (i.e. no Swiss Ephemeris). The engine is
   already verified sub-arcminute against it using MIT `astronomy-engine`.
6. **Determinism first.** LLM output is a garnish on top of deterministic
   facts, never the source of a factual claim. The writer must cite fact ids
   (`used_fact_ids` validator is the hard gate; the Haiku "faithfulness"
   second check is OFF by default — it was flaky — leave it off or advisory).
7. **Every interpretive claim carries receipts** (positions + aspect + orb).

## 3. Architecture map

```
lib/astro/            deterministic engine (all pure, all golden-tested)
  ephemeris.ts        ecliptic-of-date longitudes, RA/Dec, GAST (the base layer)
  points.ts           TRUE lunar node (h = r×v orbital mechanics) + Mean Lilith
  chart.ts            ChartInput -> ChartFacts (planets, ☊☋⚸ points, angles,
                      houses, aspects, warnings; schema 1.2)
  aspects.ts          aspect defs, orbs (+luminary bonus), pair-aware valence
  synastry.ts         couple scoring: two-axis (ease/intensity), subscores,
                      overlays, per-contact headline/why/proof
  enrich.ts           element/modality/dignities/mutual-reception + composer
  insights.ts         archetype, strongest thread, subscore reads
  natalReading.ts     the 5 natal love Q&As (deterministic)
  transits.ts         dated windows: moving sky vs natal points (1yr scan)
  coupleTiming.ts     shared love windows (A∩B) + transits to composite
  composite.ts        midpoint chart (the relationship's own chart)
  astrocartography.ts planetary lines -> city recommendations + scoreLocation
  nodeContacts.ts     planet↔node-axis conjunctions across charts (2.5° orb)
  directional.ts      "who feels it more" receiver-weighted split (even ≥44/56)
  hotcold.ts          withholding-signature detector (10 classical signatures)
  decoders.ts         needs profile (Moon/Venus/Mars per person) + Moon Match
  loveCopy.ts         ALL interpretation copy registers (EN only, see §7)
  uncertainty.ts      unknown-time score ranges
lib/server/           server-only
  entitlement.ts      HMAC tokens (fail-fast on missing secret at RUNTIME only
                      — skipped when NEXT_PHASE==="phase-production-build")
  sharetoken.ts       AES-256-GCM encrypted PII-safe share links (?s=)
  writer.ts           Claude writer (fact contract in, sections out, validator)
  prosecache.ts       in-memory LRU prose cache (cost guard)
  db.ts               optional Postgres: purchases + readings ledgers,
                      durable prose cache. Degrades silently if DB absent.
app/api/
  reading/route.ts    THE premium gate. Validates entitlement, returns natal
                      answers/places/transits/homeScore/composite/prose.
  pay/verify/route.ts fail-closed payment verification -> mints token,
                      records purchase (fire-and-forget)
  place/route.ts      "score my city" (entitled, rate-limited)
  og/route.tsx        dynamic OG image     share/route.ts  encrypted links
components/
  CoupleExperience.tsx  the couple flow: deck of cards, staged tap-to-reveal,
                        free teases, manifest paywall, all premium cards
  Experience.tsx        natal flow          Paywall.tsx  manifest/decoy gate
  PlanetTable.tsx       natal table incl. ☊☋⚸ rows, ℞ + Lilith footnotes
scripts/golden-charts.ts  THE regression suite (160 checks). `npm run test:golden`
```

**Data flow (couple)**: both charts + synastry compute **in the browser**
(engine is public code). Free tier renders score/archetype + computed teases.
The gate (`useReading`) asks `/api/reading` to confirm the entitlement token;
only then do premium cards render (client-computed) and the AI prose stream in
(server-only). Forged/absent tokens always get `{entitled:false}`.

## 4. Environment (names only — values live in Railway)

| Var | Purpose |
|---|---|
| `ENTITLEMENT_SECRET` | HMAC for entitlement tokens (required in prod) |
| `SHARE_SECRET` | share-link encryption (falls back to ENTITLEMENT_SECRET) |
| `ANTHROPIC_API_KEY` | enables AI prose; absent ⇒ deterministic templates |
| `DATABASE_URL` | optional Postgres (purchases/readings/prose cache) |
| `CARECOMPASS_VERIFY_URL/_TOKEN/_EXPECT_*` | payment verification upstream |
| `SITE_URL` | canonical origin |
| `ALLOW_TEST_UNLOCK=1` | DEV ONLY: gate treats everyone as entitled |
| `FAITHFULNESS_MODEL` | leave empty (advisory checker was unreliable) |

## 5. Dev workflow

```bash
npm install
npm run dev                    # local dev
npx tsc --noEmit               # must be clean
npm run test:golden            # must be 160/160 (add checks for new engine work)
npm run build                  # must pass with NO env vars set (CI simulates this)
```

**Testing the unlocked state locally**: run dev with `ALLOW_TEST_UNLOCK=1`,
then in the browser console
`localStorage.setItem("am_entitlement", JSON.stringify({ref:"t",token:"t",ts:Date.now()}))`
and reload. Remove both afterwards. (The token is garbage; test mode makes the
server accept it. Never set that flag in production.)

**Definition of done for any change**: tsc clean → golden suite green (with new
checks if you added engine behavior) → secret-less build green → verify the
affected surface in a real browser (locked AND unlocked states for funnel
work) → push to `main` → confirm the Railway deploy succeeded → curl the live
site for a discriminating marker of your change (not just a 200).

## 6. State as of 2026-07-11 (commit `3ca326f`)

Shipped and live, in order: hardened time resolution; two-axis scoring;
server-verified paywall (HMAC) + encrypted share links + dynamic OG; grounded
Claude writer with fact-id validation + prose cost cache; purchases/readings
Postgres ledger + buyer identity capture; astrocartography ("where in the
world" + score-any-city); transit timing windows; composite chart;
deterministic enrichment (dignities, mutual reception); and **Phase A of the
pay-conversion roadmap** (see §7 for what that means and what's next):
big-three echo strip, computed teases, his-side strip, dated-window countdown,
itemized paywall manifest, honest deck counter, needs/moon-match/hot-cold/
directional/node-contact/couple-timing premium cards, ☊☋⚸ natal rows,
free first love window on /natal, shared-link "run yours" CTA.

## 7. Remaining roadmap (in priority order)

The features below came out of a 26-agent product audit (2026-07-11) that
scored ideas by likelihood-to-convert; specs are summarized here so the work
is self-contained. Build them ONE AT A TIME, each through the §5 gate.

### Phase B

**B1. AI reading first-sentence leak** (writer + funnel; ~1-2 days)
The locked manifest currently *names* "Your written reading" without showing
it. Change: when a locked couple hits `/api/reading` for the gate check,
generate (and cache) ONLY an opening sentence (cheap model call, e.g. Haiku)
that must (a) embed ≥1 exact planet°sign anchor from the fact contract and
(b) cut off mid-thought. Return it in the gate response; render it in the
manifest entry verbatim. The full paid reading must OPEN with that same
sentence (pass it to the writer as a constraint). Guards: cache by the same
prose cache key + a `lead:` prefix; never generate on unvalidated input;
rate-limited path only; if no API key, omit (do not fake).
Acceptance: locked DOM contains exactly one sentence of reading, ending
mid-clause; paid reading starts with it verbatim; cost ≤1 small call/couple.

**B2. Birthday-only crush mode** (~1 wk)
Today Person B hard-requires birthplace. Add a "birthday only" path: date
without time/place computes Sun + slow planets reliably, Moon as a day-range,
Venus/Mars exactly (they move slowly enough within a day to state with a small
range — compute the actual range like `moonRangeFor` does and show it when it
matters). The couple flow then renders every card whose inputs survive
(sun-sign contacts, Venus/Mars contacts, his Venus decoder) and HONESTLY
suppresses the rest (no Asc/houses/Moon-dependent claims without flags).
Entry point: under Person B's form, "Only have their birthday? That's enough
to start." Acceptance: a reading computes with nothing but B's date; every
shown claim is valid under the missing data; suppressed cards say why.

**B3. Ex-mode "The Autopsy"** (~1 wk)
A relationship-status toggle (`current / crush / ex`) on the couple form.
`ex` swaps the copy REGISTER, not the math: same contacts, past-tense reads —
"the same contact that made this magnetic is the one that made it break."
Requires a deterministic breakup-register in `loveCopy.ts` (per aspect family ×
valence) BEFORE any LLM layer; the writer gets the status as context.
Guards: never render the flirty "surprise each other" copy for `ex`.
Acceptance: full deck renders in the ex register; no romance-tense leakage.

**B4. "Your Pattern" natal Q&A #6** (1-2 days)
Add to `natalReading.ts`: "why you keep picking the same type" — derived from
Venus sign/element vs Moon sign/element tension, 7th-house sign (when time
known), and Venus/Moon dignities. Free tease on /natal names her actual
Venus-vs-Moon split; the answer is premium like the other five.

**B5. House-overlay dialect card** (copy sprint, 2-3 days)
`synastry.ts` already computes overlays (whose planet in whose house). Write
12-house overlay copy in contemporary astro-fluent voice ("his Moon in your
8th") in `loveCopy.ts`, render as a premium card with receipts. Both
directions, honest about missing houses when time unknown.

**B6. Natal Q&A depth pass** (2-3 days)
The five answers currently read from sign lookups. Enrich each with the
person's actual aspects (e.g. Venus-Saturn square ⇒ the "slow to trust" line
with orb), houses, and ℞ where relevant. Keep every sentence traceable to a
chart fact.

### Phase C (after Phase B / once conversion data exists)

- **C1. Two-tier pricing**: $2 = this couple forever, $4 = everything.
  Requires binding a purchase ref to a couple-key server-side (the purchases
  table exists; add `couple_key` + a bounded rebind for time corrections).
  Grandfather existing $2 buyers to "everything".
- **C2. "The Us Report" $9 PDF by email**: keepsake export of the full deck;
  first email capture (also fixes localStorage-only entitlement fragility —
  store email→ref server-side for recovery). Offer it POST-purchase only.
- **C3. .ics calendar** of the couple's dated windows (deterministic, no
  account needed); later a weekly "couple weather" email.
- **C4. People roster**: `am_compat` currently holds ONE couple — make it an
  array with a picker ("compare someone new"), uncertainty badges per row.
- **C5. Success-screen rebuild**: email opt-in + report offer + "who's next".

### Hygiene (small, do early)

- **Localize the new copy layer** — `loveCopy.ts`, manifest strings, teases
  are EN-only; the app has 8 locales (`lib/i18n/*`). At minimum gate the new
  strings behind locale==="en" checks are NOT present today — non-EN users see
  English in the new surfaces.
- **OG images with non-Latin names** need an embedded font (known issue).
- The deterministic engine ships to the client by design (the code is public);
  the server gate protects the AI prose and the convenience of assembled
  premium payloads. Don't "fix" this by moving the engine server-side — the
  transparency is the brand.

## 8. Gotchas that have already bitten

1. `next build` runs with `NODE_ENV=production` and NO secrets — the fail-fast
   secret guards must stay behind the `NEXT_PHASE !== "phase-production-build"`
   check or CI/Railway builds break.
2. The Haiku faithfulness checker used to silently discard GOOD prose
   (fail-closed on a flaky judge). It's off; the deterministic `used_fact_ids`
   validator is the real gate.
3. Transit scanning must use `|separation − angle|`, not
   `separation(lon, natal+angle)` — the latter silently drops the trailing
   half of all trines/sextiles (was a real shipped bug, fixed + golden-tested).
4. The tap-to-reveal deck: cards join the array ASYNC when the gate opens.
   Non-staged decks top up `revealed` via an effect — keep that when touching
   the deck, or restored buyers get ghost face-down cards.
5. `am_compat`/`am_entitlement` live in localStorage — webview purchases can
   strand a buyer in another browser context (C2 addresses this).
6. Sign keys in `zodiac.ts` are English names ("Aries"); `loveCopy.ts` keys
   match those. `AspectMatch` exposes `def.name`, not `.aspect`.
7. Vector columns / raw SQL: the `db.ts` schema is created lazily with
   `CREATE TABLE IF NOT EXISTS` + additive `ALTER TABLE ... IF NOT EXISTS` —
   keep migrations additive; the app must run with no DB at all.

## 9. Where the deeper context lives

The full 26-agent audit (verbatim funnel walk, dealbreaker ranking, scored
idea pool, snapshot redesign) and the session-by-session build history are in
the owner's private records — ask them for "the AstroMatch pay-conversion
audit, 2026-07-11" if you need the reasoning behind a spec. This handoff plus
`SPEC.md`, the golden suite, and the git log are sufficient to build Phase B
without it.
