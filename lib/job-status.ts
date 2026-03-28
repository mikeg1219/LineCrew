import type { JobStatus } from "@/lib/types/job";

/** Human-readable labels for customers and waiters */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  open: "Open — looking for a Waiter",
  accepted: "Waiter accepted",
  at_airport: "Waiter at the airport",
  in_line: "Waiter in line",
  near_front: "Waiter near the front",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Tailwind-friendly badge styles */
export function statusBadgeClass(status: JobStatus): string {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    case "accepted":
      return "bg-blue-100 text-blue-900 ring-blue-200";
    case "at_airport":
    case "in_line":
    case "near_front":
      return "bg-indigo-100 text-indigo-900 ring-indigo-200";
    case "completed":
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    case "cancelled":
      return "bg-slate-200 text-slate-800 ring-slate-300";
    default:
      return "bg-slate-100 text-slate-800 ring-slate-200";
  }
}

/** Valid next status when progressing an accepted job (linear flow). */
export function canTransitionTo(
  current: JobStatus,
  next: JobStatus
): boolean {
  const flow: Record<JobStatus, JobStatus | null> = {
    open: null,
    accepted: "at_airport",
    at_airport: "in_line",
    in_line: "near_front",
    near_front: "completed",
    completed: null,
    cancelled: null,
  };
  return flow[current] === next;
}
