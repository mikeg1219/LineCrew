import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { NavBar } from "@/components/NavBar";
import { WaiterDashboardWelcomeBanner } from "@/components/waiter-dashboard-welcome-banner";
import { WaiterOnboardingProgress } from "@/components/waiter-onboarding-progress";
import { WaiterPayoutSetup } from "@/app/dashboard/waiter/waiter-payout-setup";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { JOB_STATUS_LABELS, statusBadgeClass } from "@/lib/job-status";
import {
  profileResolvedLabel,
  profileWelcomeFirstName,
} from "@/lib/profile-display-name";
import { syncWaiterStripeIfNeeded } from "@/lib/stripe-account-sync";
import {
  isStripeConnectPayoutReady,
  isStripePayoutBypassEnabled,
  parseManualPayoutPreference,
  waiterProfileBasicsAndOnboardingComplete,
} from "@/lib/waiter-profile-complete";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
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
  const connectRaw = sp.connect;
  const connect = Array.isArray(connectRaw) ? connectRaw[0] : connectRaw;
  const forceStripeSync = connect === "return" || connect === "refresh";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

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
  if (profileRow.role === "customer") redirect("/dashboard/customer");

  const { profile: syncedProfile } = await syncWaiterStripeIfNeeded(
    supabase,
    user.id,
    profileRow as Record<string, unknown>,
    { force: forceStripeSync }
  );
  const profile = syncedProfile as typeof profileRow;

  let avatarUrl = null;
  if (profile.avatar_url) {
    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(profile.avatar_url);
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

  const activeJobs = (jobRows ?? []) as Pick<
    Job,
    "id" | "status" | "airport" | "line_type" | "offered_price" | "created_at"
  >[];
  const servingAirports = profile.serving_airports ?? null;
  const servingCount = Array.isArray(servingAirports) ? servingAirports.length : 0;
  const manualPayout = parseManualPayoutPreference(
    (profile as { contact_preference?: string | null }).contact_preference
  );

  const hasPayouts = isStripeConnectPayoutReady(profile);
  const hasAirports = servingCount > 0;
  const emailVerified = isEmailVerifiedForApp(
    profile as { email_verified_at: string | null } | null,
    user
  );
  const profileBasicsComplete = waiterProfileBasicsAndOnboardingComplete(profile);

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

  const payoutBypass = isStripePayoutBypassEnabled();

  return (
    <div
      style={{ minHeight: "100vh", background: "#f8f9fa", paddingTop: "60px", paddingBottom: "80px" }}
    >
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
        <header className="border-b border-slate-200/80 pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Start earning as a Line Holder
          </h1>
          {stepsRemaining > 0 ? (
            <p className="mt-1 text-sm text-slate-500">
              {stepsRemaining} more{" "}
              {stepsRemaining === 1 ? "step" : "steps"} to start earning
            </p>
          ) : null}
          <p className="mt-3 text-lg text-slate-600">
            Welcome back,{" "}
            {profileWelcomeFirstName(
              profile,
              user.email,
              user.user_metadata as Record<string, unknown> | undefined
            )}
            !
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as{" "}
            <span className="font-medium text-slate-900">{user.email}</span>
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

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/waiter/browse-jobs"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Browse bookings
          </Link>
          <Link
            href="/dashboard/waiter/service-areas"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Edit my service areas
          </Link>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Edit profile
          </Link>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Active bookings (max 2):{" "}
          <span className="font-semibold text-slate-900">
            {activeJobCount ?? 0} / 2
          </span>
          {servingCount === 0 && (
            <span className="ml-2 text-amber-800">
              — set service areas to see open bookings.
            </span>
          )}
        </p>

        {payoutBypass ? (
          <div className="mt-7 rounded-2xl border border-amber-200/90 bg-amber-50/80 p-5 text-sm text-amber-900 sm:p-6">
            Test mode: payout gating is bypassed (`NEXT_PUBLIC_ALLOW_TEST_PAYOUT_BYPASS=true`).
            You can continue booking-flow testing without Stripe Connect registration.
          </div>
        ) : (
          <WaiterPayoutSetup
            stripeAccountId={profile?.stripe_account_id ?? null}
            stripeDetailsSubmitted={
              (profile as { stripe_details_submitted?: boolean | null } | null)
                ?.stripe_details_submitted ?? null
            }
            stripePayoutsEnabled={
              (profile as { stripe_payouts_enabled?: boolean | null } | null)
                ?.stripe_payouts_enabled ?? null
            }
            initialManualMethod={manualPayout?.method ?? ""}
            initialManualHandle={manualPayout?.handle ?? ""}
          />
        )}

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-900">
            Your active bookings
          </h2>
          {activeJobs.length === 0 ? (
            <p className="mt-3 text-slate-600">
              No active bookings yet. Browse open listings to get started.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activeJobs.map((job) => {
                const st = job.status as JobStatus;
                return (
                  <li
                    key={job.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
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
                        className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(st)}`}
                      >
                        {JOB_STATUS_LABELS[st]}
                      </span>
                    </div>
                    <Link
                      href={`/dashboard/waiter/jobs/${job.id}`}
                      className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
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
    </div>
  );
}
