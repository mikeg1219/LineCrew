"use server";

import { parseJobIdFromFormData } from "@/lib/server-input";
import { canTransitionTo } from "@/lib/job-status";
import { notifyLineHolderAssigned } from "@/lib/emails";
import type { JobStatus } from "@/lib/types/job";
import { syncStripeConnectFromStripeForUser } from "@/lib/stripe-account-sync";
import {
  getProfilePhone,
  safeSendSms,
  smsCustomerBookingAccepted,
  smsCustomerNearFront,
  smsCustomerReadyForHandoff,
} from "@/lib/sms-job-notifications";
import {
  isStripeConnectPayoutReady,
  isWaiterAcceptSetupComplete,
  type WaiterAcceptGateRow,
} from "@/lib/waiter-profile-complete";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type JobActionState = { error: string } | null;

const ACTIVE_ACCEPT_STATUSES = [
  "accepted",
  "at_airport",
  "in_line",
  "near_front",
  "customer_on_the_way",
  "ready_for_handoff",
  "qr_generated",
  "qr_scanned",
  "awaiting_dual_confirmation",
  "pending_confirmation",
] as const;

export async function acceptJobAction(
  _prev: JobActionState,
  formData: FormData
): Promise<JobActionState> {
  const jobId = parseJobIdFromFormData(formData);
  if (!jobId) {
    return { error: "Invalid booking." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "waiter") {
    return { error: "Only Line Holders can accept bookings." };
  }

  if (!isWaiterAcceptSetupComplete(profile, user)) {
    return {
      error:
        "Finish setup before accepting: verify your email, complete profile and service areas, finish onboarding, and connect payouts on your dashboard.",
    };
  }

  const { count, error: countErr } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("waiter_id", user.id)
    .in("status", [...ACTIVE_ACCEPT_STATUSES]);

  if (countErr) {
    return { error: countErr.message };
  }
  if ((count ?? 0) >= 2) {
    return {
      error:
        "You already have 2 active jobs. Complete one before accepting more.",
    };
  }

  const acceptedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("jobs")
    .update({
      waiter_id: user.id,
      status: "accepted",
      waiter_email: user.email,
      accepted_at: acceptedAt,
    })
    .eq("id", jobId)
    .eq("status", "open")
    .is("waiter_id", null)
    .select("id, customer_id, airport, line_type, terminal, customer_email")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data?.id) {
    return {
      error:
        "This booking is no longer available — it may have been taken already.",
    };
  }

  const admin = createAdminClient();
  const customerPhone = await getProfilePhone(admin, data.customer_id);
  await safeSendSms(
    customerPhone,
    smsCustomerBookingAccepted(data.airport, data.id)
  );

  await notifyLineHolderAssigned({
    jobId: data.id,
    customerId: data.customer_id,
    airport: data.airport,
    terminal: data.terminal?.trim() || "—",
    waiterUserId: user.id,
  });

  redirect(`/dashboard/waiter/jobs/${jobId}`);
  return null;
}

const PROGRESS_STATUSES: JobStatus[] = [
  "at_airport",
  "in_line",
  "near_front",
  "customer_on_the_way",
  "ready_for_handoff",
  "qr_generated",
  "qr_scanned",
  "awaiting_dual_confirmation",
  "pending_confirmation",
];

export async function updateWaiterJobStatusAction(
  _prev: JobActionState,
  formData: FormData
): Promise<JobActionState> {
  const jobId = parseJobIdFromFormData(formData);
  const nextRaw = String(formData.get("nextStatus") ?? "").trim();
  if (!jobId || !nextRaw) {
    return { error: "Invalid request." };
  }

  const nextStatus = nextRaw as JobStatus;
  if (!PROGRESS_STATUSES.includes(nextStatus)) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: job, error: fetchErr } = await supabase
    .from("jobs")
    .select("id, status, waiter_id, customer_id, airport, line_type, terminal")
    .eq("id", jobId)
    .maybeSingle();

  if (fetchErr || !job) {
    return { error: "Booking not found." };
  }

  if (job.waiter_id !== user.id) {
    return { error: "You are not assigned to this booking." };
  }

  const current = job.status as JobStatus;
  if (!canTransitionTo(current, nextStatus)) {
    return { error: "That step is not available for the current status." };
  }

  if (nextStatus === "pending_confirmation") {
    await syncStripeConnectFromStripeForUser(supabase, user.id);
    const { data: waiterProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!isStripeConnectPayoutReady(waiterProfile as WaiterAcceptGateRow)) {
      return {
        error:
          "Finish Stripe payout setup (identity and bank) and wait until payouts are enabled — then you can mark the booking complete.",
      };
    }

    const { data: jobRow, error: jobFetchErr } = await supabase
      .from("jobs")
      .select("stripe_payment_intent_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobFetchErr || !jobRow?.stripe_payment_intent_id) {
      return { error: "This booking has no payment on file." };
    }

    const completedAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("jobs")
      .update({
        status: "pending_confirmation",
        completed_at: completedAt,
      })
      .eq("id", jobId)
      .eq("waiter_id", user.id);

    if (updateErr) {
      return { error: updateErr.message };
    }

    redirect(`/dashboard/waiter/jobs/${jobId}`);
    return null;
  }

  const { error } = await supabase
    .from("jobs")
    .update({ status: nextStatus })
    .eq("id", jobId)
    .eq("waiter_id", user.id);

  if (error) {
    return { error: error.message };
  }

  const admin = createAdminClient();
  const customerPhone = await getProfilePhone(admin, job.customer_id);
  if (nextStatus === "near_front") {
    await safeSendSms(
      customerPhone,
      smsCustomerNearFront(job.airport)
    );
  } else if (nextStatus === "ready_for_handoff") {
    const term = (job.terminal as string | null)?.trim() || "";
    await safeSendSms(
      customerPhone,
      smsCustomerReadyForHandoff(term)
    );
  }

  redirect(`/dashboard/waiter/jobs/${jobId}`);
  return null;
}
