"use server";

import {
  generateHandoffCode,
  HANDOFF_PROXIMITY_METERS,
  HANDOFF_QR_TTL_SECONDS,
  parseLatLon,
  computeDistanceMeters,
} from "@/lib/handoff";
import {
  buildHandoffConfidenceScore,
  createSignedHandoffPayload,
  generateHandoffNonce,
  hashHandoffSecret,
  verifySignedHandoffPayload,
  verifyHandoffSecret,
} from "@/lib/handoff-security";
import { parseJobIdFromFormData } from "@/lib/server-input";
import { finalizeJobPayout } from "@/lib/stripe-release-payout";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/types/job";
import { revalidatePath } from "next/cache";

export type HandoffActionState = { error: string } | { ok: string } | null;
const AUTO_ESCALATION_CONFIDENCE_THRESHOLD = 55;

const ACTIVE_HANDOFF: JobStatus[] = [
  "near_front",
  "customer_on_the_way",
  "ready_for_handoff",
  "qr_generated",
  "qr_scanned",
  "awaiting_dual_confirmation",
  "pending_confirmation",
];

async function getJobForUser(jobId: string, role: "customer" | "waiter", userId: string) {
  const supabase = await createClient();
  const column = role === "customer" ? "customer_id" : "waiter_id";
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq(column, userId)
    .maybeSingle();
  return { supabase, job: data, error };
}

function ensureStatus(jobStatus: string, allowed: JobStatus[]) {
  return allowed.includes(jobStatus as JobStatus);
}

