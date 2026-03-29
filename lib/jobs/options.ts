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
export const ESTIMATED_WAIT_OPTIONS = [
  "15 min",
  "30 min",
  "45 min",
  "1 hour",
  "1.5 hours",
  "2+ hours",
] as const;
export type EstimatedWait = (typeof ESTIMATED_WAIT_OPTIONS)[number];