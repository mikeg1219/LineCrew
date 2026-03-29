import { parseBookingDescription } from "@/lib/customer-tracking";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import type { Job } from "@/lib/types/job";

function airportLabel(code: string) {
  return US_AIRPORTS_TOP_20.find((a) => a.code === code)?.label ?? code;
}

type Props = {
  job: Job;
  customerDisplayName: string;
  customerAvatarUrl: string | null;
};

export function ProviderCustomerCard({
  job,
  customerDisplayName,
  customerAvatarUrl,
}: Props) {
  const { exactLocation, customerNotes } = parseBookingDescription(
    job.description ?? ""
  );
  const notes = customerNotes?.trim() || job.description?.trim() || null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Customer
      </h2>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          {customerAvatarUrl ? (
            <img
              src={customerAvatarUrl}
              alt=""
              className="size-16 rounded-2xl border border-slate-200 object-cover shadow-sm"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-xl font-bold text-slate-500">
              {customerDisplayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-slate-900">
            {customerDisplayName}
          </p>
          {job.customer_email && (
            <p className="mt-0.5 truncate text-sm text-slate-600">
              {job.customer_email}
            </p>
          )}
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">
                Airport &amp; terminal
              </dt>
              <dd className="mt-0.5 text-slate-900">
                {airportLabel(job.airport)} · Terminal {job.terminal}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">
                Line type
              </dt>
              <dd className="mt-0.5 text-slate-900">{job.line_type}</dd>
            </div>
            {exactLocation && (
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  Exact location
                </dt>
                <dd className="mt-0.5 text-slate-900">{exactLocation}</dd>
              </div>
            )}
            {notes && (
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  Notes / instructions
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">
                  {notes}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