export async function customerOnMyWayAction(
  _prev: HandoffActionState,
  formData: FormData
): Promise<HandoffActionState> {
  const jobId = parseJobIdFromFormData(formData);
  if (!jobId) return { error: "Invalid booking." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Sign in required." };

  const { job } = await getJobForUser(jobId, "customer", user.id);
  if (!job) return { error: "Booking not found." };
  if (!ensureStatus(job.status, ["near_front", "customer_on_the_way"])) {
    return { error: "This step is not available right now." };
  }

  const { error } = await supabase
    .from("jobs")
    .update({ status: "customer_on_the_way" })
    .eq("id", jobId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  return { ok: "You're marked on the way." };
}

export async function customerArrivedAction(
  _prev: HandoffActionState,
  formData: FormData
): Promise<HandoffActionState> {
  const jobId = parseJobIdFromFormData(formData);
  if (!jobId) return { error: "Invalid booking." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Sign in required." };
  const { job } = await getJobForUser(jobId, "customer", user.id);
  if (!job) return { error: "Booking not found." };
  if (!ensureStatus(job.status, ["customer_on_the_way", "ready_for_handoff", "qr_generated"])) {
    return { error: "You can mark arrived once handoff starts." };
  }

  const updates: Record<string, unknown> = {
    customer_arrived_at: new Date().toISOString(),
  };
  if (job.status === "customer_on_the_way") updates.status = "ready_for_handoff";

  const { error } = await supabase.from("jobs").update(updates).eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  return { ok: "Arrival confirmed." };
}

export async function waiterReadyForHandoffAction(
  _prev: HandoffActionState,
  formData: FormData
): Promise<HandoffActionState> {
  const jobId = parseJobIdFromFormData(formData);
  if (!jobId) return { error: "Invalid booking." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Sign in required." };
  const { job } = await getJobForUser(jobId, "waiter", user.id);
  if (!job) return { error: "Booking not found." };
  if (!ensureStatus(job.status, ["near_front", "customer_on_the_way", "ready_for_handoff"])) {
    return { error: "This step is not available right now." };
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      status: job.customer_arrived_at ? "ready_for_handoff" : "customer_on_the_way",
      worker_ready_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  return { ok: "Ready status updated." };
}

export async function generateHandoffQrAction(
  _prev: HandoffActionState,
  formData: FormData
): Promise<HandoffActionState> {
  const jobId = parseJobIdFromFormData(formData);
  if (!jobId) return { error: "Invalid booking." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Sign in required." };
  const { job } = await getJobForUser(jobId, "waiter", user.id);
  if (!job) return { error: "Booking not found." };
  if (!ensureStatus(job.status, ["ready_for_handoff", "qr_generated"])) {
    return { error: "Wait until both parties are ready." };
  }

  const nonce = generateHandoffNonce();
  const code = generateHandoffCode();
  const expires = new Date(Date.now() + HANDOFF_QR_TTL_SECONDS * 1000).toISOString();
  const signedPayload = createSignedHandoffPayload({
    jobId,
    nonce,
    expiresAtIso: expires,
  });
  const signedHash = hashHandoffSecret(signedPayload);
  const codeHash = hashHandoffSecret(code);
  const lat = parseLatLon(formData.get("lat"));
  const lng = parseLatLon(formData.get("lng"));
  const completionLocation =
    lat != null && lng != null ? `${lat.toFixed(5)},${lng.toFixed(5)}` : job.completion_location;
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "qr_generated",
      handoff_method: "qr",
      handoff_qr_token: signedPayload,
      handoff_qr_token_hash: signedHash,
      handoff_qr_expires_at: expires,
      handoff_code: code,
      handoff_code_hash: codeHash,
      handoff_nonce: nonce,
      handoff_qr_used_at: null,
      handoff_verification_attempts: 0,
      handoff_confidence_score: null,
      completion_location: completionLocation,
    })
    .eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  return { ok: "New QR generated." };
}

export async function customerVerifyHandoffAction(
  _prev: HandoffActionState,
  formData: FormData
): Promise<HandoffActionState> {
  const jobId = parseJobIdFromFormData(formData);
  const token = String(formData.get("handoffToken") ?? "").trim();
  const code = String(formData.get("handoffCode") ?? "").trim();
  const lat = parseLatLon(formData.get("lat"));
  const lng = parseLatLon(formData.get("lng"));
  if (!jobId) return { error: "Invalid booking." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Sign in required." };
  const { job } = await getJobForUser(jobId, "customer", user.id);
  if (!job) return { error: "Booking not found." };
  if (!ensureStatus(job.status, ["qr_generated", "ready_for_handoff"])) {
    return { error: "Handoff verification is not active yet." };
  }

  const now = Date.now();
  const expiresAt = job.handoff_qr_expires_at ? new Date(job.handoff_qr_expires_at).getTime() : 0;
  const verificationAttempts = Number(job.handoff_verification_attempts ?? 0);
  if (job.handoff_qr_used_at) {
    return { error: "This QR/code is already used. Ask for a fresh handoff code." };
  }
  if (verificationAttempts >= 6) {
    return {
      error:
        "Too many failed handoff attempts. Generate a new QR/code before retrying.",
    };
  }
  let verifiedMethod: "qr" | "code" | null = null;
  if (token) {
    const parsed = verifySignedHandoffPayload(token);
    if (!parsed.ok) {
      await supabase
        .from("jobs")
        .update({ handoff_verification_attempts: verificationAttempts + 1 })
        .eq("id", jobId);
      return { error: "Invalid signed QR payload." };
    }
    if (parsed.jobId !== jobId || parsed.nonce !== job.handoff_nonce) {
      await supabase
        .from("jobs")
        .update({ handoff_verification_attempts: verificationAttempts + 1 })
        .eq("id", jobId);
      return { error: "QR payload mismatch. Ask for a new QR." };
    }
    if (!verifyHandoffSecret(token, job.handoff_qr_token_hash)) {
      await supabase
        .from("jobs")
        .update({ handoff_verification_attempts: verificationAttempts + 1 })
        .eq("id", jobId);
      return { error: "Invalid QR token." };
    }
    if (!expiresAt || now > expiresAt) {
      return { error: "QR has expired. Ask for a new code." };
    }
    verifiedMethod = "qr";
  } else if (code) {
    if (!verifyHandoffSecret(code, job.handoff_code_hash)) {
      await supabase
        .from("jobs")
        .update({ handoff_verification_attempts: verificationAttempts + 1 })
        .eq("id", jobId);
      return { error: "Invalid handoff code." };
    }
    verifiedMethod = "code";
  } else {
    return { error: "Enter QR token or 4-digit code." };
  }

  const [workerLatRaw, workerLngRaw] = String(job.completion_location ?? "")
    .split(",")
    .map((v) => Number(v.trim()));
  const workerLat = Number.isFinite(workerLatRaw) ? workerLatRaw : null;
  const workerLng = Number.isFinite(workerLngRaw) ? workerLngRaw : null;

  const locationAvailable =
    lat != null && lng != null && workerLat != null && workerLng != null;
  const distance = locationAvailable
    ? computeDistanceMeters(lat!, lng!, workerLat!, workerLng!)
    : null;
  const proximityPassed =
    locationAvailable && distance != null && distance <= HANDOFF_PROXIMITY_METERS;
  const confidenceScore = buildHandoffConfidenceScore({
    method: verifiedMethod ?? "code",
    distanceMeters: distance ?? 999,
    tokenFresh: Boolean(expiresAt && now <= expiresAt),
    hasBothReadySignals: Boolean(job.worker_ready_at && job.customer_arrived_at),
  });

  const { error } = await supabase
    .from("jobs")
    .update({
      status:
        confidenceScore <= AUTO_ESCALATION_CONFIDENCE_THRESHOLD
          ? "issue_flagged"
          : "awaiting_dual_confirmation",
      handoff_method: verifiedMethod,
      qr_scanned_at: new Date().toISOString(),
      proximity_passed: proximityPassed,
      completion_location:
        lat != null && lng != null
          ? `${lat.toFixed(5)},${lng.toFixed(5)}`
          : job.completion_location,
      handoff_qr_used_at: new Date().toISOString(),
      handoff_qr_token: null,
      handoff_qr_token_hash: null,
      handoff_code: null,
      handoff_code_hash: null,
      handoff_nonce: generateHandoffNonce(),
      handoff_confidence_score: confidenceScore,
      handoff_verification_attempts: verificationAttempts + 1,
      handoff_escalated_at:
        confidenceScore <= AUTO_ESCALATION_CONFIDENCE_THRESHOLD
          ? new Date().toISOString()
          : null,
      handoff_issue_flag:
        confidenceScore <= AUTO_ESCALATION_CONFIDENCE_THRESHOLD ? true : job.handoff_issue_flag,
      handoff_issue_reason:
        confidenceScore <= AUTO_ESCALATION_CONFIDENCE_THRESHOLD
          ? "Auto-escalated: low handoff confidence"
          : job.handoff_issue_reason,
    })
    .eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  return { ok: "Handoff verified. Finish dual confirmation." };
}

async function maybeFinalizeAfterBothConfirm(jobId: string) {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, worker_confirmed_at, customer_confirmed_at")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return;
  if (!job.worker_confirmed_at || !job.customer_confirmed_at) return;
  if (!ensureStatus(job.status, ["awaiting_dual_confirmation", "pending_confirmation"])) return;
  await finalizeJobPayout(supabase, jobId, job.status);
}

export async function confirmWorkerTransferAction(
  _prev: HandoffActionState,
  formData: FormData
): Promise<HandoffActionState> {
  const jobId = parseJobIdFromFormData(formData);
  if (!jobId) return { error: "Invalid booking." };
  const { supabase, job } = await getJobForUser(
    jobId,
    "waiter",
    (await (await createClient()).auth.getUser()).data.user?.id ?? ""
  );
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !job) return { error: "Booking not found." };
  if (!ensureStatus(job.status, ["awaiting_dual_confirmation", "pending_confirmation"])) {
    return { error: "Verification must happen first." };
  }
  const { error } = await supabase
    .from("jobs")
    .update({
      worker_confirmed_at: new Date().toISOString(),
      status: "awaiting_dual_confirmation",
    })
    .eq("id", jobId);
  if (error) return { error: error.message };
  await maybeFinalizeAfterBothConfirm(jobId);
  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  return { ok: "Worker confirmation saved." };
}

export async function confirmCustomerReceivedAction(
  _prev: HandoffActionState,
  formData: FormData
): Promise<HandoffActionState> {
  const jobId = parseJobIdFromFormData(formData);
  if (!jobId) return { error: "Invalid booking." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Sign in required." };
  const { job } = await getJobForUser(jobId, "customer", user.id);
  if (!job) return { error: "Booking not found." };
  if (!ensureStatus(job.status, ["awaiting_dual_confirmation", "pending_confirmation"])) {
    return { error: "Verify handoff first." };
  }
  const { error } = await supabase
    .from("jobs")
    .update({
      customer_confirmed_at: new Date().toISOString(),
      status: "awaiting_dual_confirmation",
    })
    .eq("id", jobId);
  if (error) return { error: error.message };
  await maybeFinalizeAfterBothConfirm(jobId);
  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  return { ok: "Customer confirmation saved." };
}

export async function reportHandoffIssueAction(
  _prev: HandoffActionState,
  formData: FormData
): Promise<HandoffActionState> {
  const jobId = parseJobIdFromFormData(formData);
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!jobId) return { error: "Invalid booking." };
  if (!reason) return { error: "Select a reason." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Sign in required." };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, customer_id, waiter_id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return { error: "Booking not found." };
  if (job.customer_id !== user.id && job.waiter_id !== user.id) {
    return { error: "Not authorized for this booking." };
  }
  if (!ensureStatus(job.status, ACTIVE_HANDOFF)) {
    return { error: "Issue reporting is only available during handoff." };
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      status: "issue_flagged",
      handoff_issue_flag: true,
      handoff_issue_reason: reason,
      handoff_notes: notes || null,
    })
    .eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  return { ok: "Issue submitted. Support review has been flagged." };
}
