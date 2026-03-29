"use client";

import { CancelJobButton } from "@/app/dashboard/customer/jobs/cancel-job-button";

type Props = {
  jobId: string;
  canCancel: boolean;
};

export function CustomerBookingExtraActions({ jobId, canCancel }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Actions
      </h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled
          title="Messaging is coming soon"
          className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400"
        >
          Contact Line Holder
          <span className="ml-2 rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Soon
          </span>
        </button>
        <button
          type="button"
          disabled
          title="Reporting will be available in a future update"
          className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400"
        >
          Report issue
          <span className="ml-2 rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Soon
          </span>
        </button>
      </div>
      {canCancel && (
        <div className="mt-6">
          <CancelJobButton jobId={jobId} />
        </div>
      )}
    </div>
  );
}
