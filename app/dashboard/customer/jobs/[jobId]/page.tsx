import { BookingActivityTimeline } from "@/app/dashboard/customer/jobs/booking-activity-timeline";
import { BookingTrackingLive } from "@/app/dashboard/customer/jobs/booking-tracking-live";
import { CustomerHandoffPanel } from "@/app/dashboard/handoff/customer-handoff-panel";
import { HandoffAuditPanel } from "@/app/dashboard/handoff/handoff-audit-panel";
import { HandoffSuccessCard } from "@/app/dashboard/handoff/handoff-success-card";
import {
  BookingLineHolderCard,
  BookingLineHolderPendingCard,
} from "@/app/dashboard/customer/jobs/booking-line-holder-card";
import { BookingProgressTracker } from "@/app/dashboard/customer/jobs/booking-progress-tracker";
import { CustomerBookingExtraActions } from "@/app/dashboard/customer/jobs/customer-booking-extra-actions";
import { CustomerHandoffGuidanceCard } from "@/app/dashboard/customer/jobs/customer-handoff-guidance";
import { CompletionConfirmationPanel } from "@/app/dashboard/customer/jobs/completion-confirmation-panel";
import { OverageCustomerAlert } from "@/app/dashboard/customer/jobs/overage-customer-alert";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import { bookingAllowsMaskedContact } from "@/lib/booking-contact/eligibility";
import {
  buildBookingTimelineEvents,
  parseBookingDescription,
} from "@/lib/customer-tracking";
import { getCustomerStickyActions } from "@/lib/handoff-guidance";
import { CUSTOMER_TRACKING_PAGE_LABELS, statusBadgeClass } from "@/lib/job-status";
import { profileResolvedLabel } from "@/lib/profile-display-name";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import type { OverageRequest } from "@/lib/types/overage";
import { MobileBookingStickyBar } from "@/components/mobile-booking-sticky-bar";
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

