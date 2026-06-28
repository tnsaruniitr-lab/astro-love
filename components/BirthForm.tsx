"use client";

import { useState } from "react";
import BirthFields, { type BirthFormValues } from "./BirthFields";

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
  const [v, setV] = useState<BirthFormValues>(initial);

  return (
    <form
      className="glass p-6 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <h2 className="font-display text-2xl text-cream mb-1">Your birth details</h2>
      <p className="text-haze text-sm mb-5">
        We compute the real positions of the planets at your exact birth moment.
      </p>

      <BirthFields value={v} onChange={setV} />

      <button type="submit" disabled={loading} className="btn-gold w-full mt-6 py-3 flex items-center justify-center gap-2">
        {loading ? "Reading the sky…" : "Reveal my chart"}
      </button>
    </form>
  );
}
