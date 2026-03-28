"use client";

import {
  approveOverageAction,
  declineOverageAction,
  type OverageDecisionState,
} from "@/app/dashboard/customer/jobs/overage-actions";
import { useActionState, useEffect, useState } from "react";

const initial: OverageDecisionState = null;

const OVERAGE_WINDOW_MIN = 20;

function msUntilOverageDeadline(createdAtIso: string) {
  const start = new Date(createdAtIso).getTime();
  const end = start + OVERAGE_WINDOW_MIN * 60 * 1000;
  return Math.max(0, end - Date.now());
}

export function OverageCustomerAlert({
  jobId,
  requestId,
  amount,
  createdAt,
}: {
  jobId: string;
  requestId: string;
  amount: number;
  createdAt: string;
}) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveOverageAction,
    initial
  );
  const [declineState, declineAction, declinePending] = useActionState(
    declineOverageAction,
    initial
  );

  const [remainingMs, setRemainingMs] = useState(() =>
    msUntilOverageDeadline(createdAt)
  );

  useEffect(() => {
    const t = setInterval(() => {
      setRemainingMs(msUntilOverageDeadline(createdAt));
    }, 1000);
    return () => clearInterval(t);
  }, [createdAt]);

  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);

  const err = approveState?.error ?? declineState?.error;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm ring-1 ring-amber-200/80">
      <p className="font-semibold text-amber-950">
        Your waiter needs more time — approve an extra 30 minutes for $
        {amount.toFixed(2)}?
      </p>
      <p className="mt-2 text-sm text-amber-900/90">
        Approve or decline within{" "}
        <span className="font-semibold tabular-nums">
          {mins}:{secs.toString().padStart(2, "0")}
        </span>{" "}
        or it will be auto-approved. This matches the extra time rate you
        agreed to when posting the job.
      </p>
      {err && (
        <p className="mt-3 text-sm text-red-700">{err}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <form action={approveAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="requestId" value={requestId} />
          <button
            type="submit"
            disabled={approvePending || declinePending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {approvePending ? "…" : "Approve"}
          </button>
        </form>
        <form action={declineAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="requestId" value={requestId} />
          <button
            type="submit"
            disabled={approvePending || declinePending}
            className="rounded-lg border border-amber-800/30 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
          >
            {declinePending ? "…" : "Decline"}
          </button>
        </form>
      </div>
    </div>
  );
}
