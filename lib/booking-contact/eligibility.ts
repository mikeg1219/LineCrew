import type { JobStatus } from "@/lib/types/job";

const NO_MASKED_CONTACT: ReadonlySet<JobStatus> = new Set([
  "open",
  "cancelled",
  "completed",
  "disputed",
  "refunded",
]);

/** Whether booking status allows booking-scoped outbound contact (SMS MVP). */
export function bookingAllowsMaskedContact(status: JobStatus): boolean {
  return !NO_MASKED_CONTACT.has(status);
}
