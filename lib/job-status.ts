import type { JobStatus } from "@/lib/types/job";

/** Customer booking tracking page — badge copy only; underlying `status` unchanged */
export const CUSTOMER_TRACKING_PAGE_LABELS: Record<JobStatus, string> = {
  open: "Waiting for a Line Holder",
  accepted: "Line Holder on the way",
  at_airport: "Line Holder on the way",
  in_line: "In line now",
  near_front: "Near the front",
  customer_on_the_way: "You're on the way",
  ready_for_handoff: "Ready for handoff",
  qr_generated: "Handoff QR ready",
  qr_scanned: "QR scanned",
  awaiting_dual_confirmation: "Awaiting dual confirmation",
  pending_confirmation: "Ready for handoff",
  completed: "Completed",
  issue_flagged: "Issue reported",
  cancelled: "Cancelled",
  disputed: "Issue reported",
  refunded: "Refunded",
};

/** Customer dashboard list — friendly wording only; underlying `status` unchanged */
export const CUSTOMER_DASHBOARD_STATUS_LABELS: Record<JobStatus, string> = {
  open: "Waiting for a Line Holder",
  accepted: "Line Holder on the way",
  at_airport: "Line Holder on the way",
  in_line: "In line now",
  near_front: "Ready for handoff",
  customer_on_the_way: "Customer on the way",
  ready_for_handoff: "Ready for handoff",
  qr_generated: "Handoff QR live",
  qr_scanned: "Awaiting confirmations",
  awaiting_dual_confirmation: "Awaiting confirmations",
  pending_confirmation: "Awaiting your confirmation",
  completed: "Completed",
  issue_flagged: "Issue reported",
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
  customer_on_the_way: "Customer on the way",
  ready_for_handoff: "Ready for handoff",
  qr_generated: "QR generated",
  qr_scanned: "QR scanned",
  awaiting_dual_confirmation: "Awaiting confirmations",
  pending_confirmation: "Awaiting your confirmation",
  completed: "Completed",
  issue_flagged: "Issue reported",
  cancelled: "Cancelled",
  disputed: "Disputed — under review",
  refunded: "Refunded",
};

/** Provider booking detail — current status badge (underlying `status` unchanged) */
export const PROVIDER_LINE_STATUS_LABELS: Record<JobStatus, string> = {
  open: "Waiting for Line Holder",
  accepted: "Accepted",
  at_airport: "Arrived at location",
  in_line: "In line now",
  near_front: "Near the front",
  customer_on_the_way: "Customer on the way",
  ready_for_handoff: "Ready for handoff",
  qr_generated: "QR shown",
  qr_scanned: "QR verified",
  awaiting_dual_confirmation: "Awaiting confirmations",
  pending_confirmation: "Ready for handoff",
  completed: "Completed",
  issue_flagged: "Issue reported",
  cancelled: "Cancelled",
  disputed: "Issue reported",
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
    case "awaiting_dual_confirmation":
      return "bg-violet-100 text-violet-900 ring-violet-200";
    case "ready_for_handoff":
    case "qr_generated":
    case "qr_scanned":
    case "customer_on_the_way":
      return "bg-cyan-100 text-cyan-900 ring-cyan-200";
    case "completed":
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    case "cancelled":
    case "refunded":
      return "bg-slate-200 text-slate-800 ring-slate-300";
    case "disputed":
    case "issue_flagged":
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
    near_front: "customer_on_the_way",
    customer_on_the_way: "ready_for_handoff",
    ready_for_handoff: "qr_generated",
    qr_generated: "qr_scanned",
    qr_scanned: "awaiting_dual_confirmation",
    awaiting_dual_confirmation: null,
    pending_confirmation: null,
    completed: null,
    issue_flagged: null,
    cancelled: null,
    disputed: null,
    refunded: null,
  };
  return flow[current] === next;
}
