export type JobStatus =
  | "open"
  | "accepted"
  | "at_airport"
  | "in_line"
  | "near_front"
  | "completed"
  | "cancelled";

export type Job = {
  id: string;
  customer_id: string;
  waiter_id: string | null;
  customer_email: string | null;
  waiter_email: string | null;
  airport: string;
  terminal: string;
  line_type: string;
  description: string;
  offered_price: number;
  overage_rate: number;
  overage_agreed: boolean;
  estimated_wait: string;
  status: JobStatus;
  created_at: string;
  stripe_payment_intent_id?: string | null;
  payout_transfer_id?: string | null;
};
