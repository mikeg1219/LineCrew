export const LINE_TYPES = [
  "Check-In (Ticket Counter)",
  "Bag Drop (Checked Bags)",
  "Flight Changes / Customer Service",
  "Security Line (Standard)",
  "Security Line (PreCheck / CLEAR)",
  "Gate Agent (Seat / Upgrade / Standby)",
  "Gate Agent (Delay / Cancellation Help)",
  "Rental Car Pickup",
  "Taxi / Rideshare Line",
  "Food / Coffee Line",
  "Lounge Entry Waitlist",
  "Concert Entry (GA / Doors)",
  "Concert Merch Line",
  "Festival Gate Entry",
  "Amusement Park Entry Gate",
  "Ride / Attraction Queue",
  "Retail Drop / Product Launch",
  "Sneaker Release Queue",
  "DMV Service Line",
  "Government Office Queue",
  "Restaurant Walk-In Waitlist",
  "Sporting Event Entry",
  "Conventions / Expo Badge Pickup",
  "Tourist Attraction Entry",
  "Pop-Up / Brand Activation Line",
  "Other (Describe your line)",
] as const;
export type LineType = (typeof LINE_TYPES)[number];

export const BOOKING_CATEGORIES = [
  "Airports",
  "Concerts & Festivals",
  "Amusement Parks",
  "Retail Drops / Product Launches",
  "DMV & Government Services",
  "Restaurants",
  "Sporting Events",
  "Conventions & Expos",
  "Tourist Attractions",
  "Pop-Ups / Brand Activations",
  "Other / Custom Request",
] as const;
export type BookingCategory = (typeof BOOKING_CATEGORIES)[number];

const LINE_TYPE_TO_CATEGORY = new Map<LineType, BookingCategory>();

/** Grouped display labels for the post-job line type select (values unchanged). */
export const LINE_TYPE_GROUPS: {
  heading: string;
  items: { value: LineType; label: string }[];
}[] = [
  {
    heading: "Before security",
    items: [
      { value: "Check-In (Ticket Counter)", label: "Check-In" },
      { value: "Bag Drop (Checked Bags)", label: "Bag Drop" },
      {
        value: "Flight Changes / Customer Service",
        label: "Flight Changes / Customer Service",
      },
    ],
  },
  {
    heading: "Security",
    items: [
      { value: "Security Line (Standard)", label: "Security Line (Standard)" },
      {
        value: "Security Line (PreCheck / CLEAR)",
        label: "Security Line (PreCheck / CLEAR)",
      },
    ],
  },
  {
    heading: "At the gate",
    items: [
      {
        value: "Gate Agent (Seat / Upgrade / Standby)",
        label: "Gate Help (Seat / Upgrade / Standby)",
      },
      {
        value: "Gate Agent (Delay / Cancellation Help)",
        label: "Gate Help (Delay / Cancellation)",
      },
    ],
  },
  {
    heading: "After arrival",
    items: [
      { value: "Rental Car Pickup", label: "Rental Car Pickup" },
      { value: "Taxi / Rideshare Line", label: "Taxi / Rideshare" },
      { value: "Food / Coffee Line", label: "Food / Coffee" },
      { value: "Lounge Entry Waitlist", label: "Lounge Entry" },
    ],
  },
  {
    heading: "Other",
    items: [{ value: "Other (Describe your line)", label: "Other" }],
  },
];

export const LINE_TYPE_GROUPS_BY_CATEGORY: Record<
  BookingCategory,
  { heading: string; items: { value: LineType; label: string }[] }[]
> = {
  Airports: LINE_TYPE_GROUPS,
  "Concerts & Festivals": [
    {
      heading: "Concerts & festivals",
      items: [
        { value: "Concert Entry (GA / Doors)", label: "Concert Entry (GA / Doors)" },
        { value: "Concert Merch Line", label: "Concert Merch Line" },
        { value: "Festival Gate Entry", label: "Festival Gate Entry" },
      ],
    },
  ],
  "Amusement Parks": [
    {
      heading: "Amusement parks",
      items: [
        { value: "Amusement Park Entry Gate", label: "Park Entry Gate" },
        { value: "Ride / Attraction Queue", label: "Ride / Attraction Queue" },
      ],
    },
  ],
  "Retail Drops / Product Launches": [
    {
      heading: "Retail drops",
      items: [
        { value: "Retail Drop / Product Launch", label: "Retail Drop / Product Launch" },
        { value: "Sneaker Release Queue", label: "Sneaker Release Queue" },
      ],
    },
  ],
  "DMV & Government Services": [
    {
      heading: "Government services",
      items: [
        { value: "DMV Service Line", label: "DMV Service Line" },
        { value: "Government Office Queue", label: "Government Office Queue" },
      ],
    },
  ],
  Restaurants: [
    {
      heading: "Restaurants",
      items: [
        { value: "Restaurant Walk-In Waitlist", label: "Restaurant Walk-In Waitlist" },
      ],
    },
  ],
  "Sporting Events": [
    {
      heading: "Sports",
      items: [{ value: "Sporting Event Entry", label: "Sporting Event Entry" }],
    },
  ],
  "Conventions & Expos": [
    {
      heading: "Conventions",
      items: [
        {
          value: "Conventions / Expo Badge Pickup",
          label: "Conventions / Expo Badge Pickup",
        },
      ],
    },
  ],
  "Tourist Attractions": [
    {
      heading: "Attractions",
      items: [{ value: "Tourist Attraction Entry", label: "Tourist Attraction Entry" }],
    },
  ],
  "Pop-Ups / Brand Activations": [
    {
      heading: "Pop-ups",
      items: [
        {
          value: "Pop-Up / Brand Activation Line",
          label: "Pop-Up / Brand Activation Line",
        },
      ],
    },
  ],
  "Other / Custom Request": [
    {
      heading: "Other",
      items: [{ value: "Other (Describe your line)", label: "Other" }],
    },
  ],
};

for (const [category, groups] of Object.entries(
  LINE_TYPE_GROUPS_BY_CATEGORY
) as [BookingCategory, { heading: string; items: { value: LineType }[] }[]][]) {
  for (const group of groups) {
    for (const item of group.items) {
      LINE_TYPE_TO_CATEGORY.set(item.value, category);
    }
  }
}

export function getBookingCategoryForLineType(
  lineType: string
): BookingCategory {
  const hit = LINE_TYPE_TO_CATEGORY.get(lineType as LineType);
  return hit ?? "Other / Custom Request";
}
export const ESTIMATED_WAIT_OPTIONS = [
  "15 min",
  "30 min",
  "45 min",
  "1 hour",
  "1.5 hours",
  "2+ hours",
] as const;
export type EstimatedWait = (typeof ESTIMATED_WAIT_OPTIONS)[number];