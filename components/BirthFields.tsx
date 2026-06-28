"use client";

import { CITIES } from "@/lib/geo/cities";

export interface BirthFormValues {
  name: string;
  cityId: string;
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
  const set = <K extends keyof BirthFormValues>(k: K, val: BirthFormValues[K]) =>
    onChange({ ...v, [k]: val });

  return (
    <div className="space-y-4">
      <Field label="Name (optional)">
        <input
          className="field w-full px-3.5 py-2.5"
          placeholder={namePlaceholder}
          value={v.name}
          maxLength={40}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>

      <Field label="Birthplace">
        <select className="field w-full px-3.5 py-2.5" value={v.cityId} onChange={(e) => set("cityId", e.target.value)}>
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.country}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Day">
          <input type="number" min={1} max={31} className="field w-full px-3 py-2.5 tabular-nums" value={v.day} onChange={(e) => set("day", clamp(+e.target.value, 1, 31))} />
        </Field>
        <Field label="Month">
          <select className="field w-full px-2 py-2.5" value={v.month} onChange={(e) => set("month", +e.target.value)}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <input type="number" min={1900} max={2100} className="field w-full px-3 py-2.5 tabular-nums" value={v.year} onChange={(e) => set("year", clamp(+e.target.value, 1900, 2100))} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hour">
          <input type="number" min={0} max={23} disabled={!v.timeKnown} className="field w-full px-3 py-2.5 tabular-nums disabled:opacity-40" value={v.hour} onChange={(e) => set("hour", clamp(+e.target.value, 0, 23))} />
        </Field>
        <Field label="Minute">
          <input type="number" min={0} max={59} disabled={!v.timeKnown} className="field w-full px-3 py-2.5 tabular-nums disabled:opacity-40" value={v.minute} onChange={(e) => set("minute", clamp(+e.target.value, 0, 59))} />
        </Field>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-haze cursor-pointer select-none">
        <input type="checkbox" checked={!v.timeKnown} onChange={(e) => set("timeKnown", !e.target.checked)} className="accent-gold w-4 h-4" />
        Birth time unknown
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
