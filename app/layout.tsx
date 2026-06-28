import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LocaleProvider } from "@/components/LocaleProvider";
import ThemeFX from "@/components/ThemeFX";

export const metadata: Metadata = {
  title: "Astro-Love · Natal Chart",
  description:
    "Your real birth chart, computed from astronomy, the foundation of math-based love compatibility.",
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
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
