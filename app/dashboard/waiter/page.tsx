import { WaiterPayoutSetup } from "@/app/dashboard/waiter/waiter-payout-setup";
import { JOB_STATUS_LABELS, statusBadgeClass } from "@/lib/job-status";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import Link from "next/link";
import { redirect } from "next/navigation";

const ACTIVE_WAITER_STATUSES = [
  "accepted",
  "at_airport",
  "in_line",
  "near_front",
] as const;

export default async function WaiterDashboardPage() {
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

  if (!profile) {
    redirect("/dashboard");
  }

  if (profile.role === "customer") {
    redirect("/dashboard/customer");
  }

  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, status, airport, line_type, offered_price, created_at")
    .eq("waiter_id", user.id)
    .in("status", [...ACTIVE_WAITER_STATUSES])
    .order("created_at", { ascending: false });

  const activeJobs = (jobRows ?? []) as Pick<
    Job,
    "id" | "status" | "airport" | "line_type" | "offered_price" | "created_at"
  >[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Welcome to your dashboard
      </h1>
      <p className="mt-2 text-lg text-slate-600">
        Hello — you&apos;re signed in as{" "}
        <span className="font-medium text-slate-900">{user.email}</span>.
      </p>
      <p className="mt-6 max-w-2xl leading-relaxed text-slate-600">
        As a <span className="font-medium text-slate-800">Waiter</span>, you can
        accept jobs to wait in airport lines for Customers. More tools will
        appear here as LineCrew grows.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/dashboard/waiter/browse-jobs"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Browse jobs
        </Link>
      </div>

      <WaiterPayoutSetup
        stripeAccountId={
          (profile as { stripe_account_id?: string | null } | null)
            ?.stripe_account_id ?? null
        }
      />

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-slate-900">Your active jobs</h2>
        {activeJobs.length === 0 ? (
          <p className="mt-3 text-slate-600">
            No active jobs yet. Browse open listings and accept one to get
            started.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {activeJobs.map((job) => {
              const st = job.status as JobStatus;
              return (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {job.airport} · {job.line_type}
                    </p>
                    <p className="text-sm text-slate-600">
                      ${Number(job.offered_price).toFixed(2)} ·{" "}
                      {new Date(job.created_at).toLocaleString()}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(st)}`}
                    >
                      {JOB_STATUS_LABELS[st]}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/waiter/jobs/${job.id}`}
                    className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                  >
                    Open job
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
