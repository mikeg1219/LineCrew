import { PROVIDER_LINE_STATUS_LABELS } from "@/lib/job-status";
import type { Job, JobStatus } from "@/lib/types/job";

export type ProviderTimelineEvent = {
  id: string;
  title: string;
  detail?: string;
  timestamp: string | null;
  tone: "default" | "muted" | "highlight";
};

export function buildProviderTimelineEvents(job: Job): ProviderTimelineEvent[] {
  const st = job.status as JobStatus;
  const out: ProviderTimelineEvent[] = [];

  out.push({
    id: "posted",
    title: "Booking posted",
    detail: "Customer submitted this request.",
    timestamp: job.created_at,
    tone: "highlight",
  });

  if (job.accepted_at) {
    out.push({
      id: "accepted",
      title: "You accepted",
      detail: "You’re assigned to this booking.",
      timestamp: job.accepted_at,
      tone: "highlight",
    });
  }

  const statusDetail: Partial<Record<JobStatus, string>> = {
    accepted: "Next: mark when you arrive.",
    at_airport: "Next: join the line when ready.",
    in_line: "Next: move up as the line progresses.",
    near_front: "Next: mark ready for handoff when the customer should swap in.",
    pending_confirmation: "Waiting for the customer to confirm completion.",
    completed: "This booking is finished.",
    cancelled: "This booking was cancelled.",
    disputed: "This booking is under review.",
    refunded: "This booking was refunded.",
  };

  if (st !== "open" && statusDetail[st]) {
    out.push({
      id: "current",
      title: `Current: ${PROVIDER_LINE_STATUS_LABELS[st]}`,
      detail: statusDetail[st],
      timestamp: null,
      tone: "muted",
    });
  }

  if (job.completed_at && (st === "pending_confirmation" || st === "completed")) {
    out.push({
      id: "lh_done",
      title: "You marked booking complete",
      detail: "Customer confirmation window started.",
      timestamp: job.completed_at,
      tone: "highlight",
    });
  }

  if (st === "cancelled" && job.cancelled_at) {
    out.push({
      id: "cancelled",
      title: "Cancelled",
      detail: job.cancellation_reason ?? undefined,
      timestamp: job.cancelled_at,
      tone: "default",
    });
  }

  return out;
}
