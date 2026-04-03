import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { CUSTOMER_DASHBOARD_STATUS_LABELS } from "@/lib/job-status";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import Link from "next/link";
import { redirect } from "next/navigation";

function customerDashboardStatusPill(st: JobStatus): string {
  const base =
    "mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold border ";
  if (st === "open") {
    return base + "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (st === "completed") {
    return base + "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (
    st === "cancelled" ||
    st === "refunded" ||
    st === "disputed" ||
    st === "issue_flagged"
  ) {
    return base + "bg-red-50 text-red-700 border-red-200";
  }
  return base + "bg-blue-50 text-blue-700 border-blue-200";
}

function customerDashboardStatusText(st: JobStatus): string {
  if (st === "open") return "Waiting for a Line Holder";
  if (st === "accepted") return "Line Holder accepted";
  if (st === "completed") return "Completed";
  if (st === "cancelled") return "Cancelled";
  return CUSTOMER_DASHBOARD_STATUS_LABELS[st];
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

  const email = user.email ?? "";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            CUSTOMER
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Book a Line Holder
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Reserve someone to hold your place in line across airports, events,
            retail drops, restaurants, and services.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as{" "}
            <span className="font-medium text-slate-700">{email}</span>
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-bold text-emerald-500">✓</span>
            Most bookings accepted in 3–10 minutes
          </p>
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-bold text-emerald-500">✓</span>
            Payment is held until your spot is secured
          </p>
        </div>

        <Link
          href="/dashboard/customer/post-job"
          className="mb-10 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
        >
          Book Now
        </Link>

        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
            HOW IT WORKS
          </p>
          <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3">
            {[
              {
                n: 1,
                title: "Book your request",
                sub: "Category, location, and timing",
              },
              {
                n: 2,
                title: "We match you with a Line Holder",
                sub: "Get notified when someone accepts",
              },
              {
                n: 3,
                title: "Arrive when it's your turn",
                sub: "Swap in at the front of the line",
              },
            ].map((step) => (
              <div key={step.n}>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {step.n}
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {step.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">{step.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Your bookings
          </h2>
          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-sm text-slate-500">
                No bookings yet. Book your first Line Holder!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {jobs.map((job) => {
                const st = job.status as JobStatus;
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-5 shadow-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {job.airport} — {job.line_type}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        Offer{" "}
                        <span className="font-semibold text-slate-900">
                          ${Number(job.offered_price).toFixed(2)}
                        </span>
                        {" · "}Requested{" "}
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                      <span className={customerDashboardStatusPill(st)}>
                        {customerDashboardStatusText(st)}
                      </span>
                    </div>
                    <Link
                      href={`/dashboard/customer/jobs/${job.id}`}
                      className="ml-4 shrink-0 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      Track booking
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
