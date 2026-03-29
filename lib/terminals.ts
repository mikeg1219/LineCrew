/**
 * Security LINE locations for the top 10 busiest US airports.
 * The Waiter holds the customer's spot IN LINE before the security checkpoint.
 * No ID or boarding pass required to stand in line — only to pass through.
 */

export type TerminalOption = {
  value: string;
  label: string;
  note?: string;
};

export const TERMINALS_BY_AIRPORT: Record<string, TerminalOption[]> = {

  // ATL — Hartsfield-Jackson Atlanta
  // Lines form outside the Domestic or International terminal entrances.
  ATL: [
    { value: "Domestic Terminal - Main Line", label: "Domestic Terminal — Main Security Line", note: "Largest line. Central atrium entrance." },
    { value: "Domestic Terminal - North Line", label: "Domestic Terminal — North Security Line", note: "North side entrance of Domestic Terminal." },
    { value: "Domestic Terminal - South Line", label: "Domestic Terminal — South Security Line", note: "South side entrance of Domestic Terminal." },
    { value: "International Terminal - Line", label: "International Terminal — Security Line", note: "For international departures. Concourse F entrance." },
  ],

  // DFW — Dallas/Fort Worth
  // Each terminal has its own security line at the terminal entrance.
  DFW: [
    { value: "Terminal A - Security Line", label: "Terminal A — Security Line", note: "American Airlines domestic." },
    { value: "Terminal B - Security Line", label: "Terminal B — Security Line", note: "American Airlines domestic." },
    { value: "Terminal C - Security Line", label: "Terminal C — Security Line", note: "American Airlines domestic." },
    { value: "Terminal D - Security Line", label: "Terminal D — Security Line (International)", note: "International + some domestic flights." },
    { value: "Terminal E - Security Line", label: "Terminal E — Security Line", note: "Multiple airlines." },
  ],

  // DEN — Denver International
  // One terminal. Lines form at the main security entrance on Level 6.
  DEN: [
    { value: "Jeppesen Terminal - Main Security Line", label: "Jeppesen Terminal — Main Security Line", note: "Central security entrance. Most common." },
    { value: "Jeppesen Terminal - North Security Line", label: "Jeppesen Terminal — North Security Line", note: "North side entrance. Usually shorter." },
    { value: "Jeppesen Terminal - South Security Line", label: "Jeppesen Terminal — South Security Line", note: "South side entrance. Usually shorter." },
  ],

  // ORD — Chicago O'Hare
  // Each terminal has its own security line.
  ORD: [
    { value: "Terminal 1 - Security Line", label: "Terminal 1 — Security Line (United)", note: "United Airlines hub. Concourses B and C." },
    { value: "Terminal 2 - Security Line", label: "Terminal 2 — Security Line (United/Air Canada)", note: "Concourses E and F." },
    { value: "Terminal 3 - Security Line", label: "Terminal 3 — Security Line (American)", note: "American Airlines hub. Concourses G, H, K, L." },
    { value: "Terminal 5 - Security Line", label: "Terminal 5 — Security Line (International)", note: "International flights only." },
  ],

  // LAX — Los Angeles International
  // Each terminal has its own security line at the terminal entrance.
  LAX: [
    { value: "Terminal 1 - Security Line", label: "Terminal 1 — Security Line (Southwest)", note: "Southwest Airlines." },
    { value: "Terminal 2 - Security Line", label: "Terminal 2 — Security Line", note: "Spirit, WestJet, others." },
    { value: "Terminal 3 - Security Line", label: "Terminal 3 — Security Line (Delta/Alaska)", note: "Delta and Alaska domestic." },
    { value: "Terminal 4 - Security Line", label: "Terminal 4 — Security Line (American)", note: "American Airlines." },
    { value: "Terminal 5 - Security Line", label: "Terminal 5 — Security Line (Delta Intl)", note: "Delta international." },
    { value: "Terminal 6 - Security Line", label: "Terminal 6 — Security Line", note: "United, Frontier, others." },
    { value: "Terminal 7 - Security Line", label: "Terminal 7 — Security Line (United)", note: "United domestic." },
    { value: "Terminal 8 - Security Line", label: "Terminal 8 — Security Line (United Intl)", note: "United international." },
    { value: "TBIT - Security Line", label: "Tom Bradley International Terminal (TBIT) — Security Line", note: "Major international hub." },
  ],

  // JFK — John F. Kennedy International
  // Each terminal is independent with its own security line.
  JFK: [
    { value: "Terminal 1 - Security Line", label: "Terminal 1 — Security Line (International)", note: "Air France, Lufthansa, Japan Airlines." },
    { value: "Terminal 4 - Security Line", label: "Terminal 4 — Security Line (Delta)", note: "Delta hub. Largest terminal." },
    { value: "Terminal 5 - Security Line", label: "Terminal 5 — Security Line (JetBlue)", note: "JetBlue domestic and international." },
    { value: "Terminal 7 - Security Line", label: "Terminal 7 — Security Line (British Airways)", note: "Oneworld international." },
    { value: "Terminal 8 - Security Line", label: "Terminal 8 — Security Line (American)", note: "American Airlines domestic and international." },
  ],

  // LAS — Las Vegas Harry Reid International
  // Two terminal areas, each with their own security line.
  LAS: [
    { value: "Terminal 1 - Concourse B Line", label: "Terminal 1 — Concourse B Security Line", note: "Southwest, Frontier, Spirit." },
    { value: "Terminal 1 - Concourse C Line", label: "Terminal 1 — Concourse C Security Line", note: "Allegiant, Hawaiian, others." },
    { value: "Terminal 3 - Security Line", label: "Terminal 3 — Security Line (Concourses D/E)", note: "United, Delta, American, international." },
  ],

  // MCO — Orlando International
  // Security lines form at each terminal before the airside shuttle.
  MCO: [
    { value: "Terminal A - Security Line", label: "Terminal A (North) — Security Line", note: "Delta, United, American. Shuttle to Airside 1 & 2." },
    { value: "Terminal B - Security Line", label: "Terminal B (South) — Security Line", note: "Southwest Airlines only." },
    { value: "Terminal C - Security Line", label: "Terminal C (New) — Security Line", note: "Opened 2022. Brightline train connection." },
  ],

  // CLT — Charlotte Douglas International
  // Single terminal building. Lines form at three checkpoint entrances.
  CLT: [
    { value: "Main Terminal - Checkpoint A Line", label: "Main Terminal — Checkpoint A Line (Concourses A/B)", note: "Most common. American Airlines hub." },
    { value: "Main Terminal - Checkpoint B Line", label: "Main Terminal — Checkpoint B Line (Concourses C/D)", note: "American Airlines connecting hub." },
    { value: "Main Terminal - Checkpoint C Line", label: "Main Terminal — Checkpoint C Line (Concourse E)", note: "International departures." },
  ],

  // SEA — Seattle-Tacoma International
  // Single main terminal with two security line entrances.
  SEA: [
    { value: "Main Terminal - North Security Line", label: "Main Terminal — North Security Line", note: "Alaska Airlines hub. Concourses A–D." },
    { value: "Main Terminal - South Security Line", label: "Main Terminal — South Security Line", note: "Southwest, Delta, others. Concourses D–N." },
  ],
};

/**
 * Get security line options for a given airport code.
 */
export function getTerminalsForAirport(airportCode: string | null): TerminalOption[] {
  if (!airportCode) return [];
  return TERMINALS_BY_AIRPORT[airportCode] ?? [];
}
