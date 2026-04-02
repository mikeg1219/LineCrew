/** Top 10 busiest US airports by passenger volume. */

export type AirportEntry = {
  code: string;
  label: string;
  aliases: string[];
};

export const US_AIRPORTS_TOP_20: readonly AirportEntry[] = [
  { code: "ATL", label: "Atlanta — ATL (Hartsfield-Jackson)", aliases: ["atlanta", "hartsfield", "hartsfield-jackson"] },
  { code: "DFW", label: "Dallas/Fort Worth — DFW", aliases: ["dallas", "fort worth"] },
  { code: "DEN", label: "Denver — DEN", aliases: ["denver", "dia"] },
  { code: "ORD", label: "Chicago — ORD (O'Hare)", aliases: ["chicago", "ohare", "o hare"] },
  { code: "LAX", label: "Los Angeles — LAX", aliases: ["los angeles", "lax"] },
  { code: "JFK", label: "New York — JFK (John F. Kennedy)", aliases: ["new york", "jfk", "kennedy"] },
  { code: "LAS", label: "Las Vegas — LAS (Harry Reid)", aliases: ["las vegas", "vegas", "harry reid"] },
  { code: "MCO", label: "Orlando — MCO (Orlando International)", aliases: ["orlando", "mco"] },
  { code: "CLT", label: "Charlotte — CLT (Charlotte Douglas)", aliases: ["charlotte", "clt"] },
  { code: "SEA", label: "Seattle — SEA (Sea-Tac)", aliases: ["seattle", "sea tac", "seatac"] },
];

export type AirportCode = (typeof US_AIRPORTS_TOP_20)[number]["code"];

export const AIRPORT_CODES: Set<string> = new Set(
  US_AIRPORTS_TOP_20.map((a) => a.code)
);

function searchBlob(a: AirportEntry): string {
  return [a.code, a.label, ...a.aliases].join(" ").toLowerCase();
}

export function airportShortLabel(code: string): string {
  const entry = US_AIRPORTS_TOP_20.find((a) => a.code === code);
  if (!entry) return code;
  const parts = entry.label.split("—");
  return parts[0]?.trim() ?? entry.label;
}

export function filterAirportsByQuery(query: string): AirportEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...US_AIRPORTS_TOP_20];
  return US_AIRPORTS_TOP_20.filter((a) => {
    const blob = searchBlob(a);
    if (blob.includes(q)) return true;
    return blob.split(/[\s—(),]+/).filter(Boolean).some((w) => w.startsWith(q));
  });
}
