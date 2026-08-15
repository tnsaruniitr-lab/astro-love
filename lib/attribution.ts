// First-touch campaign attribution.
//
// This is the join key between money spent and money earned. Meta knows what a
// campaign cost; only we know what it actually sold. Neither number means much
// alone, and nothing can connect them after the fact — a click that arrives
// before this code exists is unattributable forever. Hence: capture on the very
// first landing, keep it, and stamp it onto every event and every purchase.
//
// FIRST touch wins, deliberately. A visitor who arrives from an ad, leaves, and
// returns by typing the URL was still bought by that ad; letting the direct
// visit overwrite it would quietly credit the sale to nobody.
//
// Ad URLs carry Meta's dynamic macros, which the delivery system fills in with
// the real ids at click time:
//   ?lang=ru&utm_source=meta&utm_campaign={{campaign.name}}
//   &cid={{campaign.id}}&aid={{adset.id}}&adid={{ad.id}}
// Those beat hand-typed utm values — they cannot drift from what Ads Manager
// actually ran.

import { readConsent } from "./consent";

export const ATTR_COOKIE = "am_attr";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days — longer than any sane consideration window

export interface Attribution {
  /** utm_source */ src?: string;
  /** utm_medium */ med?: string;
  /** utm_campaign */ cmp?: string;
  /** utm_content */ cnt?: string;
  /** campaign id */ cid?: string;
  /** ad set id */ aid?: string;
  /** ad id */ adid?: string;
  /** Meta click id */ fbclid?: string;
  /** first seen, epoch ms — also the fbc timestamp */ ts?: number;
}

const FIELDS: [keyof Attribution, string[]][] = [
  ["src", ["utm_source"]],
  ["med", ["utm_medium"]],
  ["cmp", ["utm_campaign"]],
  ["cnt", ["utm_content"]],
  ["cid", ["cid", "campaign_id"]],
  ["aid", ["aid", "adset_id"]],
  ["adid", ["adid", "ad_id"]],
  ["fbclid", ["fbclid"]],
];

// Values land in a cookie and in the database, so keep them short and boring.
const clean = (v: string) => v.trim().slice(0, 120).replace(/[^\w .:/+=-]/g, "");

/** Read whatever is already stored. Never throws. */
export function readAttribution(): Attribution | null {
  if (typeof document === "undefined") return null;
  try {
    const m = document.cookie.match(/(?:^|;\s*)am_attr=([^;]*)/);
    if (!m) return null;
    const parsed = JSON.parse(decodeURIComponent(m[1]));
    return parsed && typeof parsed === "object" ? (parsed as Attribution) : null;
  } catch {
    return null;
  }
}

/** Capture from the current URL if this is a first touch. Returns what is now
 *  stored (existing value if there already was one).
 *
 *  Consent-gated for the same reason everything else is: in the EU this is a
 *  cookie a visitor did not ask for. Outside those regions consent is granted
 *  by default, so the campaigns that start in Ukraine and Kazakhstan attribute
 *  at full rate. */
export function captureAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  if (readConsent() !== "granted") return null;

  const existing = readAttribution();
  if (existing) return existing; // first touch wins

  const qs = new URLSearchParams(window.location.search);
  const attr: Attribution = {};
  for (const [key, aliases] of FIELDS) {
    for (const alias of aliases) {
      const raw = qs.get(alias);
      if (raw) { (attr as Record<string, unknown>)[key] = clean(raw); break; }
    }
  }
  // A referrer alone isn't worth a cookie; only store a real campaign touch.
  if (!Object.keys(attr).length) return null;

  attr.ts = Date.now();
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      `${ATTR_COOKIE}=${encodeURIComponent(JSON.stringify(attr))}; path=/; max-age=${MAX_AGE}; SameSite=Lax${secure}`;
  } catch {
    return null;
  }
  return attr;
}
