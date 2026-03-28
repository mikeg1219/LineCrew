"use server";

import { canTransitionTo } from "@/lib/job-status";
import type { JobStatus } from "@/lib/types/job";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type JobActionState = { error: string } | null;

export async function acceptJobAction(
  _prev: JobActionState,
  formData: FormData
): Promise<JobActionState> {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) {
    return { error: "Missing job." };
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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "waiter") {
    return { error: "Only waiters can accept jobs." };
  }

  const { data, error } = await supabase
    .from("jobs")
    .update({
      waiter_id: user.id,
      status: "accepted",
      waiter_email: user.email,
    })
    .eq("id", jobId)
    .eq("status", "open")
    .is("waiter_id", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data?.id) {
    return {
      error: "This job is no longer available — it may have been taken already.",
    };
  }

  redirect(`/dashboard/waiter/jobs/${jobId}`);
  return null;
}

const PROGRESS_STATUSES: JobStatus[] = [
  "at_airport",
  "in_line",
  "near_front",
  "completed",
];

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
    .select("id, status, waiter_id")
    .eq("id", jobId)
    .maybeSingle();

  if (fetchErr || !job) {
    return { error: "Job not found." };
  }

  if (job.waiter_id !== user.id) {
    return { error: "You are not assigned to this job." };
  }

  const current = job.status as JobStatus;
  if (!canTransitionTo(current, nextStatus)) {
    return { error: "That step is not available for the current status." };
  }

  if (nextStatus === "completed") {
    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return { error: "Payment system is not configured." };
    }

    const { data: waiterProfile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!waiterProfile?.stripe_account_id) {
      return {
        error:
          "Set up payouts on your dashboard (Stripe) before you can complete a job.",
      };
    }

    const { data: jobRow, error: jobFetchErr } = await supabase
      .from("jobs")
      .select("offered_price, payout_transfer_id, stripe_payment_intent_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobFetchErr || !jobRow) {
      return { error: "Job not found." };
    }

    if (!jobRow.stripe_payment_intent_id) {
      return { error: "This job has no payment on file." };
    }

    const offered = Number(jobRow.offered_price);
    const waiterShareCents = Math.floor(offered * 100 * 0.8);
    if (waiterShareCents < 1) {
      return { error: "Invalid payout amount." };
    }

    const transfer = await stripe.transfers.create(
      {
        amount: waiterShareCents,
        currency: "usd",
        destination: waiterProfile.stripe_account_id,
        metadata: { job_id: jobId },
        transfer_group: jobId,
      },
      { idempotencyKey: `linecrew_payout_${jobId}` }
    );

    const { error: updateErr } = await supabase
      .from("jobs")
      .update({
        status: "completed",
        payout_transfer_id: transfer.id,
      })
      .eq("id", jobId)
      .eq("waiter_id", user.id);

    if (updateErr) {
      return {
        error: `Payout was sent but the job could not be updated: ${updateErr.message}. Contact support with job id ${jobId}.`,
      };
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

  redirect(`/dashboard/waiter/jobs/${jobId}`);
  return null;
}
