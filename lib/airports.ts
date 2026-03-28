/** Top ~20 US airports (codes + display labels + search aliases). Florida-heavy for launch. */

export type AirportEntry = {
  code: string;
  label: string;
  /** Extra substrings for fuzzy search (city nicknames, official names, etc.) */
  aliases: string[];
};

export const US_AIRPORTS_TOP_20: readonly AirportEntry[] = [
  {
    code: "ATL",
    label: "Atlanta — ATL (Hartsfield-Jackson)",
    aliases: ["atlanta", "hartsfield", "hartsfield-jackson", "hartfield"],
  },
  {
    code: "DFW",
    label: "Dallas/Fort Worth — DFW",
    aliases: ["dallas", "fort worth", "dfw"],
  },
  { code: "DEN", label: "Denver — DEN", aliases: ["denver", "dia"] },
  {
    code: "ORD",
    label: "Chicago — ORD (O'Hare)",
    aliases: ["chicago", "ohare", "o hare"],
  },
  { code: "LAX", label: "Los Angeles — LAX", aliases: ["los angeles", "lax"] },
  {
    code: "CLT",
    label: "Charlotte — CLT",
    aliases: ["charlotte", "clt"],
  },
  {
    code: "LAS",
    label: "Las Vegas — LAS (Harry Reid)",
    aliases: ["las vegas", "vegas", "harry reid", "mccarran"],
  },
  {
    code: "PHX",
    label: "Phoenix — PHX (Sky Harbor)",
    aliases: ["phoenix", "sky harbor"],
  },
  { code: "MIA", label: "Miami — MIA", aliases: ["miami"] },
  {
    code: "SEA",
    label: "Seattle — SEA (Sea-Tac)",
    aliases: ["seattle", "sea tac", "seatac"],
  },
  {
    code: "MCO",
    label: "Orlando — MCO (Orlando International)",
    aliases: ["orlando", "orlando international", "mco"],
  },
  {
    code: "EWR",
    label: "Newark — EWR (Liberty)",
    aliases: ["newark", "liberty"],
  },
  {
    code: "SFO",
    label: "San Francisco — SFO",
    aliases: ["san francisco", "sf", "sfo"],
  },
  {
    code: "IAH",
    label: "Houston — IAH (George Bush)",
    aliases: ["houston", "george bush", "intercontinental"],
  },
  { code: "DTW", label: "Detroit — DTW", aliases: ["detroit", "metro"] },
  {
    code: "PHL",
    label: "Philadelphia — PHL",
    aliases: ["philadelphia", "philly"],
  },
  { code: "BOS", label: "Boston — BOS (Logan)", aliases: ["boston", "logan"] },
  {
    code: "FLL",
    label: "Fort Lauderdale — FLL",
    aliases: ["fort lauderdale", "ft lauderdale", "fll", "broward"],
  },
  {
    code: "TPA",
    label: "Tampa — TPA (Tampa International)",
    aliases: ["tampa", "tampa international", "tpa", "hillsborough"],
  },
  {
    code: "PBI",
    label: "Palm Beach — PBI (West Palm Beach)",
    aliases: ["palm beach", "west palm beach", "pbi", "palm beach international"],
  },
];

export type AirportCode = (typeof US_AIRPORTS_TOP_20)[number]["code"];

export const AIRPORT_CODES: Set<string> = new Set(
  US_AIRPORTS_TOP_20.map((a) => a.code)
);

/** Lowercase searchable blob per airport (code + label + aliases). */
function searchBlob(a: AirportEntry): string {
  return [a.code, a.label, ...a.aliases].join(" ").toLowerCase();
}

/**
 * Filter airports by fuzzy substring match on code, label, or aliases.
 */
export function filterAirportsByQuery(query: string): AirportEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...US_AIRPORTS_TOP_20];
  }
  return US_AIRPORTS_TOP_20.filter((a) => {
    const blob = searchBlob(a);
    if (blob.includes(q)) return true;
    const words = blob.split(/[\s—(),]+/).filter(Boolean);
    return words.some((w) => w.startsWith(q));
  });
}
