// Local birth wall-clock + IANA zone -> exact UTC instant, using the IANA
// tz database via Luxon so HISTORICAL offsets/DST are applied correctly
// (SPEC.md §5.3 — the former-USSR DST history is the classic accuracy trap).
//
// Degraded inputs are never silent:
//  - invalid zone        -> zoneValid=false (callers must gate angles/houses)
//  - spring-forward gap  -> gapAdjusted=true (the entered time never existed;
//                           Luxon shifts it past the jump — we surface that)
//  - fall-back overlap   -> ambiguous=true (the entered time happened twice;
//                           the EARLIER occurrence is used)

import { DateTime } from "luxon";
import type { ChartInput } from "../astro/types";

export interface ResolvedInstant {
  utc: Date;
  localISO: string;
  offsetMinutes: number;
  zoneValid: boolean;
  /** The entered wall-clock fell in a DST gap and was shifted forward. */
  gapAdjusted: boolean;
  /** The adjusted local time actually used when gapAdjusted (e.g. "03:30"). */
  gapAdjustedTo: string | null;
  /** The entered wall-clock occurred twice (DST fall-back); earlier used. */
  ambiguous: boolean;
}

export function resolveInstant(input: ChartInput): ResolvedInstant {
  // When birth time is unknown, use local noon as a neutral placeholder.
  const hour = input.timeKnown ? input.hour : 12;
  const minute = input.timeKnown ? input.minute : 0;

  const dt = DateTime.fromObject(
    {
      year: input.year,
      month: input.month,
      day: input.day,
      hour,
      minute,
    },
    { zone: input.tz },
  );

  if (!dt.isValid) {
    // Fall back to treating the wall-clock as UTC; flagged via zoneValid=false.
    // Callers must NOT compute Ascendant/houses from this instant.
    const utc = new Date(Date.UTC(input.year, input.month - 1, input.day, hour, minute));
    return {
      utc,
      localISO: utc.toISOString(),
      offsetMinutes: 0,
      zoneValid: false,
      gapAdjusted: false,
      gapAdjustedTo: null,
      ambiguous: false,
    };
  }

  // Spring-forward gap: Luxon coerces a non-existent wall-clock forward, so
  // the resolved local time no longer matches what was entered.
  const gapAdjusted = dt.hour !== hour || dt.minute !== minute;
  const gapAdjustedTo = gapAdjusted
    ? `${String(dt.hour).padStart(2, "0")}:${String(dt.minute).padStart(2, "0")}`
    : null;

  // Fall-back overlap: the same wall-clock occurs again 60 (or 30) minutes
  // later in UTC. Luxon resolves to the EARLIER occurrence; we flag it.
  let ambiguous = false;
  if (!gapAdjusted) {
    for (const stepMs of [3_600_000, 1_800_000]) {
      const later = DateTime.fromMillis(dt.toMillis() + stepMs, { zone: input.tz });
      if (later.hour === hour && later.minute === minute && later.day === dt.day) {
        ambiguous = true;
        break;
      }
    }
  }

  return {
    utc: dt.toUTC().toJSDate(),
    localISO: dt.toISO({ suppressMilliseconds: true }) ?? "",
    offsetMinutes: dt.offset, // historical offset for THIS instant
    zoneValid: true,
    gapAdjusted,
    gapAdjustedTo,
    ambiguous,
  };
}
