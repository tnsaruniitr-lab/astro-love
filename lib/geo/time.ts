// Local birth wall-clock + IANA zone -> exact UTC instant, using the IANA
// tz database via Luxon so HISTORICAL offsets/DST are applied correctly
// (SPEC.md §5.3 — the former-USSR DST history is the classic accuracy trap).

import { DateTime } from "luxon";
import type { ChartInput } from "../astro/types";

export interface ResolvedInstant {
  utc: Date;
  localISO: string;
  offsetMinutes: number;
  zoneValid: boolean;
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
    const utc = new Date(Date.UTC(input.year, input.month - 1, input.day, hour, minute));
    return { utc, localISO: utc.toISOString(), offsetMinutes: 0, zoneValid: false };
  }

  return {
    utc: dt.toUTC().toJSDate(),
    localISO: dt.toISO({ suppressMilliseconds: true }) ?? "",
    offsetMinutes: dt.offset, // historical offset for THIS instant
    zoneValid: true,
  };
}
