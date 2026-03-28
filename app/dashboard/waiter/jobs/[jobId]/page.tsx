import { RequestExtraTimeForm } from "@/app/dashboard/waiter/jobs/request-extra-time-form";
import { WaiterProgressButtons } from "@/app/dashboard/waiter/jobs/waiter-progress-buttons";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import { JOB_STATUS_LABELS } from "@/lib/job-status";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ jobId: string }> };

function airportLabel(code: string) {
  return US_AIRPORTS_TOP_20.find((a) => a.code === code)?.label ?? code;
}

export default async function WaiterJobDetailPage({ params }: PageProps) {
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

  if (profile?.role !== "waiter") {
    redirect("/dashboard/customer");
  }

  const { data: row, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const job = row as Job;

  if (job.waiter_id !== user.id) {
    redirect("/dashboard/waiter/browse-jobs");
  }

  const status = job.status as JobStatus;
  const showExtraTimeRequest =
    status === "in_line" || status === "near_front";
  const overageRate = Number(job.overage_rate ?? 10);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/dashboard/waiter"
        className="text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        ← Back to dashboard
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Your job
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {airportLabel(job.airport)}
        </h1>
        <p className="mt-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-900">
          {JOB_STATUS_LABELS[status]}
        </p>

        <dl className="mt-8 space-y-4 border-t border-slate-100 pt-8">
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
              ${overageRate.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Customer contact
            </dt>
            <dd className="mt-1 font-medium text-slate-900">
              {job.customer_email ?? "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {status === "pending_confirmation" ? (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Job marked complete</h2>
            <p className="mt-2 text-sm text-slate-600">
              Waiting for the customer to confirm. You&apos;ll be paid after they
              confirm or after 15 minutes if they don&apos;t respond.
            </p>
          </div>
        ) : (
          <WaiterProgressButtons jobId={job.id} currentStatus={status} />
        )}
      </div>

      {showExtraTimeRequest && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Extra time</h2>
          <p className="mt-1 text-sm text-slate-600">
            If the line is slower than expected, request an extra 30 minutes at
            the customer&apos;s agreed rate (${overageRate.toFixed(2)}).
          </p>
          <div className="mt-4 max-w-md">
            <RequestExtraTimeForm jobId={job.id} />
          </div>
        </div>
      )}
    </div>
  );
}
