"use server";

import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/types/job";
import { revalidatePath } from "next/cache";

export type RequestOverageState =
  | { error: string }
  | { success: true }
  | null;

const LINE_OR_LATER: JobStatus[] = ["in_line", "near_front"];

export async function requestOverageAction(
  _prev: RequestOverageState,
  formData: FormData
): Promise<RequestOverageState> {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) {
    return { error: "Missing job." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id, waiter_id, status, overage_rate")
    .eq("id", jobId)
    .maybeSingle();

  if (jobErr || !job) {
    return { error: "Job not found." };
  }

  if (job.waiter_id !== user.id) {
    return { error: "You are not assigned to this job." };
  }

  const st = job.status as JobStatus;
  if (!LINE_OR_LATER.includes(st)) {
    return {
      error: "Extra time can only be requested after you are in line.",
    };
  }

  const rate = Number(job.overage_rate ?? 10);
  if (Number.isNaN(rate) || rate < 5) {
    return { error: "This job does not have a valid extra time rate." };
  }

  const { count, error: countErr } = await supabase
    .from("overage_requests")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("status", "pending");

  if (countErr) {
    return { error: countErr.message };
  }
  if ((count ?? 0) > 0) {
    return {
      error: "There is already a pending extra time request for this job.",
    };
  }

  const { error: insErr } = await supabase.from("overage_requests").insert({
    job_id: jobId,
    waiter_id: user.id,
    amount: rate,
    status: "pending",
  });

  if (insErr) {
    return { error: insErr.message };
  }

  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  return { success: true };
}
