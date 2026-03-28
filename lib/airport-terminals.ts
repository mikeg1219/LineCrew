/**
 * Representative terminal / concourse names per airport code (for job posting UX).
 */
export const AIRPORT_TERMINALS: Record<string, string[]> = {
  ATL: ["Domestic Terminal (T1)", "International Terminal (T2)"],
  DFW: ["Terminal A", "Terminal B", "Terminal C", "Terminal D", "Terminal E"],
  DEN: ["Concourse A", "Concourse B", "Concourse C"],
  ORD: ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 5"],
  LAX: [
    "Terminal 1",
    "Terminal 2",
    "Terminal 3",
    "Terminal 4",
    "Terminal 5",
    "Terminal 6",
    "Terminal 7",
    "Terminal 8",
    "Tom Bradley International (TBIT)",
  ],
  CLT: ["Concourse A", "Concourse B", "Concourse C", "Concourse D", "Concourse E"],
  LAS: ["Terminal 1", "Terminal 3"],
  PHX: ["Terminal 3", "Terminal 4"],
  MIA: ["North Terminal", "Central Terminal", "South Terminal"],
  SEA: ["Main Terminal", "Satellite Terminal"],
  MCO: ["Terminal A", "Terminal B", "Terminal C"],
  EWR: ["Terminal A", "Terminal B", "Terminal C"],
  SFO: ["Terminal 1", "Terminal 2", "Terminal 3", "International Terminal"],
  IAH: ["Terminal A", "Terminal B", "Terminal C", "Terminal D", "Terminal E"],
  DTW: ["McNamara Terminal", "North Terminal"],
  PHL: ["Terminal A", "Terminal B", "Terminal C", "Terminal D", "Terminal E", "Terminal F"],
  BOS: ["Terminal A", "Terminal B", "Terminal C", "Terminal E"],
  FLL: ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 4"],
  TPA: [
    "Terminal A (Airside A)",
    "Terminal C (Airside C)",
    "Terminal E (Airside E)",
    "Terminal F (Airside F)",
  ],
  PBI: ["Terminal 1", "Terminal 2"],
};

export function getTerminalsForAirport(airportCode: string | null): string[] {
  if (!airportCode) return [];
  return AIRPORT_TERMINALS[airportCode] ?? [];
}

export function isValidTerminalForAirport(
  airportCode: string,
  terminal: string
): boolean {
  const list = AIRPORT_TERMINALS[airportCode];
  if (!list?.length) return false;
  return list.includes(terminal);
}
