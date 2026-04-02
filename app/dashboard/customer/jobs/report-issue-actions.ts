"use server";

import {
  insertJobIssue,
  isJobIssueReason,
  JOB_ISSUE_REASON_LABELS,
} from "@/lib/job-issues";
import { parseUuidParam } from "@/lib/server-input";
import { sendAdminEmail } from "@/lib/notify-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { JobIssueReason, JobIssueReporterRole } from "@/lib/types/job-issue";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export type SubmitJobIssueState =
  | { ok: true }
  | { error: string }
  | null;

const MAX_DESC = 500;
const MIN_DESC = 20;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PHOTO_BUCKET = "job-issues";
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "photo";
}

/**
 * Validates session + job membership, inserts `job_issues` via admin client,
 * sets `handoff_issue_flag`, emails admin, revalidates.
 * Optional `photoUrl` is a public URL (e.g. after upload).
 */
export async function submitJobIssue(
  jobId: string,
  reporterRole: JobIssueReporterRole,
  reason: JobIssueReason,
  description: string,
  photoUrl: string | null
): Promise<SubmitJobIssueState> {
  const trimmed = description.trim();
  if (!jobId) {
    return { error: "Missing booking." };
  }
  if (trimmed.length < MIN_DESC) {
    return {
      error: `Please add a bit more detail (at least ${MIN_DESC} characters).`,
    };
  }
  if (trimmed.length > MAX_DESC) {
    return { error: `Description must be ${MAX_DESC} characters or fewer.` };
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
    .select("id, customer_id, waiter_id")
    .eq("id", jobId)
    .maybeSingle();

  if (jobErr || !job) {
    return { error: "Booking not found." };
  }

  if (reporterRole === "customer" && job.customer_id !== user.id) {
    return { error: "You can’t report an issue for this booking." };
  }
  if (reporterRole === "waiter" && job.waiter_id !== user.id) {
    return { error: "You can’t report an issue for this booking." };
  }

  if (photoUrl) {
    try {
      const u = new URL(photoUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { error: "Photo link must use http or https." };
      }
    } catch {
      return { error: "Photo link doesn’t look valid." };
    }
  }

  const admin = createAdminClient();

  const { error: insertErr } = await insertJobIssue(admin, {
    job_id: jobId,
    reporter_id: user.id,
    reporter_role: reporterRole,
    reason,
    description: trimmed,
    photo_url: photoUrl,
  });

  if (insertErr) {
    return { error: insertErr };
  }

  const { error: flagErr } = await admin
    .from("jobs")
    .update({ handoff_issue_flag: true })
    .eq("id", jobId);

  if (flagErr) {
    console.error("[job-issue] flag job:", flagErr.message);
    return {
      error:
        "Report was saved but we couldn’t update the booking flag. Please contact support.",
    };
  }

  const reasonLabel = JOB_ISSUE_REASON_LABELS[reason];
  const emailHtml = `
    <p><strong>New job issue report</strong></p>
    <p>Job ID: <code>${escapeHtml(jobId)}</code></p>
    <p>Reporter: ${escapeHtml(reporterRole)} (${escapeHtml(user.email ?? user.id)})</p>
    <p>Reason: ${escapeHtml(reasonLabel)}</p>
    <p>Description:</p>
    <pre style="white-space:pre-wrap;font-family:sans-serif;">${escapeHtml(trimmed)}</pre>
    ${
      photoUrl
        ? `<p>Photo: <a href="${escapeHtml(photoUrl)}">${escapeHtml(photoUrl)}</a></p>`
        : ""
    }
  `;

  try {
    await sendAdminEmail(
      `[LineCrew] Issue reported — ${reasonLabel}`,
      emailHtml
    );
  } catch (e) {
    console.error("[job-issue] admin email:", e);
  }

  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/waiter");
  revalidatePath("/admin");

  return { ok: true };
}

/**
 * Form action for the report modal: parses FormData, uploads optional image to
 * storage, then calls `submitJobIssue`.
 */
export async function submitJobIssueFormAction(
  _prev: SubmitJobIssueState,
  formData: FormData
): Promise<SubmitJobIssueState> {
  const jobId = parseUuidParam(formData.get("jobId"));
  const reporterRoleRaw = String(formData.get("reporterRole") ?? "").trim();
  const reasonRaw = String(formData.get("reason") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const photoEntry = formData.get("photo");

  if (!jobId) {
    return { error: "Invalid booking." };
  }
  if (reporterRoleRaw !== "customer" && reporterRoleRaw !== "waiter") {
    return { error: "Invalid reporter role." };
  }
  const reporterRole = reporterRoleRaw as JobIssueReporterRole;

  if (!isJobIssueReason(reasonRaw)) {
    return { error: "Please select a reason." };
  }
  const reason = reasonRaw as JobIssueReason;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id, customer_id, waiter_id")
    .eq("id", jobId)
    .maybeSingle();

  if (jobErr || !job) {
    return { error: "Booking not found." };
  }

  if (reporterRole === "customer" && job.customer_id !== user.id) {
    return { error: "You can’t report an issue for this booking." };
  }
  if (reporterRole === "waiter" && job.waiter_id !== user.id) {
    return { error: "You can’t report an issue for this booking." };
  }

  const admin = createAdminClient();
  let photoUrl: string | null = null;

  if (photoEntry instanceof File && photoEntry.size > 0) {
    if (photoEntry.size > MAX_FILE_BYTES) {
      return { error: "Photo must be 5MB or smaller." };
    }
    const mime = photoEntry.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(mime)) {
      return {
        error: "Photo must be JPEG, PNG, WebP, or GIF.",
      };
    }

    const ext =
      mime === "image/jpeg"
        ? "jpg"
        : mime === "image/png"
          ? "png"
          : mime === "image/webp"
            ? "webp"
            : "gif";
    const path = `${jobId}/${user.id}-${randomUUID()}-${sanitizeFileName(photoEntry.name || `upload.${ext}`)}`;
    const buf = Buffer.from(await photoEntry.arrayBuffer());

    const { error: upErr } = await admin.storage
      .from(PHOTO_BUCKET)
      .upload(path, buf, {
        contentType: mime,
        upsert: false,
      });

    if (upErr) {
      console.error("[job-issue] storage upload:", upErr.message);
      return {
        error: "Couldn’t upload your photo. Try again or skip the photo.",
      };
    }

    const { data: pub } = admin.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    photoUrl = pub.publicUrl;
  }

  return submitJobIssue(jobId, reporterRole, reason, description, photoUrl);
}
