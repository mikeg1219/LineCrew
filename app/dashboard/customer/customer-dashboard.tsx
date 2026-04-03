import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { CUSTOMER_DASHBOARD_STATUS_LABELS } from "@/lib/job-status";
import { profileWelcomeFirstName } from "@/lib/profile-display-name";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import Link from "next/link";
import { redirect } from "next/navigation";

function listStatusBadgeClass(st: JobStatus): string {
  switch (st) {
    case "open":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "accepted":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "completed":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "cancelled":
    case "refunded":
      return "bg-red-50 text-red-700 border border-red-200";
    default:
      return "bg-blue-50 text-blue-700 border border-blue-200";
  }
}

export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <DashboardFinishingSetup
        userEmail={user.email ?? ""}
        errorMessage={`We couldn’t load your profile (${profileError.message}). Try again in a moment.`}
      />
    );
  }

  if (!profile) {
    return <DashboardFinishingSetup userEmail={user.email ?? ""} />;
  }
  if (profile.role === "waiter") redirect("/dashboard/waiter");

  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, status, airport, line_type, offered_price, created_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const jobs = (jobRows ?? []) as Pick<
    Job,
    "id" | "status" | "airport" | "line_type" | "offered_price" | "created_at"
  >[];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Customer
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Welcome back,{" "}
          {profileWelcomeFirstName(
            profile,
            user.email,
            user.user_metadata as Record<string, unknown> | undefined
          )}
          !
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Signed in as <span className="font-medium text-slate-900">{user.email}</span>
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/customer/post-job"
            className="inline-flex w-auto min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white transition hover:bg-blue-700"
          >
            Book Now
          </Link>
          <Link
            href="/profile"
            className="linecrew-btn-secondary px-6 py-3 text-base"
          >
            Edit profile
          </Link>
        </div>

        <section className="linecrew-card mt-10 p-6 sm:p-7" aria-labelledby="how-it-works-legacy-dash">
          <h2
            id="how-it-works-legacy-dash"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            How it works
          </h2>
          <ol className="mt-6 space-y-5">
            <li className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                1
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-medium text-slate-900">Book your request</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Category, location, and timing
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                2
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-medium text-slate-900">We match you with a Line Holder</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Get notified when someone accepts
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                3
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-medium text-slate-900">Arrive when it&apos;s your turn</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Swap in at the front of the line
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-bold text-slate-900">Your bookings</h2>
          {jobs.length === 0 ? (
            <div className="mt-6 linecrew-card border-dashed p-10 text-center">
              <p className="text-slate-600">You haven&apos;t created a booking yet.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {jobs.map((job) => {
                const st = job.status as JobStatus;
                return (
                  <li
                    key={job.id}
                    className="linecrew-card flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-blue-600 p-5"
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
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${listStatusBadgeClass(st)}`}
                      >
                        {CUSTOMER_DASHBOARD_STATUS_LABELS[st]}
                      </span>
                    </div>
                    <Link
                      href={`/dashboard/customer/jobs/${job.id}`}
                      className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
                    >
                      Track booking
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
