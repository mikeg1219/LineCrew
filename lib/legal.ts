export const POLICY_VERSIONS = {
  terms: "2026-03-31.1",
  privacy: "2026-03-31.1",
  refund: "2026-03-31.1",
  guidelines: "2026-03-31.1",
  workerAgreement: "2026-03-31.1",
  categoryDisclaimer: {
    Airports: "2026-03-31.airports.1",
    "Concerts & Festivals": "2026-03-31.concerts.1",
    "Amusement Parks": "2026-03-31.parks.1",
    "Retail Drops": "2026-03-31.retail.1",
    "DMV & Government": "2026-03-31.government.1",
    Restaurants: "2026-03-31.restaurants.1",
    "Sports Events": "2026-03-31.sports.1",
    "Nightlife & Clubs": "2026-03-31.nightlife.1",
    "Theme Parks & Attractions": "2026-03-31.attractions.1",
    "Healthcare & Clinics": "2026-03-31.healthcare.1",
    "Other Lines": "2026-03-31.other.1",
  } as Record<string, string>,
} as const;

export const LEGAL_PATHS = {
  terms: "/legal/terms",
  privacy: "/legal/privacy",
  refund: "/legal/cancellation-refunds",
  guidelines: "/legal/community-guidelines",
  workerAgreement: "/legal/line-holder-agreement",
  contact: "/legal/contact-support",
} as const;

export function categoryDisclaimerCopy(category: string): string {
  if (category === "Concerts & Festivals") {
    return "Venue entry and queue-transfer outcomes depend on event policies, timing, and crowd conditions.";
  }
  if (category === "Retail Drops") {
    return "Product availability, inventory release timing, and store queue rules may change without notice.";
  }
  if (category === "Airports") {
    return "Security, airline, and airport rules can change access and queue movement at any time.";
  }
  if (category === "DMV & Government") {
    return "Office policies, appointment rules, and government process changes may affect outcomes.";
  }
  return "Service outcomes may vary based on venue rules, timing, and participant conduct.";
}
