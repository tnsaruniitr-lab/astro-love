import type { Mode } from "@/lib/loveLanguage";

// Elegant inline SVG motif per love language. Stroke uses currentColor, so the
// caller controls the gold via text color. No external assets, fully theme-able.

const HEART =
  "M12 21s-7-4.5-9.5-9C1 8.5 2 5 5.5 5 7.5 5 9 6.2 12 9c3-2.8 4.5-4 6.5-4C22 5 23 8.5 21.5 12 19 16.5 12 21 12 21z";

export default function LoveLangIcon({ mode, size = 48, className }: { mode: Mode; size?: number; className?: string }) {
  const common = {
    width: size, height: size, viewBox: "0 0 48 48", fill: "none",
    stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const, className, "aria-hidden": true,
  };

  switch (mode) {
    case "words": // speech bubble + heart
      return (
        <svg {...common}>
          <rect x="5" y="10" width="38" height="22" rx="7" />
          <path d="M16 32v7l9-7" />
          <g transform="translate(15.5 14) scale(0.6)"><path d={HEART} fill="currentColor" stroke="none" /></g>
        </svg>
      );
    case "acts": // heart with a checkmark
      return (
        <svg {...common}>
          <g transform="translate(6 6) scale(1.5)"><path d={HEART} /></g>
          <path d="M18 25l4 4 8-9" />
        </svg>
      );
    case "gifts": // gift box + bow
      return (
        <svg {...common}>
          <rect x="9" y="20" width="30" height="18" rx="2" />
          <path d="M9 27h30M24 20v18" />
          <path d="M24 20C20 12 13 14 24 20C28 12 35 14 24 20Z" />
        </svg>
      );
    case "time": // clock
      return (
        <svg {...common}>
          <circle cx="24" cy="25" r="15" />
          <path d="M24 16v9l6 4" />
        </svg>
      );
    case "touch": // two overlapping hearts (closeness)
      return (
        <svg {...common}>
          <g transform="translate(2 9) scale(0.92)"><path d={HEART} /></g>
          <g transform="translate(20 9) scale(0.92)"><path d={HEART} fill="currentColor" stroke="none" opacity="0.85" /></g>
        </svg>
      );
    default:
      return null;
  }
}
