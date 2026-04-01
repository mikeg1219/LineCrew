import { BookingContactPanel } from "@/components/booking-contact-panel";
import { bookingAllowsMaskedContact } from "@/lib/booking-contact/eligibility";
import { parseBookingDescription } from "@/lib/customer-tracking";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import type { Job, JobStatus } from "@/lib/types/job";

function airportLabel(code: string) {
  return US_AIRPORTS_TOP_20.find((a) => a.code === code)?.label ?? code;
}

type Props = {
  job: Job;
  customerDisplayName: string;
  customerAvatarUrl: string | null;
  /** Hide PII until the Line Holder has accepted the booking */
  redacted?: boolean;
};

export function ProviderCustomerCard({
  job,
  customerDisplayName,
  customerAvatarUrl,
  redacted = false,
}: Props) {
  const { exactLocation, customerNotes } = parseBookingDescription(
    job.description ?? ""
  );
  const notes = customerNotes?.trim() || job.description?.trim() || null;
  const contactEligible =
    !redacted && bookingAllowsMaskedContact(job.status as JobStatus);

  return (
    <section
      id="booking-customer-contact"
      className="scroll-mt-28 relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/40 to-blue-50/30 p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-7"
      aria-labelledby="provider-customer-heading"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-blue-500/10 blur-2xl"
        aria-hidden
      />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 flex gap-4">
          <div className="shrink-0">
            {redacted ? (
              <div className="flex size-[4.5rem] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-sm font-semibold text-slate-500 sm:size-20">
                —
              </div>
            ) : customerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={customerAvatarUrl}
                alt=""
                className="size-[4.5rem] rounded-2xl border border-slate-200 object-cover shadow-md sm:size-20"
              />
            ) : (
              <div className="flex size-[4.5rem] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-2xl font-bold text-slate-500 shadow-inner sm:size-20">
                {customerDisplayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="provider-customer-heading"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Customer
            </h2>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {redacted ? "Customer" : customerDisplayName}
            </p>
            {redacted && (
              <p className="mt-3 rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm leading-snug text-slate-600 ring-1 ring-slate-100">
                Name and contact details unlock after you accept this booking.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 sm:py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Airport
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">
            {airportLabel(job.airport)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 sm:py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Terminal
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">
            {job.terminal}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 sm:py-3 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Line type
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug text-slate-900">
            {job.line_type}
          </p>
        </div>
      </div>

      {exactLocation && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-3 sm:px-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-900/80">
            Exact location
          </p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-blue-950">
            {exactLocation}
          </p>
        </div>
      )}

      {!redacted && notes && (
        <div className="mt-4 border-t border-slate-100 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Notes / instructions
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {notes}
          </p>
        </div>
      )}
      {!redacted && (
        <div className="mt-6 border-t border-dashed border-slate-200 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Optional — only if needed
          </p>
          <BookingContactPanel
            jobId={job.id}
            contactTarget="customer"
            eligible={contactEligible}
          />
        </div>
      )}
      {redacted && (
        <div className="mt-4 border-t border-slate-100 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Notes / instructions
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Shown in full after you accept—use booking details below for now.
          </p>
        </div>
      )}
    </section>
  );
}
