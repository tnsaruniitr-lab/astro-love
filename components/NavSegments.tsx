"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Compatibility" },
  { href: "/natal", label: "Natal chart" },
  { href: "/love-language", label: "Love language" },
];

/** Segmented control across the three sections. The active segment reflects
 *  the current page (Compatibility is the landing default). */
export default function NavSegments() {
  const pathname = usePathname() || "/";
  const norm = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-cream/12 bg-cream/[0.04] p-1" role="tablist" aria-label="Sections">
      {TABS.map((t) => {
        const active = norm === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] uppercase tracking-[0.16em] whitespace-nowrap transition-all ${
              active ? "font-semibold" : "text-haze hover:text-gold"
            }`}
            style={active ? { background: "var(--btn-grad)", color: "var(--btn-text)", boxShadow: "var(--btn-shadow)" } : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
