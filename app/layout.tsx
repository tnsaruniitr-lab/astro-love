import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LocaleProvider } from "@/components/LocaleProvider";
import ThemeFX from "@/components/ThemeFX";
import UnlockOnReturn from "@/components/UnlockOnReturn";
import Analytics from "@/components/Analytics";

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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Apply the saved theme before first paint to avoid a flash.
// Velvet Rouge is the signature default; a saved choice still wins.
const BOOT = `(function(){try{var ok=['night','dawn','velvet','peony','twilight'];var t=localStorage.getItem('astro-theme');if(ok.indexOf(t)<0)t='velvet';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','velvet');}
try{var L=['en','ru','uk','sk','pl','de','es','ar'];var l=localStorage.getItem('astro-locale');if(L.indexOf(l)<0)l='en';document.documentElement.setAttribute('lang',l);document.documentElement.setAttribute('dir',l==='ar'?'rtl':'ltr');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="velvet">
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
          <LocaleProvider>
            <Analytics />
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
              </p>
            </footer>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
