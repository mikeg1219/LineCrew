import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { JOB_STATUS_LABELS, statusBadgeClass } from "@/lib/job-status";
import { profileWelcomeFirstName } from "@/lib/profile-display-name";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  const jobs = (jobRows ?? []) as Pick<Job, "id" | "status" | "airport" | "line_type" | "offered_price" | "created_at">[];

  return (
    <div className="pb-12">
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
          <Link href="/dashboard/customer/post-job" className="linecrew-btn-primary px-6 py-3 text-base">
            Book Now
          </Link>
          <Link href="/profile" className="linecrew-btn-secondary px-6 py-3 text-base">
            Edit profile
          </Link>
        </div>

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
                  <li key={job.id} className="linecrew-card flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-medium text-slate-900">{job.airport} · {job.line_type}</p>
                      <p className="text-sm text-slate-600">${Number(job.offered_price).toFixed(2)} · {new Date(job.created_at).toLocaleString()}</p>
                      <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(st)}`}>
                        {JOB_STATUS_LABELS[st]}
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
