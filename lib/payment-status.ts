/**
 * Canonical payment lifecycle for jobs (separate from booking `status` / job workflow).
 * DB constraint: supabase/payment-phase1-migration.sql
 */
export const JOB_PAYMENT_STATUSES = [
  "none",
  "pending_checkout",
  "authorized",
  "captured",
  "failed",
  "refund_pending",
  "refunded",
  "disputed",
] as const;

export type JobPaymentStatus = (typeof JOB_PAYMENT_STATUSES)[number];

export function isPaymentCapturedForPayout(
  paymentStatus: JobPaymentStatus | string | null | undefined
): boolean {
  return paymentStatus === "captured";
}
