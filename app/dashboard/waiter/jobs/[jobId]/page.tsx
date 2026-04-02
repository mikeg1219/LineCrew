import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { HandoffAuditPanel } from "@/app/dashboard/handoff/handoff-audit-panel";
import { WaiterHandoffPanel } from "@/app/dashboard/handoff/waiter-handoff-panel";
import { HandoffSuccessCard } from "@/app/dashboard/handoff/handoff-success-card";
import { LineHolderHandoffGuidanceCard } from "@/app/dashboard/waiter/jobs/line-holder-handoff-guidance";
import { LineHolderStatusPanel } from "@/app/dashboard/waiter/jobs/line-holder-status-panel";
import { ProviderBookingDetailsCard } from "@/app/dashboard/waiter/jobs/provider-booking-details-card";
import { ProviderBookingTimeline } from "@/app/dashboard/waiter/jobs/provider-booking-timeline";
import { ProviderCustomerCard } from "@/app/dashboard/waiter/jobs/provider-customer-card";
import { ProviderExecutionNote } from "@/app/dashboard/waiter/jobs/provider-execution-note";
import { RequestExtraTimeForm } from "@/app/dashboard/waiter/jobs/request-extra-time-form";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import { parseBookingDescription } from "@/lib/customer-tracking";
import { getLineHolderStickyActions } from "@/lib/handoff-guidance";
import { buildProviderTimelineEvents } from "@/lib/provider-booking";
import { PROVIDER_LINE_STATUS_LABELS, statusBadgeClass } from "@/lib/job-status";
import { profileResolvedLabel } from "@/lib/profile-display-name";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import {
  isWaiterAcceptSetupComplete,
  waiterAcceptSetupShortfallMessage,
} from "@/lib/waiter-profile-complete";
import { ErrorBoundary } from "@/components/error-boundary";
import { MobileBookingStickyBar } from "@/components/mobile-booking-sticky-bar";
import { ReportJobIssueForm } from "@/components/report-job-issue-form";
import { isProfileCompleteForBookings } from "@/lib/profile-booking-gate";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ jobId: string }> };

function airportLabel(code: string) {
  return US_AIRPORTS_TOP_20.find((a) => a.code === code)?.label ?? code;
}

const TERMINAL = new Set<JobStatus>([
  "completed",
  "cancelled",
  "issue_flagged",
  "disputed",
  "refunded",
]);

