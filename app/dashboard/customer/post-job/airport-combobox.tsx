"use client";

import {
  filterAirportsByQuery,
  type AirportEntry,
} from "@/lib/airports";
import { useEffect, useId, useRef, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

type Props = {
  name?: string;
  onAirportChange?: (code: string | null) => void;
};

export function AirportCombobox({ name = "airport", onAirportChange }: Props) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const filtered = filterAirportsByQuery(inputValue);

  useEffect(() => {
    function handleDoc(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDoc);
    return () => document.removeEventListener("mousedown", handleDoc);
  }, []);

  function handleChange(v: string) {
    setInputValue(v);
    setSelectedCode(null);
    onAirportChange?.(null);
    setOpen(true);
  }

  function pick(a: AirportEntry) {
    setSelectedCode(a.code);
    setInputValue(a.label);
    onAirportChange?.(a.code);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id="airport-search"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search by city or airport code (e.g. ATL, Atlanta, Hartsfield)…"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        className={inputClass}
      />
      <input type="hidden" name={name} value={selectedCode ?? ""} />

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              No airports match your search.
            </li>
          ) : (
            filtered.map((a) => (
              <li key={a.code} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedCode === a.code}
                  className="w-full cursor-pointer px-3 py-2.5 text-left text-sm text-slate-900 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(a)}
                >
                  {a.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
