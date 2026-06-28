import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeFX from "@/components/ThemeFX";

export const metadata: Metadata = {
  title: "Astro-Love · Natal Chart",
  description:
    "Your real birth chart, computed from astronomy — the foundation of math-based love compatibility.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Apply the saved theme before first paint to avoid a flash.
const BOOT = `(function(){try{var ok=['night','dawn','velvet','peony','twilight'];var t=localStorage.getItem('astro-theme');if(ok.indexOf(t)<0)t='night';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','night');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="night">
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
