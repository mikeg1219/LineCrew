"use client";

import {
  confirmJobCompletionAction,
  disputeJobAction,
  type CustomerJobActionState,
} from "@/app/dashboard/customer/jobs/customer-job-actions";
import { FormSubmitButton } from "@/components/form-submit-button";
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
    <div className="rounded-2xl border-2 border-violet-300/80 bg-violet-50/90 p-5 shadow-md ring-2 ring-violet-200/50 sm:p-7">
      <p className="text-base font-semibold leading-snug text-violet-950 sm:text-lg">
        Your Line Holder marked this booking ready for handoff. Confirm or dispute within{" "}
        <span className="tabular-nums">
          {mins}:{secs.toString().padStart(2, "0")}
        </span>{" "}
        or it auto-completes per policy.
      </p>
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
        <form action={confirmAction} className="w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-md">
          <input type="hidden" name="jobId" value={jobId} />
          <FormSubmitButton
            pending={confirmPending}
            disabled={confirmPending || disputePending}
            loadingLabel="Confirming…"
            className="w-full min-h-[52px] touch-manipulation rounded-2xl bg-emerald-600 px-5 py-3.5 text-base font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60 active:scale-[0.99]"
          >
            Confirm handoff
          </FormSubmitButton>
        </form>
        <form action={disputeAction} className="w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-md">
          <input type="hidden" name="jobId" value={jobId} />
          <FormSubmitButton
            pending={disputePending}
            disabled={confirmPending || disputePending}
            loadingLabel="Submitting…"
            className="w-full min-h-[52px] touch-manipulation rounded-2xl border-2 border-violet-300 bg-white px-5 py-3.5 text-base font-semibold text-violet-950 hover:bg-violet-100 disabled:opacity-60 active:scale-[0.99]"
          >
            Dispute
          </FormSubmitButton>
        </form>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-violet-900/80">
        Disputes hold payment until an admin reviews (within 24 hours).
      </p>
    </div>
  );
}
