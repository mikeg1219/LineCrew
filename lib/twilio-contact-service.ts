/**
 * Server-only booking-scoped contact delivery.
 * Recipient phone numbers are loaded and used only here — never returned to clients.
 *
 * MVP: one-way SMS from TWILIO_PHONE_NUMBER via REST. Full masked bidirectional
 * relay (proxy numbers, reply routing) is not implemented.
 */

import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/types/job";
import { sendSms } from "@/lib/twilio-sms";
import { buildBookingContactSmsBody } from "@/lib/twilio/booking-contact-sms";
import { bookingAllowsMaskedContact } from "@/lib/booking-contact/eligibility";
import type { BookingContactDirection } from "@/lib/booking-contact/types";

const NOTE_MAX = 200;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 12;

export type BookingContactDeliveryResult =
  | { ok: true; mode: "sent" | "logged_unconfigured" }
  | { ok: false; error: string };

export function isTwilioEnvConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_PHONE_NUMBER?.trim()
  );
}

function jobShortRef(jobId: string): string {
  return jobId.replace(/-/g, "").slice(0, 8);
}

function sanitizeNote(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
}

/**
 * Resolves booking participants (no phone fields). Server-only.
 */
export async function getBookingContactScope(jobId: string): Promise<
  | {
      ok: true;
      jobId: string;
      customerId: string;
      waiterId: string | null;
      status: JobStatus;
    }
  | { ok: false; error: string }
> {
  if (!jobId) {
    return { ok: false, error: "Missing booking." };
  }

  const supabase = await createClient();
  const { data: jobRow, error: jobErr } = await supabase
    .from("jobs")
    .select("id, customer_id, waiter_id, status")
    .eq("id", jobId)
    .maybeSingle();

  if (jobErr || !jobRow) {
    return { ok: false, error: "Booking not found." };
  }

  return {
    ok: true,
    jobId: jobRow.id as string,
    customerId: jobRow.customer_id as string,
    waiterId: jobRow.waiter_id as string | null,
    status: jobRow.status as JobStatus,
  };
}

/**
 * Customer → Line Holder or Line Holder → customer: one-way SMS from LineCrew’s number.
 * Never exposes phone numbers in the return value.
 */
export async function executeBookingScopedContactOutbound(params: {
  jobId: string;
  direction: BookingContactDirection;
  senderUserId: string;
  note: string;
}): Promise<BookingContactDeliveryResult> {
  const { jobId, direction, senderUserId } = params;
  const optionalNote = sanitizeNote(params.note);

  const scope = await getBookingContactScope(jobId);
  if (!scope.ok) {
    return { ok: false, error: scope.error };
  }

  const { customerId, waiterId, status } = scope;

  if (!bookingAllowsMaskedContact(status)) {
    return {
      ok: false,
      error: "Contact isn’t available for this booking status.",
    };
  }

  let recipientUserId: string;
  let recipientRole: "customer" | "waiter";

  if (direction === "customer_to_waiter") {
    if (customerId !== senderUserId) {
      return { ok: false, error: "Not allowed." };
    }
    if (!waiterId) {
      return { ok: false, error: "No Line Holder assigned yet." };
    }
    recipientUserId = waiterId;
    recipientRole = "waiter";
  } else {
    if (waiterId !== senderUserId) {
      return { ok: false, error: "Not allowed." };
    }
    recipientUserId = customerId;
    recipientRole = "customer";
  }

  const supabase = await createClient();

  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count: recentCount, error: rateErr } = await supabase
    .from("booking_contact_outbound")
    .select("*", { count: "exact", head: true })
    .eq("initiated_by", senderUserId)
    .gte("created_at", since);

  if (rateErr) {
    console.warn("[twilio-contact-service] rate check failed:", rateErr.message);
  } else if ((recentCount ?? 0) >= RATE_MAX) {
    return {
      ok: false,
      error: "Too many messages in the last hour. Try again later.",
    };
  }

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("first_name, display_name, full_name")
    .eq("id", senderUserId)
    .maybeSingle();

  const senderLabel =
    senderProfile?.first_name?.trim() ||
    senderProfile?.display_name?.trim() ||
    senderProfile?.full_name?.trim() ||
    "Someone";

  const senderRoleLabel =
    direction === "customer_to_waiter" ? "Traveler" : "Line Holder";

  const { data: recipientProfile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", recipientUserId)
    .maybeSingle();

  const recipientE164 = recipientProfile?.phone?.trim() ?? null;
  if (!recipientE164) {
    return {
      ok: false,
      error:
        "The recipient has no phone on file. They can add it in Profile settings.",
    };
  }

  const body = buildBookingContactSmsBody({
    jobShortRef: jobShortRef(jobId),
    senderLabel,
    senderRoleLabel,
    optionalNote,
  });

  const excerpt =
    optionalNote ||
    `${senderRoleLabel} ping — booking ${jobShortRef(jobId)}`;

  const sms = await sendSms(recipientE164, body);

  let deliveryStatus: "sent" | "skipped" | "failed";
  let twilioSid: string | null = null;

  if (sms.ok) {
    deliveryStatus = "sent";
    twilioSid = sms.sid ?? null;
  } else if ("skipped" in sms && sms.skipped) {
    deliveryStatus = "skipped";
  } else {
    deliveryStatus = "failed";
  }

  const { error: insErr } = await supabase.from("booking_contact_outbound").insert({
    job_id: jobId,
    initiated_by: senderUserId,
    recipient_role: recipientRole,
    body_excerpt: excerpt.slice(0, 500),
    twilio_message_sid: twilioSid,
    delivery_status:
      deliveryStatus === "sent"
        ? "sent"
        : deliveryStatus === "skipped"
          ? "skipped"
          : "failed",
  });

  if (insErr) {
    console.error("[twilio-contact-service] audit log insert failed:", insErr);
  }

  if (sms.ok) {
    return { ok: true, mode: "sent" };
  }
  if ("skipped" in sms && sms.skipped) {
    return { ok: true, mode: "logged_unconfigured" };
  }
  return { ok: false, error: "SMS could not be sent. Try again later." };
}