export default async function WaiterJobDetailPage({ params }: PageProps) {
  const { jobId } = await params;
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

  if (profile.role !== "waiter") {
    redirect("/dashboard/customer");
  }

  if (!isProfileCompleteForBookings(profile)) {
    redirect("/dashboard/profile?profile_required=1");
  }

  const { data: row, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const job = row as Job;
  const serving = (profile?.serving_airports as string[] | null) ?? [];
  const isAssigned = job.waiter_id === user.id;
  const isOpenPreview =
    job.status === "open" &&
    job.waiter_id == null &&
    serving.includes(job.airport);

  if (!isAssigned && !isOpenPreview) {
    redirect("/dashboard/waiter/browse-jobs");
  }

  const status = job.status as JobStatus;
  const showExtraTimeRequest =
    isAssigned && (status === "in_line" || status === "near_front");
  const overageRate = Number(job.overage_rate ?? 10);
  const canAcceptJobs = isWaiterAcceptSetupComplete(profile, user);
  const acceptSetupHint = waiterAcceptSetupShortfallMessage(profile, user);

  let customerAvatarPublic: string | null = null;
  let customerDisplayName = "Customer";

  if (isAssigned) {
    const { data: cust } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", job.customer_id)
      .maybeSingle();

    if (cust?.avatar_url) {
      const { data: pub } = supabase.storage
        .from("avatars")
        .getPublicUrl(cust.avatar_url);
      customerAvatarPublic = pub.publicUrl;
    }
    customerDisplayName =
      profileResolvedLabel(cust ?? null, job.customer_email) || "Customer";
  }

  const timelineEvents = buildProviderTimelineEvents(job);
  const badgeLabel =
    isOpenPreview && status === "open"
      ? "Available booking"
      : PROVIDER_LINE_STATUS_LABELS[status];
  const bookingTitle = `${airportLabel(job.airport)} — ${job.line_type}`;
  const showLiveStrip =
    isAssigned &&
    !TERMINAL.has(status) &&
    status !== "pending_confirmation";

  const showActionSubcopy =
    !TERMINAL.has(status) && status !== "pending_confirmation";

  const { exactLocation } = parseBookingDescription(job.description ?? "");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 pb-24 pt-8 sm:space-y-8 sm:pb-24 md:pb-14">
      <Link
        href="/dashboard/waiter"
        className="inline-flex min-h-[44px] items-center text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        ← Back to dashboard
      </Link>

      <header className="relative overflow-hidden linecrew-card shadow-md ring-1 ring-slate-900/5">
        <div
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-blue-500/10 blur-3xl"
          aria-hidden
        />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              LINE HOLDER
            </p>
            {showLiveStrip && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                In progress
              </span>
            )}
          </div>
          <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {bookingTitle}
          </h1>
          <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <span
              className={`inline-flex w-fit items-center rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm ring-1 sm:px-4 sm:py-2 ${statusBadgeClass(status)}`}
            >
              {badgeLabel}
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span className="font-medium tabular-nums text-slate-800">
                ${Number(job.offered_price).toFixed(2)} offer
              </span>
              <span className="text-slate-400 sm:hidden" aria-hidden>
                ·
              </span>
              <span>Est. wait {job.estimated_wait}</span>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mt-5">
            {isOpenPreview ? (
              <>
                Review the details, then accept to lock this booking. The
                customer is notified when you update progress.
              </>
            ) : (
              <>
                Keep your customer updated as the booking progresses—they see
                each status change on their tracking page.
              </>
            )}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 sm:text-sm">
            Payment is released after the customer confirms completion (or per
            LineCrew policy).
          </p>
        </div>
      </header>

      <LineHolderHandoffGuidanceCard
        status={status}
        terminal={job.terminal}
        isOpenPreview={isOpenPreview}
        exactLocation={exactLocation}
        airportLabelText={airportLabel(job.airport)}
      />

      {status === "completed" && (
        <HandoffSuccessCard
          role="waiter"
          jobId={job.id}
          offeredPrice={Number(job.offered_price)}
          payoutTransferId={job.payout_transfer_id}
        />
      )}

      <ProviderCustomerCard
        job={job}
        customerDisplayName={customerDisplayName}
        customerAvatarUrl={customerAvatarPublic}
        redacted={isOpenPreview}
      />

      <ProviderBookingDetailsCard job={job} />

      <section
        id="booking-line-holder-actions"
        className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-7"
        aria-labelledby="booking-actions-heading"
      >
        <div className="border-b border-slate-100 pb-5">
          <h2
            id="booking-actions-heading"
            className="text-base font-semibold tracking-tight text-slate-900"
          >
            Booking actions
          </h2>
          {status === "pending_confirmation" && (
            <p className="mt-2 text-sm text-slate-600">
              Waiting on the customer — no status buttons right now.
            </p>
          )}
          {status === "awaiting_dual_confirmation" && (
            <p className="mt-2 text-sm text-slate-600">
              QR verified. Waiting for both sides to confirm transfer.
            </p>
          )}
          {TERMINAL.has(status) && (
            <p className="mt-2 text-sm text-slate-600">
              This booking is closed — no further updates.
            </p>
          )}
          {showActionSubcopy && status !== "open" && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Tap the next step when it applies. Only one action is available at
              a time; the customer sees updates on their tracking page.
            </p>
          )}
          {showActionSubcopy && status === "open" && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Accept to lock this booking and unlock full customer details.
            </p>
          )}
        </div>
        <div className="pt-6">
          {status === "pending_confirmation" || status === "awaiting_dual_confirmation" ? (
            <div>
              <p className="text-base font-semibold text-slate-900">
                Awaiting customer confirmation
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                You marked this booking ready for handoff. The customer will
                confirm or dispute. You&apos;ll be paid after they confirm or
                after the window in LineCrew policy if they don&apos;t respond.
              </p>
              <div className="mt-4">
                <WaiterHandoffPanel
                  jobId={job.id}
                  status={status}
                  handoffToken={job.handoff_qr_token}
                  handoffCode={job.handoff_code}
                  handoffQrExpiresAt={job.handoff_qr_expires_at}
                />
              </div>
            </div>
          ) : TERMINAL.has(status) ? (
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-slate-700">
                {status === "completed" &&
                  "This booking is complete. No further status updates are needed."}
                {status === "cancelled" &&
                  "This booking was cancelled. No further actions are available."}
                {status === "disputed" &&
                  "This booking is under review. Support will follow up if needed."}
                {status === "refunded" &&
                  "This booking was refunded. No further actions are available."}
              </p>
              {isAssigned && (
                <div className="max-w-lg">
                  <ReportJobIssueForm
                    jobId={job.id}
                    reporterRole="waiter"
                    variant="compact"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <ErrorBoundary sectionLabel="Status updates">
                <LineHolderStatusPanel
                  key={job.id}
                  jobId={job.id}
                  currentStatus={status}
                  acceptSetupReady={canAcceptJobs}
                  acceptSetupHint={acceptSetupHint}
                  allowReportIssue={isAssigned}
                />
              </ErrorBoundary>
              {(status === "near_front" ||
                status === "customer_on_the_way" ||
                status === "ready_for_handoff" ||
                status === "qr_generated" ||
                status === "qr_scanned") && (
                <div className="space-y-4">
                  <WaiterHandoffPanel
                    jobId={job.id}
                    status={status}
                    handoffToken={job.handoff_qr_token}
                    handoffCode={job.handoff_code}
                    handoffQrExpiresAt={job.handoff_qr_expires_at}
                  />
                  <HandoffAuditPanel job={job} />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {showExtraTimeRequest && (
        <div className="rounded-3xl border border-amber-200/90 bg-amber-50/60 p-5 shadow-sm ring-1 ring-amber-100/80 sm:p-7">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Extra time
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            If the line is slower than expected, request an extra 30 minutes at
            the customer&apos;s agreed rate (${overageRate.toFixed(2)}).
          </p>
          <div className="mt-5 max-w-md">
            <RequestExtraTimeForm jobId={job.id} />
          </div>
        </div>
      )}

      <ProviderExecutionNote />

      <div id="booking-timeline" className="scroll-mt-28">
        <ProviderBookingTimeline events={timelineEvents} />
      </div>

      <MobileBookingStickyBar actions={getLineHolderStickyActions(status)} />
    </div>
  );
}
