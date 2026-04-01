import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { AcceptJobForm } from "@/app/dashboard/waiter/browse-jobs/accept-job-form";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import { syncWaiterStripeIfNeeded } from "@/lib/stripe-account-sync";
import {
  isWaiterAcceptSetupComplete,
  waiterAcceptSetupShortfallMessage,
} from "@/lib/waiter-profile-complete";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types/job";
import Link from "next/link";
import { redirect } from "next/navigation";

function airportLabel(code: string) {
  return (
    US_AIRPORTS_TOP_20.find((a) => a.code === code)?.label ?? code
  );
}

export default async function BrowseJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profileRow, error: profileError } = await supabase
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

  const profile = profileRow
    ? ((await syncWaiterStripeIfNeeded(
        supabase,
        user.id,
        profileRow as Record<string, unknown>,
        { force: false }
      )) as typeof profileRow)
    : null;

  if (!profile) {
    return <DashboardFinishingSetup userEmail={user.email ?? ""} />;
  }

  if (profile.role === "customer") {
    redirect("/dashboard/customer");
  }

  const canAcceptJobs = isWaiterAcceptSetupComplete(profile, user);
  const acceptHint = waiterAcceptSetupShortfallMessage(profile, user);

  const serving =
    (profile as { serving_airports?: string[] | null }).serving_airports ??
    [];

  let list: Job[] = [];
  let error: { message: string } | null = null;

  if (serving.length > 0) {
    const res = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "open")
      .in("airport", serving)
      .order("created_at", { ascending: false });
    list = (res.data ?? []) as Job[];
    error = res.error;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <Link
          href="/dashboard/waiter"
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          Browse open bookings
        </h1>
        <p className="mt-2 text-slate-600">
          Open listings from Customers who need someone in line. Accept a booking to
          see full details and contact the Customer.
        </p>
        {!canAcceptJobs && (
          <div
            className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950"
            role="status"
          >
            <span className="font-semibold">Accepting is paused until setup is complete.</span>{" "}
            You can browse listings anytime.{" "}
            <span className="text-amber-950/90">{acceptHint}</span>{" "}
            <Link
              href="/dashboard/waiter"
              className="font-semibold text-amber-900 underline decoration-amber-700/40 underline-offset-2 hover:text-amber-950"
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </div>

      {error != null && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {"message" in error ? error.message : "Could not load bookings."}
        </p>
      )}

      {!error && serving.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-8 text-center text-amber-950">
          <p className="font-medium">Select your service areas</p>
          <p className="mt-2 text-sm text-amber-900/90">
            Go to{" "}
            <Link
              href="/dashboard/waiter/service-areas"
              className="font-semibold underline"
            >
              Edit my service areas
            </Link>{" "}
            to see open bookings.
          </p>
        </div>
      )}

      {!error && serving.length > 0 && list.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No open bookings in your service areas right now. Check back soon.
        </div>
      )}

      {!error && list.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((job) => (
            <li
              key={job.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {airportLabel(job.airport)}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {job.line_type}
              </p>
              <p className="mt-3 text-2xl font-bold text-blue-700">
                ${Number(job.offered_price).toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Est. wait:{" "}
                <span className="font-medium text-slate-800">
                  {job.estimated_wait}
                </span>
              </p>
              <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                Location {job.terminal}
                {job.description ? ` · ${job.description}` : ""}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href={`/dashboard/waiter/jobs/${job.id}`}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:flex-none sm:min-w-[10rem]"
                >
                  View booking
                </Link>
                <div className="min-w-0 flex-1 sm:max-w-xs">
                  <AcceptJobForm
                    jobId={job.id}
                    canAccept={canAcceptJobs}
                    setupHint={acceptHint}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
