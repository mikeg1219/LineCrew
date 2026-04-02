import { AIRPORT_CODES } from "@/lib/airports";
import { isValidTerminalForAirport } from "@/lib/airport-terminals";
import {
  BOOKING_CATEGORIES,
  ESTIMATED_WAIT_OPTIONS,
  LINE_TYPES,
} from "@/lib/jobs/options";
import { POLICY_VERSIONS } from "@/lib/legal";
import type { BookingDraftV1 } from "@/lib/booking-draft-cookie";

const urgencyLabels: Record<string, string> = {
  asap: "ASAP (within 15 minutes)",
  soon: "Soon (30–60 minutes)",
  schedule: "Scheduled",
};

const MAX_DESCRIPTION_DRAFT = 1800;

export type PostJobParseResult =
  | { ok: true; draft: Omit<BookingDraftV1, "v" | "createdAt"> }
  | { ok: false; error: string };

/** Parse FormData from the post-job form and validate (same rules as checkout). */
export function parseAndValidatePostJobFormData(
  formData: FormData
): PostJobParseResult {
  const airport = String(formData.get("airport") ?? "").trim();
  const terminal = String(formData.get("terminal") ?? "").trim();
  const booking_category = String(formData.get("booking_category") ?? "").trim();
  const venue_location = String(formData.get("venue_location") ?? "").trim();
  const event_queue_name = String(formData.get("event_queue_name") ?? "").trim();
  const line_type = String(formData.get("line_type") ?? "");
  const descriptionRaw = String(formData.get("description") ?? "");
  const urgency_type = String(formData.get("urgency_type") ?? "asap").trim();
  const urgency_schedule = String(formData.get("urgency_schedule") ?? "").trim();
  const airline = String(formData.get("airline") ?? "").trim();
  const flight_number = String(formData.get("flight_number") ?? "").trim();
  const exact_location = String(formData.get("exact_location") ?? "").trim();
  const payment_method_code_raw = String(
    formData.get("payment_method_code") ?? ""
  ).trim();

  if (!(urgency_type in urgencyLabels)) {
    return { ok: false, error: "Please select when you need your Line Holder." };
  }

  const lines: string[] = [];
  if (booking_category) lines.push(`Category: ${booking_category}`);
  if (event_queue_name) lines.push(`Queue/event: ${event_queue_name}`);
  if (venue_location) lines.push(`Venue/location: ${venue_location}`);
  lines.push(`When needed: ${urgencyLabels[urgency_type]}`);
  if (urgency_type === "schedule" && urgency_schedule) {
    lines.push(`Scheduled for: ${urgency_schedule}`);
  }
  if (airline) lines.push(`Airline: ${airline}`);
  if (flight_number) lines.push(`Flight: ${flight_number}`);
  if (exact_location) lines.push(`Exact location: ${exact_location}`);
  if (descriptionRaw.trim()) {
    lines.push("");
    lines.push(descriptionRaw.trim());
  }
  const description = lines.join("\n");

  const priceRaw = formData.get("offered_price");
  const overageRaw = formData.get("overage_rate");
  const overageAgreed = formData.get("overage_agreed") === "on";
  const estimated_wait = String(formData.get("estimated_wait") ?? "");
  const categoryDisclaimerVersionRaw = String(
    formData.get("category_disclaimer_version") ?? ""
  ).trim();

  if (!overageAgreed) {
    return {
      ok: false,
      error: "You must agree to the extra time rate to post a booking.",
    };
  }

  const overage_rate =
    typeof overageRaw === "string" && overageRaw.trim() !== ""
      ? parseFloat(overageRaw)
      : 10;
  if (Number.isNaN(overage_rate) || overage_rate < 5) {
    return {
      ok: false,
      error: "Extra time rate must be at least $5.00 per 30 minutes.",
    };
  }

  if (!(BOOKING_CATEGORIES as readonly string[]).includes(booking_category)) {
    return { ok: false, error: "Please choose a request category." };
  }
  const isAirportCategory = booking_category === "Airports";
  if (isAirportCategory) {
    if (!AIRPORT_CODES.has(airport)) {
      return { ok: false, error: "Please select a valid airport from the list." };
    }
    if (!terminal) {
      return { ok: false, error: "Please select a terminal." };
    }
    if (!isValidTerminalForAirport(airport, terminal)) {
      return {
        ok: false,
        error: "Please select a valid terminal for the chosen airport.",
      };
    }
  } else if (!venue_location) {
    return { ok: false, error: "Please add a venue or location for this request." };
  }
  if (!(LINE_TYPES as readonly string[]).includes(line_type)) {
    return { ok: false, error: "Please select a valid line type." };
  }
  if (!(ESTIMATED_WAIT_OPTIONS as readonly string[]).includes(estimated_wait)) {
    return { ok: false, error: "Please select a valid estimated wait time." };
  }

  const offered_price =
    typeof priceRaw === "string" ? parseFloat(priceRaw) : Number(priceRaw);
  if (Number.isNaN(offered_price) || offered_price < 10) {
    return { ok: false, error: "Offered price must be at least $10." };
  }

  let descriptionStored = description;
  if (descriptionStored.length > MAX_DESCRIPTION_DRAFT) {
    descriptionStored =
      descriptionStored.slice(0, MAX_DESCRIPTION_DRAFT - 1) + "…";
  }

  const notesTrim = descriptionRaw.trim();
  let descriptionNotesStored = notesTrim;
  if (descriptionNotesStored.length > MAX_DESCRIPTION_DRAFT) {
    descriptionNotesStored =
      descriptionNotesStored.slice(0, MAX_DESCRIPTION_DRAFT - 1) + "…";
  }

  return {
    ok: true,
    draft: {
      airport,
      terminal,
      booking_category,
      venue_location,
      event_queue_name,
      line_type,
      description_notes: descriptionNotesStored,
      description: descriptionStored,
      urgency_type,
      urgency_schedule,
      airline,
      flight_number,
      exact_location,
      payment_method_code: payment_method_code_raw || "stripe_card",
      offered_price,
      overage_rate,
      estimated_wait,
      overage_agreed: true,
      category_disclaimer_version:
        categoryDisclaimerVersionRaw ||
        (POLICY_VERSIONS.categoryDisclaimer as Record<string, string>)[
          booking_category
        ] ||
        "2026-03-31.default.1",
    },
  };
}
