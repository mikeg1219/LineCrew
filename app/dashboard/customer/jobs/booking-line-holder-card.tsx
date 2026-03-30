import { BookingContactPanel } from "@/components/booking-contact-panel";
import type { JobStatus } from "@/lib/types/job";
import { CUSTOMER_TRACKING_PAGE_LABELS } from "@/lib/job-status";

function lineHolderStatusLine(status: JobStatus): string {
  switch (status) {
    case "accepted":
    case "at_airport":
      return "Heading to the line for you.";
    case "in_line":
      return "Holding your place in line.";
    case "near_front":
      return "Almost at the front—get ready to meet.";
    case "pending_confirmation":
      return "Your Line Holder finished the line hold—confirm when you’re set.";
    case "completed":
      return "Thanks for booking with LineCrew.";
    case "cancelled":
      return "This booking is no longer active.";
    case "disputed":
      return "We’re reviewing this booking.";
    case "refunded":
      return "Refund details are reflected in your payment account.";
    default:
      return "";
  }
}

type Props = {
  jobId: string;
  contactEligible: boolean;
  displayName: string;
  avatarUrl: string | null;
  status: JobStatus;
  bioSnippet: string | null;
};

export function BookingLineHolderCard({
  jobId,
  contactEligible,
  displayName,
  avatarUrl,
  status,
  bioSnippet,
}: Props) {
  const statusLabel = CUSTOMER_TRACKING_PAGE_LABELS[status];
  const statusLine = lineHolderStatusLine(status);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 p-6 shadow-sm ring-1 ring-slate-900/5 sm:p-7">
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-blue-400/10 blur-2xl"
        aria-hidden
      />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Your Line Holder
      </h2>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <span className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 blur-sm" aria-hidden />
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="relative size-20 rounded-2xl border border-white object-cover shadow-md"
            />
          ) : (
            <div className="relative flex size-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-2xl font-bold text-slate-500 shadow-inner">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold tracking-tight text-slate-900">
            {displayName}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-900 ring-1 ring-indigo-200/80">
            {statusLabel}
          </span>
          {statusLine && (
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">
              {statusLine}
            </p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {bioSnippet ??
              "Profile details appear here when your Line Holder adds them."}
          </p>
          <BookingContactPanel
            jobId={jobId}
            contactTarget="line_holder"
            eligible={contactEligible}
          />
        </div>
      </div>
    </div>
  );
}

export function BookingLineHolderPendingCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/95 via-white to-white p-6 shadow-sm ring-1 ring-amber-100/80 sm:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-200/20 via-transparent to-transparent" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 shadow-inner">
            <span
              className="absolute inset-0 animate-ping rounded-2xl bg-amber-400/25"
              aria-hidden
            />
            <svg
              className="relative size-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
              />
            </svg>
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Waiting for a Line Holder
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Most bookings are accepted within a few minutes. Keep this page
              open—your status updates live as soon as someone accepts.
            </p>
            <p className="mt-3 text-sm font-medium text-amber-950/90">
              What happens next: a Line Holder accepts → they head to your line
              → you get handoff when it&apos;s your turn.
            </p>
          </div>
        </div>
      </div>
      <ul className="relative mt-5 grid gap-2 text-xs font-medium text-amber-950/85 sm:grid-cols-3">
        <li className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-amber-100">
          <span className="text-emerald-600" aria-hidden>
            ✓
          </span>
          Payment held until completion
        </li>
        <li className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-amber-100">
          <span className="text-emerald-600" aria-hidden>
            ✓
          </span>
          Cancel anytime while unmatched
        </li>
        <li className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-amber-100">
          <span className="text-emerald-600" aria-hidden>
            ✓
          </span>
          Live status on this page
        </li>
      </ul>
    </div>
  );
}
