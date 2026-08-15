import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LocaleProvider } from "@/components/LocaleProvider";
import ThemeFX from "@/components/ThemeFX";
import UnlockOnReturn from "@/components/UnlockOnReturn";
import Analytics from "@/components/Analytics";
import MetaPixel from "@/components/MetaPixel";
import { ConsentBanner } from "@/components/Consent";
import { LOCALE_CODES, isRtl, type Locale } from "@/lib/i18n";

// metadataBase lets per-page relative OG image URLs (/api/og?...) resolve to
// absolute URLs in link previews. Override via SITE_URL in production.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://astromatch.carecompass.me"),
  title: {
    default: "AstroMatch · Love Compatibility",
    template: "%s · AstroMatch",
  },
  description:
    "Math-based love compatibility from real synastry — every point explained.",
  // Each route canonicalizes to itself on the primary domain (resolves
  // against metadataBase), collapsing the Railway-subdomain duplicate.
  alternates: { canonical: "./" },
  // Meta domain verification (Business settings → Brand safety → Domains).
  // Set META_DOMAIN_VERIFICATION to the token Meta shows, deploy, then Verify.
  ...(process.env.META_DOMAIN_VERIFICATION
    ? { other: { "facebook-domain-verification": process.env.META_DOMAIN_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Apply the saved theme before first paint to avoid a flash.
// Velvet Rouge is the signature default; a saved choice still wins.
const BOOT = `(function(){try{var ok=['night','dawn','velvet','peony','twilight'];var t=localStorage.getItem('astro-theme');if(ok.indexOf(t)<0)t='velvet';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','velvet');}})();`;
// The locale half of this script is gone on purpose: lang/dir are now rendered
// server-side from the middleware-resolved locale, so there is nothing left to
// correct before first paint.

/** Locale chosen by the middleware for this request (see withLocale there). */
function requestLocale(): Locale {
  const h = headers().get("x-astro-locale");
  return h && (LOCALE_CODES as string[]).includes(h) ? (h as Locale) : "en";
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = requestLocale();
  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} data-theme="velvet">
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body">
        <div className="cosmos-bg" />
        <div className="aurora" />
        <div className="starfield" />
        <ThemeProvider>
          <ThemeFX />
          <LocaleProvider initial={locale}>
            <Analytics />
            {/* MetaPixel reads search params, which opts its subtree into
                client rendering — Suspense keeps that boundary local. */}
            <Suspense fallback={null}>
              <MetaPixel />
            </Suspense>
            <UnlockOnReturn />
            {children}
            <footer className="relative mx-auto max-w-3xl px-4 pb-8 pt-2 text-center text-[11px] text-haze/60 leading-relaxed">
              <p>
                For entertainment &amp; self-reflection — real astronomy, human interpretation.
              </p>
              <p className="mt-1">
                <a href="/privacy/" className="text-gold/70 hover:text-gold underline underline-offset-4">Privacy</a>
                <span className="mx-2">·</span>
                <a href="/terms/" className="text-gold/70 hover:text-gold underline underline-offset-4">Terms</a>
                <span className="mx-2">·</span>
                <a href="mailto:support@carecompass.me" className="text-gold/70 hover:text-gold underline underline-offset-4">Contact</a>
              </p>
            </footer>
            <ConsentBanner />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
