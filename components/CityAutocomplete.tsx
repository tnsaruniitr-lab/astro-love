"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces, type BirthPlace } from "@/lib/geo/geocode";

/**
 * Type-to-search birthplace picker. Queries the global geocoding API
 * (debounced, cancellable) and returns a full BirthPlace — lat/lon + IANA tz —
 * so any city worldwide, however small, can be selected.
 */
export default function CityAutocomplete({
  value,
  onChange,
  placeholder = "Start typing a city…",
}: {
  value: BirthPlace | null;
  onChange: (p: BirthPlace | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [results, setResults] = useState<BirthPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync the visible text when a place is set from outside (e.g. defaults).
  useEffect(() => {
    if (value) setQuery(value.label);
  }, [value?.label]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search. Skip while the box already shows the selected place.
  useEffect(() => {
    const q = query.trim();
    if (value && q === value.label) {
      setResults([]);
      setNote(null);
      setLoading(false);
      return;
    }
    if (q.length < 2) {
      setResults([]);
      setNote(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const found = await searchPlaces(q, ac.signal);
        setResults(found);
        setActive(0);
        setOpen(true);
        setNote(found.length ? null : "No matching places found");
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") {
          setNote("Couldn’t reach the location service — check your connection.");
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, value]);

  // Close the dropdown when clicking elsewhere.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function select(p: BirthPlace) {
    onChange(p);
    setQuery(p.label);
    setResults([]);
    setNote(null);
    setOpen(false);
  }

  function onType(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    if (value) onChange(null); // editing invalidates the prior selection
    setOpen(true);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault();
        select(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && results.length > 0;
  const showNote = open && !loading && !!note && results.length === 0;

  return (
    <div ref={boxRef} className="relative">
      <input
        className="field w-full px-3.5 py-2.5 pr-9"
        placeholder={placeholder}
        value={query}
        onChange={onType}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
      />

      {loading && (
        <span
          aria-hidden
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-haze/30 border-t-gold animate-spin"
        />
      )}

      {showList && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1.5 w-full max-h-72 overflow-y-auto rounded-xl border border-cream/15 bg-panel shadow-2xl shadow-black/40 py-1"
        >
          {results.map((p, i) => (
            <li
              key={p.id ?? `${p.lat},${p.lon}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus so selection registers before blur
                select(p);
              }}
              className={`cursor-pointer px-3.5 py-2 flex items-baseline justify-between gap-3 ${
                i === active ? "bg-gold/15" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="text-cream">{p.name}</span>
                {(p.admin1 || p.country) && (
                  <span className="text-haze text-xs ml-2">
                    {[p.admin1, p.country].filter(Boolean).join(", ")}
                  </span>
                )}
              </span>
              <span className="text-haze/60 text-[10px] uppercase tracking-wider shrink-0">
                {p.countryCode ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showNote && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-cream/15 bg-panel px-3.5 py-2.5 text-sm text-haze shadow-2xl shadow-black/40">
          {note}
        </div>
      )}
    </div>
  );
}
