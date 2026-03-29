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
  "Other (Describe your line)",
] as const;
export type LineType = (typeof LINE_TYPES)[number];

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
export const ESTIMATED_WAIT_OPTIONS = [
  "15 min",
  "30 min",
  "45 min",
  "1 hour",
  "1.5 hours",
  "2+ hours",
] as const;
export type EstimatedWait = (typeof ESTIMATED_WAIT_OPTIONS)[number];