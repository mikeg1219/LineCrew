import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { ProfileRequiredForBookingsGate } from "@/components/profile-required-for-bookings-gate";
import { LineHolderSetupChecklist } from "@/app/dashboard/waiter/line-holder-setup-checklist";
import { WaiterDashboardWelcomeBanner } from "@/components/waiter-dashboard-welcome-banner";
import { WaiterOnboardingProgress } from "@/components/waiter-onboarding-progress";
import { WaiterPayoutSetup } from "@/app/dashboard/waiter/waiter-payout-setup";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { isProfileCompleteForBookings } from "@/lib/profile-booking-gate";
import { JOB_STATUS_LABELS, statusBadgeClass } from "@/lib/job-status";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import { syncWaiterStripeIfNeeded } from "@/lib/stripe-account-sync";
import { WaiterStripeSyncErrorBanner } from "@/app/dashboard/waiter/stripe-sync-error-banner";
import {
  isStripePayoutBypassEnabled,
  isStripeConnectPayoutReady,
  isWaiterAcceptSetupComplete,
  parseManualPayoutPreference,
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

export default async function WaiterDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp =
    (await (searchParams ?? Promise.resolve({}))) as Record<
      string,
      string | string[] | undefined
    >;
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

  if (!profileRow) {
    return <DashboardFinishingSetup userEmail={user.email ?? ""} />;
  }

  if (profileRow.role === "customer") {
    redirect("/dashboard/customer");
  }

  const connectRaw = sp.connect;
  const connect = Array.isArray(connectRaw) ? connectRaw[0] : connectRaw;
  const welcomeRaw = sp.welcome;
  const showWelcome =
    (Array.isArray(welcomeRaw) ? welcomeRaw[0] : welcomeRaw) === "1";
  const forceStripeSync =
    connect === "return" || connect === "refresh";
  const { profile: syncedProfile, stripeSyncError } =
    await syncWaiterStripeIfNeeded(
      supabase,
      user.id,
      profileRow as Record<string, unknown>,
      { force: forceStripeSync }
    );
  const profile = syncedProfile as typeof profileRow;

  if (!isProfileCompleteForBookings(profile)) {
    return (
      <ProfileRequiredForBookingsGate
        role="waiter"
        userEmail={user.email ?? ""}
      />
    );
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

  const hasPayouts = isStripeConnectPayoutReady(profile);
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
  const payoutBypass = isStripePayoutBypassEnabled();
  const manualPayout = parseManualPayoutPreference(
    (profile as { contact_preference?: string | null }).contact_preference ?? null
  );

  const profileGates = profile as {
    gate1_unlocked?: boolean | null;
    gate2_unlocked?: boolean | null;
    gate3_unlocked?: boolean | null;
    avatar_url?: string | null;
  };

  const gate1Unlocked =
    profileGates.gate1_unlocked != null
      ? Boolean(profileGates.gate1_unlocked)
      : emailVerified && profileBasicsComplete;

  const gate2Unlocked =
    profileGates.gate2_unlocked != null
      ? Boolean(profileGates.gate2_unlocked)
      : Boolean(
          gate1Unlocked &&
            hasAirports &&
            (profile.bio?.trim() ?? "") !== "" &&
            (profileGates.avatar_url?.trim() ?? "") !== ""
        );

  const gate3Unlocked =
    profileGates.gate3_unlocked != null
      ? Boolean(profileGates.gate3_unlocked)
      : hasPayouts;

  const gatesUnlockedCount = [gate1Unlocked, gate2Unlocked, gate3Unlocked].filter(
    Boolean
  ).length;
  const stepsRemaining = 3 - gatesUnlockedCount;

  const payoutReadyForProgress =
    Boolean(profile.stripe_payouts_enabled) ||
    Boolean(
      (profile as { manual_payout_method?: string | null }).manual_payout_method
        ?.trim()
    );

  const onboardingStep = (profile as { onboarding_step?: number | null })
    .onboarding_step;
  const showWelcomeProgressBanner =
    typeof onboardingStep === "number" && onboardingStep < 3;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-5 sm:pb-16 sm:pt-8">
      {showWelcome ? (
        <div
          className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/95 px-4 py-4 text-sm leading-relaxed text-blue-950 shadow-sm sm:px-5 sm:py-4"
          role="status"
        >
          <span className="font-semibold">Welcome!</span> Complete your payout
          setup to start accepting bookings.
        </div>
      ) : null}
      <header className="border-b border-slate-200/80 pb-6 sm:pb-7">
        <h1 className="text-balance text-[1.65rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl sm:leading-[1.15]">
          Start earning as a Line Holder
        </h1>
        {stepsRemaining > 0 ? (
          <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">
            {stepsRemaining} more{" "}
            {stepsRemaining === 1 ? "step" : "steps"} to start earning
          </p>
        ) : null}
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600 sm:mt-4 sm:text-lg sm:leading-relaxed">
          Browse category-based bookings, manage your setup, and get paid after
          completed handoffs.
        </p>
        <p className="mt-4 text-xs text-slate-500 sm:mt-5 sm:text-sm">
          Signed in as{" "}
          <span className="font-medium text-slate-600">{user.email}</span>
        </p>
      </header>

      <WaiterDashboardWelcomeBanner show={showWelcomeProgressBanner} />

      {!gate3Unlocked ? (
        <div className="mt-6 sm:mt-7">
          <WaiterOnboardingProgress
            gate1Unlocked={gate1Unlocked}
            gate2Unlocked={gate2Unlocked}
            gate3Unlocked={gate3Unlocked}
            firstName={profile.first_name ?? null}
            phone={profile.phone ?? null}
            bio={profile.bio ?? null}
            servingAirports={
              Array.isArray(profile.serving_airports)
                ? profile.serving_airports
                : null
            }
            payoutReady={payoutReadyForProgress}
            emailVerified={emailVerified}
            hasProfilePhoto={Boolean(profileGates.avatar_url?.trim())}
          />
        </div>
      ) : null}

      {stripeSyncError ? (
        <WaiterStripeSyncErrorBanner
          message={stripeSyncError}
          afterStripeRedirect={forceStripeSync}
        />
      ) : null}

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
            finish: email verification, profile, service areas, onboarding, and payout
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
            href="/dashboard/waiter/service-areas"
            className="inline-flex min-h-[52px] w-full flex-1 items-center justify-center rounded-xl border border-slate-200/90 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 sm:min-h-[48px] sm:w-auto sm:flex-none"
          >
            Edit my service areas
          </Link>
        </div>
      </div>

      <div
        id="waiter-payout-section"
        className="scroll-mt-28 sm:scroll-mt-24"
      >
        {payoutBypass ? (
          <div className="mt-7 rounded-2xl border border-amber-200/90 bg-amber-50/80 p-5 text-sm text-amber-900 sm:mt-8 sm:p-6">
            Test mode: payout gating is bypassed (`NEXT_PUBLIC_ALLOW_TEST_PAYOUT_BYPASS=true`).
            You can continue booking-flow testing without Stripe Connect registration.
          </div>
        ) : (
          <WaiterPayoutSetup
            stripeAccountId={profile?.stripe_account_id ?? null}
            stripeDetailsSubmitted={profile?.stripe_details_submitted ?? null}
            stripePayoutsEnabled={profile?.stripe_payouts_enabled ?? null}
            initialManualMethod={manualPayout?.method ?? ""}
            initialManualHandle={manualPayout?.handle ?? ""}
          />
        )}
      </div>

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
