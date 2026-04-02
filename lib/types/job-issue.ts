/**
 * Matches `public.job_issues` (see `supabase/job-issues-migration.sql`).
 */

export type JobIssueReporterRole = "customer" | "waiter";

export type JobIssueReason =
  | "line_holder_no_show"
  | "wrong_location"
  | "safety_concern"
  | "payment_dispute"
  | "other";

export type JobIssueStatus =
  | "open"
  | "in_review"
  | "resolved"
  | "dismissed";

export type JobIssue = {
  id: string;
  job_id: string;
  reporter_id: string;
  reporter_role: JobIssueReporterRole;
  reason: JobIssueReason;
  description: string;
  photo_url: string | null;
  status: JobIssueStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
};

/** Fields the client may send when creating an issue (server sets reporter_id from session). */
export type JobIssueInsert = {
  job_id: string;
  reporter_role: JobIssueReporterRole;
  reason: JobIssueReason;
  description: string;
  photo_url?: string | null;
};

/** Admin resolution update (RLS: role = admin). */
export type JobIssueAdminUpdate = {
  status: JobIssueStatus;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolution_notes?: string | null;
};
