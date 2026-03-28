"use client";

import {
  updateWaiterJobStatusAction,
  type JobActionState,
} from "@/app/dashboard/waiter/jobs/actions";
import type { JobStatus } from "@/lib/types/job";
import { useActionState } from "react";

const initial: JobActionState = null;

const BUTTONS: { label: string; nextStatus: JobStatus }[] = [
  { label: "I'm at the airport", nextStatus: "at_airport" },
  { label: "I'm in line", nextStatus: "in_line" },
  { label: "I'm near the front", nextStatus: "near_front" },
  { label: "Job complete", nextStatus: "completed" },
];

function isEnabled(current: JobStatus, next: JobStatus): boolean {
  const map: Partial<Record<JobStatus, JobStatus>> = {
    accepted: "at_airport",
    at_airport: "in_line",
    in_line: "near_front",
    near_front: "completed",
  };
  return map[current] === next;
}

export function WaiterProgressButtons({
  jobId,
  currentStatus,
}: {
  jobId: string;
  currentStatus: JobStatus;
}) {
  const [state, formAction, pending] = useActionState(
    updateWaiterJobStatusAction,
    initial
  );

  if (currentStatus === "completed" || currentStatus === "cancelled") {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Update status</h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {BUTTONS.map(({ label, nextStatus }) => {
          const enabled = isEnabled(currentStatus, nextStatus);
          return (
            <form key={nextStatus} action={formAction} className="flex-1 min-w-[140px]">
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="nextStatus" value={nextStatus} />
              <button
                type="submit"
                disabled={!enabled || pending}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
              >
                {label}
              </button>
            </form>
          );
        })}
      </div>
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </div>
  );
}
