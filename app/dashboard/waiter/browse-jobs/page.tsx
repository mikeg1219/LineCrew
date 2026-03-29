import { AcceptJobForm } from "@/app/dashboard/waiter/browse-jobs/accept-job-form";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import { isWaiterProfileComplete } from "@/lib/waiter-profile-complete";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, serving_airports, first_name, avatar_url, phone, bio, onboarding_completed, email_verified_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/dashboard");
  }

  if (profile.role === "customer") {
    redirect("/dashboard/customer");
  }

  const canAcceptJobs = isWaiterProfileComplete(profile);

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
      </div>

      {error != null && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {"message" in error ? error.message : "Could not load bookings."}
        </p>
      )}

      {!error && serving.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-8 text-center text-amber-950">
          <p className="font-medium">Select which airports you serve</p>
          <p className="mt-2 text-sm text-amber-900/90">
            Go to{" "}
            <Link
              href="/dashboard/waiter/airports"
              className="font-semibold underline"
            >
              Edit my airports
            </Link>{" "}
            to see open bookings.
          </p>
        </div>
      )}

      {!error && serving.length > 0 && list.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No open bookings at your airports right now. Check back soon.
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
                Terminal {job.terminal}
                {job.description ? ` · ${job.description}` : ""}
              </p>
              <AcceptJobForm jobId={job.id} canAccept={canAcceptJobs} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
