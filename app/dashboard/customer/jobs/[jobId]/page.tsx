import { CancelJobButton } from "@/app/dashboard/customer/jobs/cancel-job-button";
import { CompletionConfirmationPanel } from "@/app/dashboard/customer/jobs/completion-confirmation-panel";
import { OverageCustomerAlert } from "@/app/dashboard/customer/jobs/overage-customer-alert";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import { JOB_STATUS_LABELS, statusBadgeClass } from "@/lib/job-status";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import type { OverageRequest } from "@/lib/types/overage";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ jobId: string }> };

function airportLabel(code: string) {
  return US_AIRPORTS_TOP_20.find((a) => a.code === code)?.label ?? code;
}

const TERMINAL = new Set<JobStatus>([
  "completed",
  "cancelled",
  "disputed",
  "refunded",
]);

export default async function CustomerJobTrackingPage({ params }: PageProps) {
  const { jobId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "customer") {
    redirect("/dashboard/waiter");
  }

  const { data: row, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const job = row as Job;
  const status = job.status as JobStatus;

  const { data: pendingOverage } = await supabase
    .from("overage_requests")
    .select("id, amount, status, created_at")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .maybeSingle();

  const pending = pendingOverage as
    | (Pick<OverageRequest, "id" | "amount" | "status"> & {
        created_at: string;
      })
    | null;

  const hasWaiter =
    job.waiter_id != null &&
    status !== "open" &&
    status !== "cancelled";

  const showPaymentHeldBadge =
    status === "open" ||
    status === "accepted" ||
    status === "at_airport" ||
    status === "in_line" ||
    status === "near_front" ||
    status === "pending_confirmation";

  const canCancel = !TERMINAL.has(status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/dashboard/customer"
        className="text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        ← Back to dashboard
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Track your booking</h1>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ring-1 ${statusBadgeClass(status)}`}
          >
            {JOB_STATUS_LABELS[status]}
          </span>
          {showPaymentHeldBadge && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/80">
              <svg
                className="size-3.5 shrink-0 text-emerald-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              Payment held securely
            </span>
          )}
        </div>

        {status === "disputed" && (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Your dispute has been received. An admin will review within 24
            hours.
          </p>
        )}

        {status === "pending_confirmation" && job.completed_at && (
          <CompletionConfirmationPanel
            jobId={job.id}
            completedAt={job.completed_at}
          />
        )}

        {pending && (
          <div className="mt-6">
            <OverageCustomerAlert
              jobId={job.id}
              requestId={pending.id}
              amount={Number(pending.amount)}
              createdAt={pending.created_at}
            />
          </div>
        )}

        <dl className="mt-8 space-y-4 border-t border-slate-100 pt-8">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Airport
            </dt>
            <dd className="mt-1 text-slate-900">{airportLabel(job.airport)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Terminal
            </dt>
            <dd className="mt-1 text-slate-900">{job.terminal}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Line type
            </dt>
            <dd className="mt-1 text-slate-900">{job.line_type}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Description
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-900">
              {job.description || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Offered price
            </dt>
            <dd className="mt-1 text-xl font-bold text-blue-700">
              ${Number(job.offered_price).toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Est. wait
            </dt>
            <dd className="mt-1 text-slate-900">{job.estimated_wait}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Extra time rate (per 30 min)
            </dt>
            <dd className="mt-1 text-slate-900">
              ${Number(job.overage_rate ?? 10).toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Line Holder contact
            </dt>
            <dd className="mt-1 font-medium text-slate-900">
              {hasWaiter && job.waiter_email
                ? job.waiter_email
                : "We’ll show your Line Holder’s email here once someone accepts."}
            </dd>
          </div>
        </dl>

        {canCancel && <CancelJobButton jobId={job.id} />}
      </div>
    </div>
  );
}
