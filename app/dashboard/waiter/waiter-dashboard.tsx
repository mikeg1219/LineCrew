import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { WaiterPayoutSetup } from "@/app/dashboard/waiter/waiter-payout-setup";
import { JOB_STATUS_LABELS, statusBadgeClass } from "@/lib/job-status";
import {
  profileResolvedLabel,
  profileWelcomeFirstName,
} from "@/lib/profile-display-name";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";

const ACTIVE_WAITER_STATUSES = ["accepted", "at_airport", "in_line", "near_front", "pending_confirmation"] as const;
const COUNT_ACTIVE_STATUSES = ["accepted", "at_airport", "in_line", "near_front"] as const;

export default async function WaiterDashboardPage() {
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
  if (profile.role === "customer") redirect("/dashboard/customer");

  let avatarUrl = null;
  if (profile.avatar_url) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
    avatarUrl = data.publicUrl;
  }

  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, status, airport, line_type, offered_price, created_at")
    .eq("waiter_id", user.id)
    .in("status", [...ACTIVE_WAITER_STATUSES])
    .order("created_at", { ascending: false });

  const { count: activeJobCount } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("waiter_id", user.id)
    .in("status", [...COUNT_ACTIVE_STATUSES]);

  const activeJobs = (jobRows ?? []) as Pick<Job, "id" | "status" | "airport" | "line_type" | "offered_price" | "created_at">[];
  const servingAirports = profile.serving_airports ?? null;
  const servingCount = Array.isArray(servingAirports) ? servingAirports.length : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", paddingTop: "60px", paddingBottom: "80px" }}>
      <NavBar
        role="waiter"
        avatarUrl={avatarUrl}
        fullName={profileResolvedLabel(
          profile,
          user.email,
          user.user_metadata as Record<string, unknown> | undefined
        )}
      />

      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Welcome back,{" "}
          {profileWelcomeFirstName(
            profile,
            user.email,
            user.user_metadata as Record<string, unknown> | undefined
          )}
          !
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Signed in as <span className="font-medium text-slate-900">{user.email}</span>
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard/waiter/browse-jobs" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700">
            Browse bookings
          </Link>
          <Link href="/dashboard/waiter/airports" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
            Edit my airports
          </Link>
          <Link href="/dashboard/profile" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
            Edit profile
          </Link>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Active bookings (max 2): <span className="font-semibold text-slate-900">{activeJobCount ?? 0} / 2</span>
          {servingCount === 0 && <span className="ml-2 text-amber-800">— select airports to see open bookings.</span>}
        </p>

        <WaiterPayoutSetup stripeAccountId={profile?.stripe_account_id ?? null} />

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-900">Your active bookings</h2>
          {activeJobs.length === 0 ? (
            <p className="mt-3 text-slate-600">No active bookings yet. Browse open listings to get started.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activeJobs.map((job) => {
                const st = job.status as JobStatus;
                return (
                  <li key={job.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div>
                      <p className="font-medium text-slate-900">{job.airport} · {job.line_type}</p>
                      <p className="text-sm text-slate-600">${Number(job.offered_price).toFixed(2)} · {new Date(job.created_at).toLocaleString()}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(st)}`}>
                        {JOB_STATUS_LABELS[st]}
                      </span>
                    </div>
                    <Link href={`/dashboard/waiter/jobs/${job.id}`} className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">
                      Open booking
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
