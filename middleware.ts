import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Best-effort per-IP rate limiting for the routes that run the ephemeris engine
// or an LLM on unauthenticated input (/api/og, /api/share, /api/reading,
// /api/pay/verify). In-memory + per-instance, so it's a floor, not a fortress —
// a CDN/edge limiter should sit in front in production — but it stops a single
// client from trivially pegging the Node instance's CPU.

const WINDOW_MS = 60_000;
const LIMITS: Record<string, number> = {
  "/api/place": 60, // cheap deterministic city scoring
  "/api/reading": 30, // LLM calls — the most expensive
  "/api/og": 120, // crawlers hit this; keep generous
  "/api/share": 60,
  "/api/pay/verify": 60,
  "/api/track": 240, // tiny beacons; several fire per pageview
  "/api/meta-capi": 120, // ad-platform conversions; a handful per session
};

const hits = new Map<string, { count: number; resetAt: number }>();

// ── Locale resolution ───────────────────────────────────────────────────────
// Resolved here, on every page request, so the server can render the right
// language in the FIRST byte. Previously every visitor got English and the UI
// swapped after hydration — fine for a returning user, fatal for an ad click:
// a Russian-language ad landed on an English page.
//
// Precedence, first match wins:
//   1. ?lang=ru        — campaign links carry it, so an ad set is deterministic
//   2. astro-locale    — a choice the visitor made in the picker, never overridden
//   3. Accept-Language — the automatic case. Language, not IP: the target buyer
//                        is often a Russian speaker in Berlin, whose IP says
//                        Germany and whose browser says ru. The browser is right.
//   4. "en"
//
// The list is duplicated from lib/i18n rather than imported: importing the
// dictionaries would pull all eight locale files into the middleware bundle.
const LOCALES = ["en", "ru", "uk", "sk", "pl", "de", "es", "ar"];
const LOCALE_COOKIE = "astro-locale";

function fromAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .filter((e) => e.tag)
    .sort((a, b) => b.q - a.q);
  // Match on the primary subtag, so ru-RU, ru-UA and ru all land on "ru".
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (LOCALES.includes(base)) return base;
  }
  return null;
}

function limitFor(path: string): number | null {
  for (const prefix in LIMITS) if (path.startsWith(prefix)) return LIMITS[prefix];
  return null;
}

// The Railway-generated subdomain serves the same app as the custom domain;
// 301 it to the canonical host so search engines see one origin.
const CANONICAL_HOST = "astromatch.carecompass.me";
const REDIRECT_HOSTS = new Set(["astro-love-production.up.railway.app"]);

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  if (REDIRECT_HOSTS.has(host)) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  const path = req.nextUrl.pathname;
  const limit = limitFor(path);
  if (limit === null) return withLocale(req);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const key = `${ip}:${path.split("/").slice(0, 3).join("/")}`;
  const now = Date.now();
  const rec = hits.get(key);

  if (!rec || now > rec.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else if (rec.count >= limit) {
    return NextResponse.json({ error: "rate_limited" }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((rec.resetAt - now) / 1000)) },
    });
  } else {
    rec.count++;
  }

  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
  }
  return NextResponse.next();
}

/** Attach the resolved locale to the request (read by the root layout) and
 *  persist an explicit ?lang= choice so it survives the next navigation. */
function withLocale(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("lang")?.toLowerCase() ?? null;
  const explicit = param && LOCALES.includes(param) ? param : null;
  const saved = req.cookies.get(LOCALE_COOKIE)?.value ?? null;

  const locale =
    explicit ??
    (saved && LOCALES.includes(saved) ? saved : null) ??
    fromAcceptLanguage(req.headers.get("accept-language")) ??
    "en";

  const headers = new Headers(req.headers);
  headers.set("x-astro-locale", locale);
  const res = NextResponse.next({ request: { headers } });

  // Only a deliberate ?lang= writes the cookie; a header-derived guess must not
  // pin the visitor to a language she never chose.
  if (explicit && explicit !== saved) {
    res.cookies.set(LOCALE_COOKIE, explicit, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return res;
}

export const config = {
  // Everything except Next internals/static assets: the host redirect must see
  // every page; the rate limiter still self-selects via its LIMITS prefixes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
