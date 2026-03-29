"use server";

import { canTransitionTo } from "@/lib/job-status";
import type { JobStatus } from "@/lib/types/job";
import { isWaiterProfileComplete } from "@/lib/waiter-profile-complete";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type JobActionState = { error: string } | null;

const ACTIVE_ACCEPT_STATUSES = [
  "accepted",
  "at_airport",
  "in_line",
  "near_front",
] as const;

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
    .select(
      "role, first_name, avatar_url, phone, bio, serving_airports, onboarding_completed, email_verified_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "waiter") {
    return { error: "Only waiters can accept jobs." };
  }

  if (!isWaiterProfileComplete(profile)) {
    return {
      error:
        "Complete your waiter profile (photo, phone, bio, airports, onboarding, verified email) before accepting jobs. Open Profile to finish.",
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
  "pending_confirmation",
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

  if (nextStatus === "pending_confirmation") {
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
      .select("stripe_payment_intent_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobFetchErr || !jobRow?.stripe_payment_intent_id) {
      return { error: "This job has no payment on file." };
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

  redirect(`/dashboard/waiter/jobs/${jobId}`);
  return null;
}
