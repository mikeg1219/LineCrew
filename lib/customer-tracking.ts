import type { Job, JobStatus } from "@/lib/types/job";

export function parseBookingDescription(description: string): {
  exactLocation: string | null;
  customerNotes: string | null;
} {
  if (!description?.trim()) {
    return { exactLocation: null, customerNotes: null };
  }

  const blocks = description.split(/\n\n+/);
  const head = blocks[0] ?? "";
  const customerNotes =
    blocks.length > 1 ? blocks.slice(1).join("\n\n").trim() || null : null;

  let exactLocation: string | null = null;
  for (const raw of head.split("\n")) {
    const line = raw.trim();
    const locMatch = line.match(/^Exact location:\s*(.+)$/i);
    if (locMatch) exactLocation = locMatch[1].trim();
  }

  return { exactLocation, customerNotes };
}

export const BOOKING_PROGRESS_STEPS = [
  { key: "posted", label: "Booking posted" },
  { key: "matched", label: "Line Holder matched" },
  { key: "inline", label: "In line" },
  { key: "handoff", label: "Ready for handoff" },
  { key: "done", label: "Completed" },
] as const;

export type BookingProgressState =
  | { variant: "active"; currentIndex: number }
  | { variant: "terminal"; reason: "cancelled" | "disputed" | "refunded" }
  | { variant: "completed" };

export function getBookingProgressState(status: JobStatus): BookingProgressState {
  if (status === "cancelled") return { variant: "terminal", reason: "cancelled" };
  if (status === "disputed") return { variant: "terminal", reason: "disputed" };
  if (status === "refunded") return { variant: "terminal", reason: "refunded" };
  if (status === "completed") return { variant: "completed" };

  let idx = 0;
  switch (status) {
    case "open":
      idx = 0;
      break;
    case "accepted":
    case "at_airport":
      idx = 1;
      break;
    case "in_line":
      idx = 2;
      break;
    case "near_front":
      idx = 3;
      break;
    case "pending_confirmation":
      idx = 4;
      break;
    default:
      idx = 0;
  }
  return { variant: "active", currentIndex: idx };
}

export type TimelineEvent = {
  id: string;
  title: string;
  detail?: string;
  timestamp: string | null;
  tone: "default" | "muted" | "highlight";
};

export function buildBookingTimelineEvents(job: Job): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const st = job.status as JobStatus;

  events.push({
    id: "created",
    title: "Booking created",
    detail: "Your request is live for Line Holders.",
    timestamp: job.created_at,
    tone: "highlight",
  });

  if (job.accepted_at) {
    events.push({
      id: "accepted",
      title: "Line Holder assigned",
      detail: "A Line Holder accepted your booking.",
      timestamp: job.accepted_at,
      tone: "highlight",
    });
  }

  if (
    st === "in_line" ||
    st === "near_front" ||
    st === "pending_confirmation" ||
    st === "completed"
  ) {
    events.push({
      id: "in_line",
      title: "In line now",
      detail: "Your Line Holder is holding your place.",
      timestamp: null,
      tone: "muted",
    });
  }

  if (st === "near_front" || st === "pending_confirmation" || st === "completed") {
    events.push({
      id: "near_front",
      title: "Near the front",
      detail: "Get ready to meet your Line Holder.",
      timestamp: null,
      tone: "muted",
    });
  }

  if (st === "pending_confirmation" && job.completed_at) {
    events.push({
      id: "lh_complete",
      title: "Line Holder marked complete",
      detail: "Confirm or dispute within the window shown on this page.",
      timestamp: job.completed_at,
      tone: "highlight",
    });
  }

  if (st === "completed") {
    events.push({
      id: "done",
      title: "Completed",
      detail: "Thank you for using LineCrew.",
      timestamp: job.completed_at ?? null,
      tone: "highlight",
    });
  }

  if (st === "cancelled" && job.cancelled_at) {
    events.push({
      id: "cancelled",
      title: "Booking cancelled",
      detail: job.cancellation_reason ?? undefined,
      timestamp: job.cancelled_at,
      tone: "default",
    });
  }

  if (st === "disputed") {
    events.push({
      id: "disputed",
      title: "Issue reported",
      detail: "Our team is reviewing your case.",
      timestamp: job.completed_at ?? job.cancelled_at ?? null,
      tone: "default",
    });
  }

  if (st === "refunded") {
    events.push({
      id: "refunded",
      title: "Refund processed",
      detail: "Allow a few business days for your bank to show the credit.",
      timestamp: job.cancelled_at ?? job.completed_at ?? null,
      tone: "default",
    });
  }

  return events;
}
