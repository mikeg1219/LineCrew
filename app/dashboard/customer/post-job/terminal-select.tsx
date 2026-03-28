"use client";

import { getTerminalsForAirport } from "@/lib/airport-terminals";

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

type Props = {
  airportCode: string | null;
};

export function TerminalSelect({ airportCode }: Props) {
  const terminals = getTerminalsForAirport(airportCode);
  const disabled = !airportCode;

  return (
    <select
      id="terminal"
      name="terminal"
      required={!disabled}
      disabled={disabled}
      key={airportCode ?? "none"}
      defaultValue=""
      className={`${selectClass} ${disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
    >
      <option value="" disabled>
        {disabled ? "Select airport first" : "Select terminal"}
      </option>
      {terminals.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
