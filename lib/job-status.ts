import type { JobStatus } from "@/lib/types/job";

/** Customer dashboard list — friendly wording only; underlying `status` unchanged */
export const CUSTOMER_DASHBOARD_STATUS_LABELS: Record<JobStatus, string> = {
  open: "Waiting for a Line Holder",
  accepted: "Line Holder on the way",
  at_airport: "Line Holder on the way",
  in_line: "In line now",
  near_front: "Ready for handoff",
  pending_confirmation: "Awaiting your confirmation",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Under review",
  refunded: "Refunded",
};

/** Human-readable labels for customers and Line Holders */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  open: "Open — looking for a Line Holder",
  accepted: "Line Holder accepted",
  at_airport: "Line Holder at the airport",
  in_line: "Line Holder in line",
  near_front: "Line Holder near the front",
  pending_confirmation: "Awaiting your confirmation",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed — under review",
  refunded: "Refunded",
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
    case "pending_confirmation":
      return "bg-violet-100 text-violet-900 ring-violet-200";
    case "completed":
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    case "cancelled":
    case "refunded":
      return "bg-slate-200 text-slate-800 ring-slate-300";
    case "disputed":
      return "bg-red-100 text-red-900 ring-red-200";
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
    near_front: "pending_confirmation",
    pending_confirmation: null,
    completed: null,
    cancelled: null,
    disputed: null,
    refunded: null,
  };
  return flow[current] === next;
}
