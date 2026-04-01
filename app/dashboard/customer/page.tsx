import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import {
  CUSTOMER_DASHBOARD_STATUS_LABELS,
  statusBadgeClass,
} from "@/lib/job-status";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

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

  if (profile.role === "waiter") {
    redirect("/dashboard/waiter");
  }

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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-5 sm:py-10 md:py-12">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Book a Line Holder
        </h1>
        <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
          Reserve someone to hold your place in line across airports, events,
          retail drops, restaurants, and services.
        </p>
        <p className="text-sm leading-snug text-slate-500">
          Signed in as{" "}
          <span className="font-medium text-slate-700">{user.email}</span>
        </p>
      </header>

      <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
        <div className="w-full rounded-[14px] border border-[#D7E3F1] bg-white px-4 py-3 text-center text-sm font-medium leading-snug text-[#1E4FAF] shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:w-auto sm:max-w-md sm:text-left">
          Most bookings are accepted in 3–10 minutes
        </div>
        <p className="text-center text-sm leading-relaxed text-slate-600 sm:text-left">
          Payment is held until your spot is secured
        </p>
      </div>

      <div className="mt-8 sm:mt-9">
        <Link
          href="/dashboard/customer/post-job"
          className="inline-flex w-full min-h-[48px] items-center justify-center rounded-[14px] bg-[#1E4FAF] px-6 py-3 text-base font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:bg-[#173f8c] sm:w-auto sm:min-h-0"
        >
          Book Now
        </Link>
      </div>

      <section
        className="mt-10 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:mt-12 sm:p-7"
        aria-labelledby="how-it-works-customer"
      >
        <h2
          id="how-it-works-customer"
          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          How it works
        </h2>
        <ol className="mt-5 grid list-none grid-cols-1 gap-5 sm:mt-6 sm:grid-cols-3 sm:gap-6">
          <li className="flex gap-3 rounded-xl sm:flex-col sm:items-center sm:text-center">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
              1
            </span>
            <div className="min-w-0">
              <p className="font-medium leading-snug text-slate-900">
                Book your request
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Category, location, and timing
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-xl sm:flex-col sm:items-center sm:text-center">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
              2
            </span>
            <div className="min-w-0">
              <p className="font-medium leading-snug text-slate-900">
                We match you with a Line Holder
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Get notified when someone accepts
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-xl sm:flex-col sm:items-center sm:text-center">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
              3
            </span>
            <div className="min-w-0">
              <p className="font-medium leading-snug text-slate-900">
                Arrive when it&apos;s your turn
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Swap in at the front of the line
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="mt-12 border-t border-slate-200 pt-10 sm:mt-14 sm:pt-12">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
          Your bookings
        </h2>
        {jobs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 px-5 py-12 text-center sm:mt-8 sm:px-8 sm:py-14">
            <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
              No active bookings yet
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
              Book your first request and skip your next long line.
            </p>
            <Link
              href="/dashboard/customer/post-job"
              className="mt-8 inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:mt-8 sm:w-auto sm:py-3"
            >
              Book Now
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-4 sm:mt-8">
            {jobs.map((job) => {
              const st = job.status as JobStatus;
              const requestedAt = new Date(job.created_at);
              return (
                <li
                  key={job.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:flex-row sm:items-stretch sm:justify-between sm:gap-6 sm:p-6"
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <p className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                      {job.airport} — {job.line_type}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                      <span>
                        <span className="text-slate-500">Offer</span>{" "}
                        <span className="font-semibold text-slate-800">
                          ${Number(job.offered_price).toFixed(2)}
                        </span>
                      </span>
                      <span>
                        <span className="text-slate-500">Requested</span>{" "}
                        <time dateTime={job.created_at}>
                          {requestedAt.toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>
                      </span>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(st)}`}
                    >
                      {CUSTOMER_DASHBOARD_STATUS_LABELS[st]}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/customer/jobs/${job.id}`}
                    className="inline-flex w-full shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-center text-sm font-semibold text-blue-800 transition hover:bg-blue-100 sm:w-auto sm:min-w-[7.5rem] sm:self-center"
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
  );
}
