"use client";

import { useEffect, useState } from "react";
import CityAutocomplete from "./CityAutocomplete";
import { useT } from "./LocaleProvider";
import type { BirthPlace } from "@/lib/geo/geocode";

export interface BirthFormValues {
  name: string;
  place: BirthPlace | null;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timeKnown: boolean;
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const clamp = (n: number, lo: number, hi: number) =>
  Number.isNaN(n) ? lo : Math.min(hi, Math.max(lo, n));

/** Controlled birth-data fields (no heading/button) — reused by single & couple flows. */
export default function BirthFields({
  value: v,
  onChange,
  namePlaceholder = "e.g. Anna",
}: {
  value: BirthFormValues;
  onChange: (v: BirthFormValues) => void;
  namePlaceholder?: string;
}) {
  const t = useT();
  const set = <K extends keyof BirthFormValues>(k: K, val: BirthFormValues[K]) =>
    onChange({ ...v, [k]: val });

  return (
    <div className="space-y-4">
      <Field label={t.birth.nameOptional}>
        <input
          className="field w-full px-3.5 py-2.5"
          placeholder={namePlaceholder}
          value={v.name}
          maxLength={40}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>

      <Field label={t.birth.birthplace}>
        <CityAutocomplete value={v.place} onChange={(p) => set("place", p)} />
        <span className="block text-[11px] text-haze/70 mt-1.5">{t.birth.birthplaceHelp}</span>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t.birth.day}>
          <NumberField value={v.day} min={1} max={31} onChange={(n) => set("day", n)} className="field w-full px-3 py-2.5 tabular-nums" />
        </Field>
        <Field label={t.birth.month}>
          <select className="field w-full px-2 py-2.5" value={v.month} onChange={(e) => set("month", +e.target.value)}>
            {t.birth.months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label={t.birth.year}>
          <NumberField value={v.year} min={1900} max={2100} onChange={(n) => set("year", n)} className="field w-full px-3 py-2.5 tabular-nums" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.birth.hour}>
          <NumberField value={v.hour} min={0} max={23} onChange={(n) => set("hour", n)} disabled={!v.timeKnown} className="field w-full px-3 py-2.5 tabular-nums disabled:opacity-40" />
        </Field>
        <Field label={t.birth.minute}>
          <NumberField value={v.minute} min={0} max={59} onChange={(n) => set("minute", n)} disabled={!v.timeKnown} className="field w-full px-3 py-2.5 tabular-nums disabled:opacity-40" />
        </Field>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-haze cursor-pointer select-none">
        <input type="checkbox" checked={!v.timeKnown} onChange={(e) => set("timeKnown", !e.target.checked)} className="accent-gold w-4 h-4" />
        {t.birth.timeUnknown}
      </label>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-haze/80 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

/**
 * Numeric field you can actually TYPE into. We keep the in-progress text local
 * and only clamp to [min,max] on blur, so typing "2000" into a year (min 1900)
 * is no longer snapped to 1900 on the first keystroke. inputMode=numeric brings
 * up the number keypad on mobile.
 */
function NumberField({
  value, min, max, onChange, className, disabled,
}: {
  value: number; min: number; max: number; onChange: (n: number) => void; className?: string; disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);

  // Sync from outside (defaults, shared-link prefill, reset) when not editing.
  useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      disabled={disabled}
      className={className}
      value={text}
      onFocus={(e) => { setEditing(true); e.currentTarget.select(); }}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={() => {
        setEditing(false);
        const n = text === "" ? min : clamp(parseInt(text, 10), min, max);
        setText(String(n));
        onChange(n);
      }}
    />
  );
}
