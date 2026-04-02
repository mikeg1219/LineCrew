"use client";

import { ReportIssueModal } from "@/components/report-issue-modal";
import type { JobIssueReporterRole } from "@/lib/types/job-issue";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  jobId: string;
  reporterRole: JobIssueReporterRole;
  /** Tighter trigger for waiter status panel; default for customer actions. */
  variant?: "default" | "compact";
};

export function ReportJobIssueForm({
  jobId,
  reporterRole,
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const triggerClass =
    variant === "compact"
      ? "w-full min-h-[48px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-900/5 transition hover:border-slate-300 hover:bg-slate-50 touch-manipulation"
      : "inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-900/5 hover:border-slate-300 hover:bg-slate-50 sm:w-auto";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClass}
      >
        Report an issue
      </button>
      {open && (
        <ReportIssueModal
          jobId={jobId}
          reporterRole={reporterRole}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </>
  );
}
