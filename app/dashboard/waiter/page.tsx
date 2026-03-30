import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { LineHolderSetupChecklist } from "@/app/dashboard/waiter/line-holder-setup-checklist";
import { WaiterPayoutSetup } from "@/app/dashboard/waiter/waiter-payout-setup";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { JOB_STATUS_LABELS, statusBadgeClass } from "@/lib/job-status";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import {
  isWaiterAcceptSetupComplete,
  waiterAcceptSetupShortfallMessage,
  waiterProfileBasicsAndOnboardingComplete,
} from "@/lib/waiter-profile-complete";
import Link from "next/link";
import { redirect } from "next/navigation";

const ACTIVE_WAITER_STATUSES = [
  "accepted",
  "at_airport",
  "in_line",
  "near_front",
  "pending_confirmation",
] as const;

const COUNT_ACTIVE_STATUSES = [
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "role, stripe_account_id, serving_airports, email_verified_at, full_name, display_name, avatar_url, phone, bio, onboarding_completed"
    )
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

  if (profile.role === "customer") {
    redirect("/dashboard/customer");
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

  const activeJobs = (jobRows ?? []) as Pick<
    Job,
    "id" | "status" | "airport" | "line_type" | "offered_price" | "created_at"
  >[];

  const servingCount =
    (profile as { serving_airports?: string[] | null })?.serving_airports
      ?.length ?? 0;

  const hasPayouts = Boolean(profile?.stripe_account_id);
  const hasAirports = servingCount > 0;
  const emailVerified = isEmailVerifiedForApp(
    profile as { email_verified_at: string | null } | null,
    user
  );
  const profileBasicsComplete = profile
    ? waiterProfileBasicsAndOnboardingComplete(profile)
    : false;

  const acceptSetupReady =
    profile && user
      ? isWaiterAcceptSetupComplete(profile, user)
      : false;
  const acceptSetupSummary = waiterAcceptSetupShortfallMessage(profile, user);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-5 sm:pb-16 sm:pt-8">
      <header className="border-b border-slate-200/80 pb-6 sm:pb-7">
        <h1 className="text-balance text-[1.65rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl sm:leading-[1.15]">
          Start earning as a Line Holder
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600 sm:mt-4 sm:text-lg sm:leading-relaxed">
          Browse available bookings, manage your setup, and get paid after
          completed handoffs.
        </p>
        <p className="mt-4 text-xs text-slate-500 sm:mt-5 sm:text-sm">
          Signed in as{" "}
          <span className="font-medium text-slate-600">{user.email}</span>
        </p>
      </header>

      {!acceptSetupReady && (
        <div
          className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/95 px-4 py-4 shadow-sm sm:px-5 sm:py-5"
          role="status"
        >
          <p className="text-sm font-semibold text-slate-900">
            Earning flow: setup incomplete
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            You can browse available bookings anytime. To{" "}
            <span className="font-medium text-slate-800">accept</span> a booking,
            finish: email verification, profile, airports, onboarding, and payout
            connection.{" "}
            <span className="text-slate-700">{acceptSetupSummary}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/dashboard/waiter/browse-jobs"
              className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Browse bookings
            </Link>
            <Link
              href="/dashboard/profile"
              className="inline-flex min-h-[44px] items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-100/80"
            >
              Profile
            </Link>
          </div>
        </div>
      )}

      {user.email && (
        <LineHolderSetupChecklist
          userEmail={user.email}
          emailVerified={emailVerified}
          profileBasicsComplete={profileBasicsComplete}
          hasAirports={hasAirports}
          hasPayouts={hasPayouts}
        />
      )}

      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.03] sm:mt-7 sm:p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Primary action
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
          <Link
            href="/dashboard/waiter/browse-jobs"
            className="inline-flex min-h-[52px] w-full flex-1 items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-600/15 transition hover:bg-blue-700 active:bg-blue-800 sm:min-h-[48px] sm:max-w-xs sm:flex-none"
          >
            Browse available bookings
          </Link>
          <Link
            href="/dashboard/waiter/airports"
            className="inline-flex min-h-[52px] w-full flex-1 items-center justify-center rounded-xl border border-slate-200/90 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 sm:min-h-[48px] sm:w-auto sm:flex-none"
          >
            Edit my airports
          </Link>
        </div>
      </div>

      <WaiterPayoutSetup
        stripeAccountId={profile?.stripe_account_id ?? null}
      />

      <div className="mt-7 rounded-2xl border border-slate-200/80 bg-white px-4 py-5 shadow-sm sm:mt-8 sm:px-6 sm:py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
          Capacity
        </p>
        <p className="mt-2 text-sm font-medium text-slate-800">
          Active bookings in progress
        </p>
        <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-[2rem]">
          {activeJobCount ?? 0}
          <span className="text-xl font-normal text-slate-400 sm:text-2xl">
            {" "}
            / 2
          </span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Up to two bookings in progress at once. Finish or hand off before
          accepting another when you&apos;re at capacity.
        </p>
      </div>

      <section className="mt-10 sm:mt-12">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              Your active bookings
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Bookings you&apos;ve accepted show here until they&apos;re done.
            </p>
          </div>
        </div>
        {activeJobs.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/50 px-5 py-10 text-center sm:px-8 sm:py-12">
            <p className="text-base font-semibold text-slate-900 sm:text-lg">
              No active bookings yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-[15px]">
              Browse available bookings to accept your first opportunity.
              In-progress bookings will appear here with status and next steps.
            </p>
            <Link
              href="/dashboard/waiter/browse-jobs"
              className="mt-6 inline-flex min-h-[52px] w-full max-w-sm items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-600/15 transition hover:bg-blue-700 active:bg-blue-800 sm:mx-auto sm:min-h-[48px] sm:w-auto"
            >
              Browse available bookings
            </Link>
          </div>
        ) : (
          <ul className="mt-5 space-y-3 sm:space-y-3.5">
            {activeJobs.map((job) => {
              const st = job.status as JobStatus;
              return (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {job.airport} · {job.line_type}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      ${Number(job.offered_price).toFixed(2)} ·{" "}
                      {new Date(job.created_at).toLocaleString()}
                    </p>
                    <span
                      className={`mt-2.5 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(st)}`}
                    >
                      {JOB_STATUS_LABELS[st]}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/waiter/jobs/${job.id}`}
                    className="inline-flex min-h-[44px] min-w-[9rem] shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 active:bg-blue-200/80"
                  >
                    Open booking
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