const LIVE_TRACKING = new Set<JobStatus>([
  "open",
  "accepted",
  "at_airport",
  "in_line",
  "near_front",
  "customer_on_the_way",
  "ready_for_handoff",
  "qr_generated",
  "qr_scanned",
  "awaiting_dual_confirmation",
  "pending_confirmation",
]);

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export default async function CustomerJobTrackingPage({ params }: PageProps) {
  const { jobId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "customer") {
    redirect("/dashboard/waiter");
  }

  const { data: row, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const job = row as Job;
  const status = job.status as JobStatus;

  const { data: pendingOverage } = await supabase
    .from("overage_requests")
    .select("id, amount, status, created_at")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .maybeSingle();

  const pending = pendingOverage as
    | (Pick<OverageRequest, "id" | "amount" | "status"> & {
        created_at: string;
      })
    | null;

  const hasWaiter =
    job.waiter_id != null &&
    status !== "open" &&
    status !== "cancelled";

  const showPaymentTrustLine =
    status === "open" ||
    status === "accepted" ||
    status === "at_airport" ||
    status === "in_line" ||
    status === "near_front" ||
    status === "pending_confirmation";

  const canCancel = !TERMINAL.has(status);

  const { exactLocation, customerNotes } = parseBookingDescription(
    job.description ?? ""
  );

  const bookingTitle = `${airportLabel(job.airport)} — ${job.line_type}`;
  const badgeLabel = CUSTOMER_TRACKING_PAGE_LABELS[status];

  let waiterAvatarPublic: string | null = null;
  let waiterDisplayName = "Line Holder";
  let waiterBio: string | null = null;

  if (job.waiter_id) {
    const { data: wp } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", job.waiter_id)
      .maybeSingle();

    if (wp?.avatar_url) {
      const { data: pub } = supabase.storage
        .from("avatars")
        .getPublicUrl(wp.avatar_url);
      waiterAvatarPublic = pub.publicUrl;
    }
    waiterDisplayName =
      profileResolvedLabel(wp ?? null, job.waiter_email) || "Line Holder";
    waiterBio = wp?.bio?.trim() ? truncate(wp.bio.trim(), 220) : null;
  }

  const timelineEvents = buildBookingTimelineEvents(job);

  const showLiveStrip = LIVE_TRACKING.has(status);

  const hasConfirmHandoff =
    (status === "pending_confirmation" || status === "awaiting_dual_confirmation") &&
    Boolean(job.completed_at || job.qr_scanned_at);
  const stickyActions = getCustomerStickyActions(status, hasConfirmHandoff);

  const handoffUrgent =
    status === "near_front" || status === "pending_confirmation";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <BookingTrackingLive jobId={job.id} />
      <Link
        href="/dashboard/customer"
        className="text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        ← Back to dashboard
      </Link>

      <header className="relative mt-6 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/5">
        <div
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-blue-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden
        />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Track booking
            </p>
            {showLiveStrip && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Live updates
              </span>
            )}
          </div>
          <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {bookingTitle}
          </h1>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span
              className={`inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-semibold shadow-sm ring-1 ${statusBadgeClass(status)} ${
                handoffUrgent
                  ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-white"
                  : ""
              }`}
            >
              {badgeLabel}
            </span>
            {showPaymentTrustLine && (
              <div className="flex flex-col gap-0.5 sm:items-end">
                <span className="text-sm font-medium text-slate-700">
                  Payment is held until completion
                </span>
                <span className="text-xs text-slate-500">
                  You&apos;re charged upfront; funds release when the booking
                  finishes.
                </span>
              </div>
            )}
          </div>
          <dl className="mt-6 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Airport
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                {airportLabel(job.airport)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Offer
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                ${Number(job.offered_price).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Posted
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                {formatDateTime(job.created_at)}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <CustomerHandoffGuidanceCard
        status={status}
        terminal={job.terminal}
        exactLocation={exactLocation}
        airportLabelText={airportLabel(job.airport)}
      />

      {(status === "near_front" ||
        status === "customer_on_the_way" ||
        status === "ready_for_handoff" ||
        status === "qr_generated" ||
        status === "qr_scanned" ||
        status === "awaiting_dual_confirmation") && (
        <div className="mt-6">
          <CustomerHandoffPanel
            jobId={job.id}
            status={status}
            handoffToken={job.handoff_qr_token}
            handoffCode={job.handoff_code}
          />
          <div className="mt-4">
            <HandoffAuditPanel job={job} />
          </div>
        </div>
      )}

      {(status === "pending_confirmation" || status === "awaiting_dual_confirmation") &&
        (job.completed_at || job.qr_scanned_at) && (
        <div id="booking-confirm-handoff" className="scroll-mt-28 mt-6">
          <CompletionConfirmationPanel
            jobId={job.id}
            completedAt={job.completed_at ?? job.qr_scanned_at ?? job.created_at}
          />
        </div>
      )}

      {status === "completed" && (
        <div className="mt-6">
          <HandoffSuccessCard
            role="customer"
            jobId={job.id}
            offeredPrice={Number(job.offered_price)}
            payoutTransferId={job.payout_transfer_id}
          />
        </div>
      )}

      <div className="mt-6 space-y-6">
        <div id="booking-progress-track" className="scroll-mt-28">
          <BookingProgressTracker status={status} />
        </div>

        <div id="booking-line-holder-contact" className="scroll-mt-28">
          {status === "open" ? (
            <BookingLineHolderPendingCard />
          ) : hasWaiter ? (
            <BookingLineHolderCard
              jobId={job.id}
              contactEligible={bookingAllowsMaskedContact(status)}
              displayName={waiterDisplayName}
              avatarUrl={waiterAvatarPublic}
              status={status}
              bioSnippet={waiterBio}
            />
          ) : null}
        </div>

        <section
          id="booking-details"
          className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 sm:p-8"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Booking details
          </h2>
          <dl className="mt-6 divide-y divide-slate-100">
            <div className="grid gap-4 py-4 first:pt-0 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Airport
                </dt>
                <dd className="mt-1.5 text-slate-900">
                  {airportLabel(job.airport)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Terminal
                </dt>
                <dd className="mt-1.5 text-slate-900">{job.terminal}</dd>
              </div>
            </div>
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Line type
                </dt>
                <dd className="mt-1.5 text-slate-900">{job.line_type}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Estimated wait
                </dt>
                <dd className="mt-1.5 text-slate-900">{job.estimated_wait}</dd>
              </div>
            </div>
            {exactLocation && (
              <div className="py-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Exact location
                </dt>
                <dd className="mt-1.5 text-slate-900">{exactLocation}</dd>
              </div>
            )}
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Offered price
                </dt>
                <dd className="mt-1.5 text-2xl font-bold tabular-nums text-blue-700">
                  ${Number(job.offered_price).toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Posted
                </dt>
                <dd className="mt-1.5 text-slate-900">
                  {formatDateTime(job.created_at)}
                </dd>
              </div>
            </div>
            <div className="py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Extra time rate (per 30 min)
              </dt>
              <dd className="mt-1.5 text-slate-900">
                ${Number(job.overage_rate ?? 10).toFixed(2)}
              </dd>
            </div>
            {(customerNotes?.trim() || job.description?.trim()) && (
              <div className="py-4 last:pb-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </dt>
                <dd className="mt-1.5 whitespace-pre-wrap text-slate-900">
                  {customerNotes?.trim() || job.description}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {status === "disputed" && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Your dispute has been received. An admin will review within 24
            hours.
          </p>
        )}

        {pending && (
          <OverageCustomerAlert
            jobId={job.id}
            requestId={pending.id}
            amount={Number(pending.amount)}
            createdAt={pending.created_at}
          />
        )}

        <div id="booking-activity-timeline" className="scroll-mt-28">
          <BookingActivityTimeline events={timelineEvents} />
        </div>

        <div id="booking-more-actions" className="scroll-mt-28">
          <CustomerBookingExtraActions jobId={job.id} canCancel={canCancel} />
        </div>
      </div>

      <MobileBookingStickyBar actions={stickyActions} />
    </div>
  );
}
