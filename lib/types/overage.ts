export type OverageRequestStatus = "pending" | "approved" | "declined";

export type OverageRequest = {
  id: string;
  job_id: string;
  waiter_id: string;
  amount: number;
  status: OverageRequestStatus;
  created_at: string;
};
