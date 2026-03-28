export const LINE_TYPES = [
  "Security",
  "Check-In",
  "Bag Drop",
  "Customs",
  "TSA PreCheck",
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
