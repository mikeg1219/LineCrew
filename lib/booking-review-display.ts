import { airportShortLabel } from "@/lib/airports";
import type { BookingDraftV1 } from "@/lib/booking-draft-cookie";

export function bookingCardTitle(draft: BookingDraftV1): string {
  const isAirport = draft.booking_category === "Airports";
  const location = isAirport
    ? airportShortLabel(draft.airport)
    : draft.venue_location.trim() || "Location";
  return `${location} — ${draft.line_type}`;
}

export function bookingLocationLine(draft: BookingDraftV1): string {
  const isAirport = draft.booking_category === "Airports";
  if (isAirport) {
    return `${airportShortLabel(draft.airport)} · Terminal ${draft.terminal}`;
  }
  return draft.venue_location.trim() || "—";
}

export function bookingTimingLine(draft: BookingDraftV1): string {
  if (draft.urgency_type === "asap") return "ASAP";
  if (draft.urgency_type === "soon") return "Soon (30–60 minutes)";
  if (draft.urgency_type === "schedule" && draft.urgency_schedule.trim()) {
    const raw = draft.urgency_schedule.trim();
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return raw;
  }
  return "Scheduled";
}

/** Human-readable estimated wait for summary line. */
export function estimatedWaitSummary(draft: BookingDraftV1): string {
  const w = draft.estimated_wait;
  if (w === "15 min") return "~15 minutes";
  if (w === "30 min") return "~30 minutes";
  if (w === "45 min") return "~45 minutes";
  if (w === "1 hour") return "~60 minutes";
  if (w === "1.5 hours") return "~90 minutes";
  if (w === "2+ hours") return "2+ hours";
  return `~${w}`;
}

export function notesPreview(draft: BookingDraftV1, max = 100): string {
  const raw = (draft.description_notes || draft.description).trim();
  if (!raw) return "";
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}…`;
}
