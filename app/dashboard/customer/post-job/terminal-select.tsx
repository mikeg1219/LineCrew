"use client";

import { getTerminalsForAirport } from "@/lib/airport-terminals";

const selectClass =
  "min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

type Props = {
  airportCode: string | null;
  initialTerminal?: string;
};

export function TerminalSelect({ airportCode, initialTerminal }: Props) {
  const terminals = getTerminalsForAirport(airportCode);
  const disabled = !airportCode;
  const defaultVal =
    initialTerminal &&
    airportCode &&
    terminals.some((t) => t.value === initialTerminal)
      ? initialTerminal
      : "";

  return (
    <select
      id="terminal"
      name="terminal"
      required={!disabled}
      disabled={disabled}
      key={`${airportCode ?? "none"}-${initialTerminal ?? ""}`}
      defaultValue={defaultVal}
      className={`${selectClass} ${disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
    >
      <option value="" disabled>
        {disabled ? "Select airport first" : "Select terminal"}
      </option>
      {terminals.map((t) => (
        <option key={t.value} value={t.value}>
         {t.label}
        </option>
      ))}
    </select>
  );
}
