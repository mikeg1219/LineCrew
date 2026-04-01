export type JobStatus =
  | "open"
  | "accepted"
  | "at_airport"
  | "in_line"
  | "near_front"
  | "customer_on_the_way"
  | "ready_for_handoff"
  | "qr_generated"
  | "qr_scanned"
  | "awaiting_dual_confirmation"
  | "pending_confirmation"
  | "completed"
  | "issue_flagged"
  | "cancelled"
  | "disputed"
  | "refunded";

export type HandoffMethod = "qr" | "code" | null;

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
  accepted_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  handoff_method?: HandoffMethod;
  handoff_qr_token?: string | null;
  handoff_qr_expires_at?: string | null;
  handoff_code?: string | null;
  worker_ready_at?: string | null;
  customer_arrived_at?: string | null;
  qr_scanned_at?: string | null;
  worker_confirmed_at?: string | null;
  customer_confirmed_at?: string | null;
  completion_location?: string | null;
  proximity_passed?: boolean | null;
  handoff_issue_flag?: boolean | null;
  handoff_issue_reason?: string | null;
  handoff_notes?: string | null;
};
