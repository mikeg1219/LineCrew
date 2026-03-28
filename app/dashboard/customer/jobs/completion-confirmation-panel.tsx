"use client";

import {
  confirmJobCompletionAction,
  disputeJobAction,
  type CustomerJobActionState,
} from "@/app/dashboard/customer/jobs/customer-job-actions";
import { useActionState, useEffect, useState } from "react";

const initial: CustomerJobActionState = null;

function msUntilDeadline(completedAtIso: string, windowMinutes: number) {
  const start = new Date(completedAtIso).getTime();
  const end = start + windowMinutes * 60 * 1000;
  return Math.max(0, end - Date.now());
}

export function CompletionConfirmationPanel({
  jobId,
  completedAt,
}: {
  jobId: string;
  completedAt: string;
}) {
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmJobCompletionAction,
    initial
  );
  const [disputeState, disputeAction, disputePending] = useActionState(
    disputeJobAction,
    initial
  );

  const [remainingMs, setRemainingMs] = useState(() =>
    msUntilDeadline(completedAt, 15)
  );

  useEffect(() => {
    const t = setInterval(() => {
      setRemainingMs(msUntilDeadline(completedAt, 15));
    }, 1000);
    return () => clearInterval(t);
  }, [completedAt]);

  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  const err = confirmState?.error ?? disputeState?.error;

  return (
    <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/80 p-6 shadow-sm ring-1 ring-violet-200/60">
      <p className="font-semibold text-violet-950">
        Your waiter marked this job complete. Please confirm or dispute within{" "}
        <span className="tabular-nums">
          {mins}:{secs.toString().padStart(2, "0")}
        </span>{" "}
        minutes or it will be auto-approved.
      </p>
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <form action={confirmAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <button
            type="submit"
            disabled={confirmPending || disputePending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {confirmPending ? "…" : "Confirm completion"}
          </button>
        </form>
        <form action={disputeAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <button
            type="submit"
            disabled={confirmPending || disputePending}
            className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-950 hover:bg-violet-100 disabled:opacity-60"
          >
            {disputePending ? "…" : "Dispute this job"}
          </button>
        </form>
      </div>
      <p className="mt-4 text-xs text-violet-900/80">
        If you dispute, payment stays on hold until an admin reviews (within 24
        hours).
      </p>
    </div>
  );
}
