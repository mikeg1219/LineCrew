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
      return "inline-flex rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-xs font-semibold";
    case "accepted":
      return "inline-flex rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold";
    case "completed":
      return "inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-semibold";
    case "cancelled":
    case "refunded":
      return "inline-flex rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-semibold";
    default:
      return "inline-flex rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold";
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

  const firstName = profileWelcomeFirstName(
    profile,
    user.email,
    user.user_metadata as Record<string, unknown> | undefined
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          CUSTOMER
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back, {firstName}!
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage your bookings and post new line requests.
        </p>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>

        <div className="mt-6 flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-emerald-500">✓</span>
            Most bookings accepted in 3–10 minutes
          </p>
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-emerald-500">✓</span>
            Payment is held until your spot is secured
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/customer/post-job"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Book Now
          </Link>
          <Link
            href="/profile"
            className="linecrew-btn-secondary inline-flex min-h-[48px] items-center justify-center px-6 py-3 text-base"
          >
            Edit profile
          </Link>
        </div>

        <section
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          aria-labelledby="how-it-works-legacy-dash"
        >
          <h2
            id="how-it-works-legacy-dash"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            How it works
          </h2>
          <ol className="mt-6 space-y-8">
            <li className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white sm:mx-0">
                1
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">Book your request</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Category, location, and timing
                </p>
              </div>
            </li>
            <li className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white sm:mx-0">
                2
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  We match you with a Line Holder
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Get notified when someone accepts
                </p>
              </div>
            </li>
            <li className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white sm:mx-0">
                3
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  Arrive when it&apos;s your turn
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Swap in at the front of the line
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="mt-12 pb-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Your bookings</h2>
          {jobs.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-slate-600">You haven&apos;t created a booking yet.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {jobs.map((job) => {
                const st = job.status as JobStatus;
                return (
                  <li
                    key={job.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-5 shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {job.airport} · {job.line_type}
                      </p>
                      <p className="text-sm text-slate-600">
                        ${Number(job.offered_price).toFixed(2)} ·{" "}
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                      <span className={`mt-2 ${listStatusBadgeClass(st)}`}>
                        {CUSTOMER_DASHBOARD_STATUS_LABELS[st]}
                      </span>
                    </div>
                    <Link
                      href={`/dashboard/customer/jobs/${job.id}`}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
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
