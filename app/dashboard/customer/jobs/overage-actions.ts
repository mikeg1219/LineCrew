"use server";

import {
  parseJobIdFromFormData,
  parseRequestIdFromFormData,
} from "@/lib/server-input";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type OverageDecisionState = { error: string } | null;

export async function approveOverageAction(
  _prev: OverageDecisionState,
  formData: FormData
): Promise<OverageDecisionState> {
  return updateOverageDecision(formData, "approved");
}

export async function declineOverageAction(
  _prev: OverageDecisionState,
  formData: FormData
): Promise<OverageDecisionState> {
  return updateOverageDecision(formData, "declined");
}

async function updateOverageDecision(
  formData: FormData,
  next: "approved" | "declined"
): Promise<OverageDecisionState> {
  const requestId = parseRequestIdFromFormData(formData);
  const jobId = parseJobIdFromFormData(formData);
  if (!requestId || !jobId) {
    return { error: "Invalid request." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, customer_id")
    .eq("id", jobId)
    .maybeSingle();

  if (!job || job.customer_id !== user.id) {
    return { error: "You cannot update this request." };
  }

  const { data: updated, error } = await supabase
    .from("overage_requests")
    .update({ status: next })
    .eq("id", requestId)
    .eq("job_id", jobId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!updated) {
    return {
      error: "This request was already handled or could not be updated.",
    };
  }

  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  return null;
}
