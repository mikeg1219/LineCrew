import type {
  JobIssue,
  JobIssueInsert,
  JobIssueReason,
  JobIssueReporterRole,
} from "@/lib/types/job-issue";
import type { SupabaseClient } from "@supabase/supabase-js";

export const JOB_ISSUE_REASONS: readonly JobIssueReason[] = [
  "line_holder_no_show",
  "wrong_location",
  "safety_concern",
  "payment_dispute",
  "other",
] as const;

export const JOB_ISSUE_REASON_LABELS: Record<JobIssueReason, string> = {
  line_holder_no_show: "Line Holder no-show",
  wrong_location: "Wrong location",
  safety_concern: "Safety concern",
  payment_dispute: "Payment dispute",
  other: "Other",
};

export function isJobIssueReason(value: string): value is JobIssueReason {
  return (JOB_ISSUE_REASONS as readonly string[]).includes(value);
}

export function isJobIssueReporterRole(
  value: string
): value is JobIssueReporterRole {
  return value === "customer" || value === "waiter";
}

/**
 * Insert a job issue as the current user (`reporter_id` must match `auth.uid()`; RLS enforces job membership).
 */
export async function insertJobIssue(
  supabase: SupabaseClient,
  input: JobIssueInsert & { reporter_id: string }
): Promise<{ data: JobIssue | null; error: string | null }> {
  const { data, error } = await supabase
    .from("job_issues")
    .insert({
      job_id: input.job_id,
      reporter_id: input.reporter_id,
      reporter_role: input.reporter_role,
      reason: input.reason,
      description: input.description.trim(),
      photo_url: input.photo_url?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as JobIssue, error: null };
}

/**
 * Issues filed by the current user (RLS: own rows only).
 */
export async function listJobIssuesForCurrentUser(
  supabase: SupabaseClient
): Promise<{ data: JobIssue[]; error: string | null }> {
  const { data, error } = await supabase
    .from("job_issues")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as JobIssue[], error: null };
}
