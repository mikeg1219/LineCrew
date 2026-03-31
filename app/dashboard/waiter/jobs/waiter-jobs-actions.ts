"use server";

import { canTransitionTo } from "@/lib/job-status";
import type { JobStatus } from "@/lib/types/job";
import { syncStripeConnectFromStripeForUser } from "@/lib/stripe-account-sync";
import {
  isStripeConnectPayoutReady,
  isWaiterAcceptSetupComplete,
  type WaiterAcceptGateRow,
} from "@/lib/waiter-profile-complete";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/twilio-sms";
import { redirect } from "next/navigation";

export type JobActionState = { error: string } | null;

const ACTIVE_ACCEPT_STATUSES = [
  "accepted",
  "at_airport",
  "in_line",
  "near_front",
] as const;

async function getCustomerPhone(customerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("phone")
    .eq("id", customerId)
    .maybeSingle();
  return data?.phone ?? null;
}

async function getWaiterPhone(waiterId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("phone")
    .eq("id", waiterId)
    .maybeSingle();
  return data?.phone ?? null;
}

export async function acceptJobAction(
  _prev: JobActionState,
  formData: FormData
): Promise<JobActionState> {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) {
    return { error: "Missing booking." };
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
        "Finish setup before accepting: verify your email, complete profile and airports, finish onboarding, and connect payouts on your dashboard.",
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
    .select("id, customer_id, airport, line_type")
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

  // Notify customer via SMS
  const customerPhone = await getCustomerPhone(data.customer_id);
  await sendSms(
    customerPhone,
    `Great news! A Line Holder has accepted your booking at ${data.airport} (${data.line_type}). They are on their way. Track your job in the SaveMySpot app.`
  );

  redirect(`/dashboard/waiter/jobs/${jobId}`);
  return null;
}

const PROGRESS_STATUSES: JobStatus[] = [
  "at_airport",
  "in_line",
  "near_front",
  "pending_confirmation",
];

const STATUS_CUSTOMER_SMS: Record<string, string> = {
  at_airport: "Your Line Holder has arrived at the airport and is heading to the security line.",
  in_line: "Your Line Holder is now in the security line holding your spot.",
  near_front: "HEAD TO SECURITY NOW! Your Line Holder is near the front of the line. Don't miss your spot!",
  pending_confirmation: "Your Line Holder has completed the handoff. Please open the app and confirm to release their payment.",
};

const STATUS_WAITER_SMS: Record<string, string> = {
  pending_confirmation: "You marked the job complete. The customer has 15 minutes to confirm. If they don't respond, payment releases automatically.",
};

export async function updateWaiterJobStatusAction(
  _prev: JobActionState,
  formData: FormData
): Promise<JobActionState> {
  const jobId = String(formData.get("jobId") ?? "");
  const nextRaw = String(formData.get("nextStatus") ?? "");
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
    .select("id, status, waiter_id, customer_id, airport, line_type")
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

    // Notify customer and waiter
    const customerPhone = await getCustomerPhone(job.customer_id);
    const waiterPhone = await getWaiterPhone(user.id);
    await sendSms(customerPhone, STATUS_CUSTOMER_SMS.pending_confirmation);
    await sendSms(waiterPhone, STATUS_WAITER_SMS.pending_confirmation);

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

  // Send SMS notification to customer for status updates
  const customerSms = STATUS_CUSTOMER_SMS[nextStatus];
  if (customerSms) {
    const customerPhone = await getCustomerPhone(job.customer_id);
    await sendSms(customerPhone, customerSms);
  }

  redirect(`/dashboard/waiter/jobs/${jobId}`);
  return null;
}
