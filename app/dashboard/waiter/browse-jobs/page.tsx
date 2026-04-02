import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { AcceptJobForm } from "@/app/dashboard/waiter/browse-jobs/accept-job-form";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { isProfileCompleteForBookings } from "@/lib/profile-booking-gate";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import { getBookingCategoryForLineType } from "@/lib/jobs/options";
import { WaiterStripeSyncErrorBanner } from "@/app/dashboard/waiter/stripe-sync-error-banner";
import { syncWaiterStripeIfNeeded } from "@/lib/stripe-account-sync";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import {
  isWaiterAcceptSetupComplete,
  waiterAcceptSetupShortfallMessage,
  waiterProfileBasicsAndOnboardingComplete,
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

export default async function BrowseJobsPage({
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
  const forceStripeSync =
    connect === "return" || connect === "refresh";

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

  const { profile: syncedProfile, stripeSyncError } = profileRow
    ? await syncWaiterStripeIfNeeded(
        supabase,
        user.id,
        profileRow as Record<string, unknown>,
        { force: forceStripeSync }
      )
    : { profile: null as Record<string, unknown> | null, stripeSyncError: null };

  const profile = syncedProfile
    ? (syncedProfile as typeof profileRow)
    : null;

  if (!profile) {
    return <DashboardFinishingSetup userEmail={user.email ?? ""} />;
  }

  if (profile.role === "customer") {
    redirect("/dashboard/customer");
  }

  if (!isProfileCompleteForBookings(profile)) {
    redirect("/dashboard/profile?profile_required=1");
  }

  const canAcceptJobs = isWaiterAcceptSetupComplete(profile, user);
  const acceptHint = waiterAcceptSetupShortfallMessage(profile, user);

  const emailVerified = isEmailVerifiedForApp(
    profile as { email_verified_at: string | null } | null,
    user
  );
  const profileBasicsComplete = waiterProfileBasicsAndOnboardingComplete(profile);
  const profileGates = profile as {
    gate1_unlocked?: boolean | null;
    gate2_unlocked?: boolean | null;
    avatar_url?: string | null;
  };
  const gate1Unlocked =
    profileGates.gate1_unlocked != null
      ? Boolean(profileGates.gate1_unlocked)
      : emailVerified && profileBasicsComplete;

  const serving =
    (profile as { serving_airports?: string[] | null }).serving_airports ??
    [];
  const hasAirports = serving.length > 0;
  const gate2Unlocked =
    profileGates.gate2_unlocked != null
      ? Boolean(profileGates.gate2_unlocked)
      : Boolean(
          gate1Unlocked &&
            hasAirports &&
            (profile.bio?.trim() ?? "") !== "" &&
            (profileGates.avatar_url?.trim() ?? "") !== ""
        );
  const preferredCategories =
    (profile as { preferred_categories?: string[] | null }).preferred_categories ??
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
    const fetched = (res.data ?? []) as Job[];
    list =
      preferredCategories.length === 0
        ? fetched
        : fetched.filter((j) =>
            preferredCategories.includes(getBookingCategoryForLineType(j.line_type))
          );
    error = res.error;
  }

  return (
    <div className="pb-12">
      <Link
        href="/dashboard/waiter"
        className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        ← Back to dashboard
      </Link>
      <DashboardPageHeader
        eyebrow="LINE HOLDER"
        title="Browse open bookings"
        subtitle="Open listings from customers who need someone in line. Accept a booking to see full details and contact the customer."
      />
      <div className="mb-8">
        {stripeSyncError ? (
          <WaiterStripeSyncErrorBanner
            message={stripeSyncError}
            afterStripeRedirect={forceStripeSync}
            footerVariant="linkToDashboard"
          />
        ) : null}
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
        <div className="linecrew-card p-10 text-center text-slate-600">
          No open bookings match your current service areas and category preferences.
          Check back soon or update preferences in Profile.
        </div>
      )}

      {!error && list.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {list.map((job) => (
            <li
              key={job.id}
              className="linecrew-card w-full max-w-full p-5 transition hover:border-blue-200/80 hover:shadow-md"
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
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="order-1 w-full sm:order-2 sm:max-w-xs">
                  <AcceptJobForm
                    jobId={job.id}
                    gate2Unlocked={gate2Unlocked}
                    canAccept={canAcceptJobs}
                    setupHint={acceptHint}
                  />
                </div>
                <Link
                  href={`/dashboard/waiter/jobs/${job.id}`}
                  className="order-2 inline-flex min-h-[44px] w-full flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:order-1 sm:w-auto sm:flex-none sm:min-w-[10rem]"
                >
                  View booking
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
