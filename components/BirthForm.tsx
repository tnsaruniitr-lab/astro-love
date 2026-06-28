"use client";

import { useState } from "react";
import BirthFields, { type BirthFormValues } from "./BirthFields";
import { useT } from "./LocaleProvider";

export type { BirthFormValues } from "./BirthFields";

export default function BirthForm({
  initial,
  loading,
  onSubmit,
}: {
  initial: BirthFormValues;
  loading: boolean;
  onSubmit: (v: BirthFormValues) => void;
}) {
  const t = useT();
  const [v, setV] = useState<BirthFormValues>(initial);

  return (
    <form
      className="glass p-6 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <h2 className="font-display text-2xl text-cream mb-1">{t.natal.yourBirthDetails}</h2>
      <p className="text-haze text-sm mb-5">{t.natal.birthDetailsSub}</p>

      <BirthFields value={v} onChange={setV} />

      <button type="submit" disabled={loading} className="btn-gold w-full mt-6 py-3 flex items-center justify-center gap-2">
        {loading ? t.natal.readingSky : t.natal.revealChart}
      </button>
    </form>
  );
}
