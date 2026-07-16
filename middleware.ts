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
};

const hits = new Map<string, { count: number; resetAt: number }>();

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
  if (limit === null) return NextResponse.next();

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

export const config = {
  // Everything except Next internals/static assets: the host redirect must see
  // every page; the rate limiter still self-selects via its LIMITS prefixes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
