"use client";

import {
  acceptJobAction,
  updateWaiterJobStatusAction,
  type JobActionState,
} from "@/app/dashboard/waiter/jobs/actions";
import { canTransitionTo } from "@/lib/job-status";
import type { JobStatus } from "@/lib/types/job";
import { useActionState } from "react";

const initial: JobActionState = null;

const STEPS: { nextStatus: JobStatus; label: string; hint?: string }[] = [
  { nextStatus: "at_airport", label: "Arrived", hint: "You’re at the airport" },
  { nextStatus: "in_line", label: "In line now", hint: "You’re in the queue" },
  { nextStatus: "near_front", label: "Near the front", hint: "Approaching handoff" },
  {
    nextStatus: "pending_confirmation",
    label: "Complete",
    hint: "Ready for handoff — customer confirms next",
  },
];

export function LineHolderStatusPanel({
  jobId,
  currentStatus,
}: {
  jobId: string;
  currentStatus: JobStatus;
}) {
  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptJobAction,
    initial
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateWaiterJobStatusAction,
    initial
  );

  const pending = acceptPending || updatePending;
  const err = acceptState?.error ?? updateState?.error;

  if (
    currentStatus === "completed" ||
    currentStatus === "cancelled" ||
    currentStatus === "disputed" ||
    currentStatus === "refunded"
  ) {
    return null;
  }

  if (currentStatus === "pending_confirmation") {
    return null;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Status control</h2>
        <p className="mt-1 text-sm text-slate-600">
          Advance one step at a time. The customer sees updates on their tracking
          page.
        </p>
      </div>

      {currentStatus === "open" && (
        <form action={acceptAction} className="max-w-md">
          <input type="hidden" name="jobId" value={jobId} />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {acceptPending ? "Accepting…" : "Accept booking"}
          </button>
        </form>
      )}

      {currentStatus !== "open" && (
        <div className="flex flex-col gap-3">
          {STEPS.map(({ nextStatus, label, hint }) => {
            const enabled = canTransitionTo(currentStatus, nextStatus);
            return (
              <form key={nextStatus} action={updateAction} className="max-w-md">
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="nextStatus" value={nextStatus} />
                <button
                  type="submit"
                  disabled={!enabled || pending}
                  className="flex w-full flex-col items-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/80 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white"
                >
                  <span className="text-sm font-semibold text-slate-900">
                    {label}
                  </span>
                  {hint && (
                    <span className="mt-0.5 text-xs text-slate-500">{hint}</span>
                  )}
                </button>
              </form>
            );
          })}
        </div>
      )}

      <div className="border-t border-slate-100 pt-5">
        <button
          type="button"
          disabled
          title="Reporting will be available in a future update"
          className="w-full max-w-md cursor-not-allowed rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-400"
        >
          Report issue
        </button>
      </div>

      {err && (
        <p className="text-sm text-red-600" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
