import { parseBookingDescription } from "@/lib/customer-tracking";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import type { Job } from "@/lib/types/job";

function airportLabel(code: string) {
  return US_AIRPORTS_TOP_20.find((a) => a.code === code)?.label ?? code;
}

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

type Props = {
  job: Job;
};

export function ProviderBookingDetailsCard({ job }: Props) {
  const { exactLocation } = parseBookingDescription(job.description ?? "");

  return (
    <section
      id="booking-details-waiter"
      className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-7"
      aria-labelledby="provider-booking-details-heading"
    >
      <h2
        id="provider-booking-details-heading"
        className="text-base font-semibold tracking-tight text-slate-900"
      >
        Booking details
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Full request as posted — use with the customer card above.
      </p>

      <dl className="mt-6 space-y-0 rounded-2xl border border-slate-100 bg-slate-50/50">
        <div className="grid gap-4 border-b border-slate-100 p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Airport
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {airportLabel(job.airport)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Terminal
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {job.terminal}
            </dd>
          </div>
        </div>
        <div className="grid gap-4 border-b border-slate-100 p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Line type
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {job.line_type}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Estimated wait
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {job.estimated_wait}
            </dd>
          </div>
        </div>
        {exactLocation && (
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Exact location
            </dt>
            <dd className="mt-1 text-sm font-medium leading-relaxed text-slate-900">
              {exactLocation}
            </dd>
          </div>
        )}
        <div className="grid gap-4 border-b border-slate-100 p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Offered price
            </dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-blue-700">
              ${Number(job.offered_price).toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Posted
            </dt>
            <dd className="mt-1 text-sm font-medium tabular-nums text-slate-900">
              {formatDateTime(job.created_at)}
            </dd>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Extra time rate (per 30 min)
          </dt>
          <dd className="mt-1 text-sm font-medium tabular-nums text-slate-900">
            ${Number(job.overage_rate ?? 10).toFixed(2)}
          </dd>
        </div>
        {job.description?.trim() && (
          <div className="border-t border-slate-100 p-4 sm:p-5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Description &amp; notes (as posted)
            </dt>
            <dd className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
              {job.description}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
