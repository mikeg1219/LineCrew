import { TERMINALS_BY_AIRPORT } from "@/lib/terminals";

export { getTerminalsForAirport, TERMINALS_BY_AIRPORT } from "@/lib/terminals";
export type { TerminalOption } from "@/lib/terminals";

export function isValidTerminalForAirport(airportCode: string, terminal: string): boolean {
  const terminals = TERMINALS_BY_AIRPORT[airportCode] ?? [];
  return terminals.some((t: { value: string }) => t.value === terminal);
}
