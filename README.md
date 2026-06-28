# Astro-Love

A Russian-native, **synastry-first** Web PWA that answers love questions from real astrological **math** (computed planetary positions + a transparent, weighted aspect score) with warm, grounded AI readings in **Russian, Ukrainian, and English**.

The differentiator: not vague sun-signs and not a black-box score — every compatibility number traces back to named aspects ("Venus trine Mars, +6.8 pts"), and the AI layer interprets *only* the pre-computed chart facts (it writes the words, never the numbers).

## Status — Milestones 1 & 2 built ✅ (natal engine + synastry compatibility)

A working **Next.js (App Router) PWA**:
- **`/`** — enter birth date / time / place → a real, validated natal chart (planet positions, Ascendant, Midheaven, whole-sign houses) on an animated SVG wheel.
- **`/compatibility`** — enter two people → a **0–100 compatibility score** with five sub-scores, a **synastry bi-wheel** (inner = Person A, outer = Person B, cross-chart aspect web), and a fully **explainable breakdown** where every point traces to a named, plain-English aspect ("Venus conjunct Mars +8.9") plus house overlays.
- **Five themes**, switchable from a swatch selector pinned on top (persisted): **Cosmic Night** (deep, starlit), **Rose Aurora** (soft warm cream), **Velvet Rouge** (deep wine + rose-gold, with gently rising hearts), **Peony Bloom** (soft pink, with drifting falling petals), and **Twilight** (dusk indigo/violet with an aurora glow). Driven by CSS variables + a per-theme palette so every surface and both chart wheels re-theme; the two love themes add a tasteful animated particle layer (`ThemeFX`). See `lib/theme.ts`, `components/ThemeProvider.tsx`, `components/ThemeSwatches.tsx`, `components/ThemeFX.tsx`. Honors `prefers-reduced-motion`.

### Run it
```bash
cd astro-love
npm install
npm run validate:engine   # numerically validates the astronomy (closed-form + almanac checks)
npm run dev               # http://localhost:3000
```

### View online (GitHub Pages)
The app is a **fully static export** — the astrology engine runs in the browser, so
there's no server to host. A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`)
builds it and publishes to Pages on every push.

**One-time setup:** repo **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.
Then the site is live at `https://<owner>.github.io/aeo-seo-auditor/`.
(The Pages workflow builds with `STATIC_EXPORT=1`, producing `astro-love/out/`.)

### Deploy on Railway (full server — recommended for the AI layer)
The default build (no `STATIC_EXPORT`) is a **normal Next.js server**, which Railway can host
and which supports SSR + future API routes (the M3 Claude reading layer needs a server to hold
the API key — static Pages can't do that).

In Railway: **New Project → Deploy from GitHub repo** → pick this repo → in the service's
**Settings → Root Directory** set **`astro-love`**. Railway (Nixpacks) then runs `npm ci` →
`npm run build` → the `railway.json` start command (`next start` on `$PORT`). Done — you get a
live URL that runs the full app. (One config serves both targets: Railway uses the server build,
GitHub Pages uses the static export.)

### What's implemented
- **Synastry engine (`lib/astro/synastry.ts`)** — the explainable weighted score (SPEC §6.5): inter-chart aspects × planet-pair weights × aspect-type coefficient × orb tightness, hard aspects scored net-positive, house overlays, saturating 0–100 normalization, five facet sub-scores — all in one auditable `CONFIG`. Emits per-aspect sentences so the number is self-explaining.
- **Engine (`lib/astro`, `lib/geo`)** — deterministic, reproducible:
  - geocoding via a curated city DB (CIS + world) and **historical-DST-correct** UTC resolution (Luxon + IANA tz);
  - geocentric **ecliptic-of-date** planet longitudes via the MIT `astronomy-engine` (with the heliocentric / J2000-precession traps handled — see `ephemeris.ts`);
  - **Ascendant / Midheaven** spherical-trig formulas and **whole-sign houses**;
  - retrograde detection, natal aspect detection with luminary-adjusted orbs;
  - emits the versioned `chart-facts` JSON (the engine ↔ AI/UI contract from `SPEC.md` §6.7);
  - graceful degradation when birth time is unknown.
- **UX (`app`, `components`)** — a cosmic, gold-on-indigo design: birth-data form, "big three" (Sun / Moon / Rising), a bespoke **SVG natal wheel** (element-colored sign glyphs, planet glyphs + degrees + retrograde, valence-colored aspect lines, AC–DC / MC–IC axes, declumped planets with leader lines), and a planet table. Server-rendered with a sample chart on first load; recomputes via `/api/chart`.
- **Validation (`scripts/validate-engine.ts`)** — closed-form checks (Asc/MC reference values, whole-sign houses, 0/360 wraparound) plus almanac sanity (Sun sign/degree). The reference chart (Moscow, 14 May 1990) reproduces the real 1988–91 Saturn/Uranus/Neptune-in-Capricorn stack and a mid-May-1990 Mercury retrograde — and correctly resolves Moscow to **UTC+4** (summer time then), not today's UTC+3.

### Not yet (next milestones, per `SPEC.md` §12)
M3 the Claude AI reading layer (grounded readings from the chart/synastry facts) · M4 i18n (ru/uk/en) · M5 monetization + legal.

## The spec
**[`SPEC.md`](./SPEC.md)** — the full technical + product specification (engine math, synastry rubric, AI grounding, i18n, GDPR/privacy/Russia, monetization, roadmap, open decisions §13). Points tagged **⚠️ VERIFY** are the known accuracy traps; the M1 engine handles the engine-side ones.
