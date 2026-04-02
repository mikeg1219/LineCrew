"use client";

import { CancelJobButton } from "@/app/dashboard/customer/jobs/cancel-job-button";
import { ReportIssueModal } from "@/components/report-issue-modal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  jobId: string;
  canCancel: boolean;
};

export function CustomerBookingExtraActions({ jobId, canCancel }: Props) {
  const router = useRouter();
  const [showReport, setShowReport] = useState(false);
  const [issueReported, setIssueReported] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Actions
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        Tracking and status updates above are the main workflow—no messaging
        required.{" "}
        <Link
          href="#booking-line-holder-contact"
          className="inline-flex min-h-[44px] items-center font-medium text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
        >
          Optional SMS
        </Link>{" "}
        is available in the Line Holder card when eligible.
      </p>
      {issueReported && (
        <div
          className="mt-4 rounded-xl border border-emerald-200/90 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 ring-1 ring-emerald-100/80"
          role="status"
        >
          Your issue has been reported. We&apos;ll respond within 2 hours.
        </div>
      )}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => setShowReport(true)}
          disabled={issueReported}
          className={`inline-flex w-full min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm transition sm:w-auto ${
            issueReported
              ? "cursor-not-allowed border-emerald-200 bg-emerald-50/80 text-emerald-700"
              : "border-slate-200 bg-white text-slate-900 ring-1 ring-slate-900/5 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {issueReported ? "Issue reported ✓" : "Report issue"}
        </button>
      </div>
      {showReport && (
        <ReportIssueModal
          jobId={jobId}
          reporterRole="customer"
          onClose={() => setShowReport(false)}
          onSuccess={() => {
            setShowReport(false);
            setIssueReported(true);
            router.refresh();
          }}
        />
      )}
      {canCancel && (
        <div className="mt-6">
          <CancelJobButton jobId={jobId} />
        </div>
      )}
    </div>
  );
}
