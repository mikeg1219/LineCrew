"use client";

import {
  acceptJobAction,
  updateWaiterJobStatusAction,
  type JobActionState,
} from "@/app/dashboard/waiter/jobs/actions";
import { canTransitionTo } from "@/lib/job-status";
import type { JobStatus } from "@/lib/types/job";
import Link from "next/link";
import { useActionState } from "react";

const initial: JobActionState = null;

const STEPS: { nextStatus: JobStatus; label: string; hint?: string }[] = [
  {
    nextStatus: "at_airport",
    label: "Arrived at location",
    hint: "You’ve reached the airport / meeting point",
  },
  {
    nextStatus: "in_line",
    label: "In line now",
    hint: "You’re in the queue holding their place",
  },
  {
    nextStatus: "near_front",
    label: "Near the front",
    hint: "Almost time for the customer to step in",
  },
  {
    nextStatus: "pending_confirmation",
    label: "Complete booking",
    hint: "Ready for handoff — customer confirms on their phone",
  },
];

export function LineHolderStatusPanel({
  jobId,
  currentStatus,
  acceptSetupReady = true,
  acceptSetupHint = "",
}: {
  jobId: string;
  currentStatus: JobStatus;
  /** When false, Accept booking is disabled until setup (profile, payouts, etc.). */
  acceptSetupReady?: boolean;
  acceptSetupHint?: string;
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
    <div className="space-y-8">
      <span className="sr-only">
        Status update actions for this booking. Only the next step is active.
      </span>

      {currentStatus === "open" && (
        <form action={acceptAction} className="w-full">
          <input type="hidden" name="jobId" value={jobId} />
          {!acceptSetupReady && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-sm leading-snug text-amber-950">
              {acceptSetupHint || "Finish setup on your dashboard before accepting."}{" "}
              <Link
                href="/dashboard/waiter"
                className="font-semibold text-amber-900 underline decoration-amber-700/40 underline-offset-2 hover:text-amber-950"
              >
                Dashboard
              </Link>
              {" · "}
              <Link
                href="/dashboard/profile"
                className="font-semibold text-amber-900 underline decoration-amber-700/40 underline-offset-2 hover:text-amber-950"
              >
                Profile
              </Link>
            </p>
          )}
          <button
            type="submit"
            disabled={pending || !acceptSetupReady}
            className="w-full min-h-[52px] rounded-2xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
          >
            {acceptPending ? "Accepting…" : "Accept booking"}
          </button>
        </form>
      )}

      {currentStatus !== "open" && (
        <>
          {currentStatus === "near_front" && (
            <div className="mb-4 rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-3.5 shadow-sm ring-1 ring-amber-200/80">
              <p className="text-sm font-semibold text-amber-950">
                Near the front — time-sensitive
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
                Prepare to hand off position. When the traveler should step in, tap{" "}
                <span className="font-semibold">Complete booking</span> below.
              </p>
            </div>
          )}
          <ol className="flex list-none flex-col gap-2 sm:gap-2.5" aria-label="Progress steps">
          {STEPS.map(({ nextStatus, label, hint }, idx) => {
            const stepNum = idx + 1;
            const enabled = canTransitionTo(currentStatus, nextStatus);
            const handoffCompleteStep =
              enabled && nextStatus === "pending_confirmation";
            return (
              <li key={nextStatus} className="flex gap-3 sm:gap-4">
                <span
                  className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums sm:size-11 sm:text-sm ${
                    enabled
                      ? handoffCompleteStep
                        ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40"
                        : "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30"
                      : "border border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                  aria-hidden
                >
                  {stepNum}
                </span>
                <form action={updateAction} className="min-w-0 flex-1">
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="nextStatus" value={nextStatus} />
                  <button
                    type="submit"
                    disabled={!enabled || pending}
                    className={`flex w-full min-h-[56px] flex-col items-start justify-center rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 touch-manipulation sm:min-h-0 sm:py-3.5 ${
                      enabled
                        ? handoffCompleteStep
                          ? "border-amber-500 bg-amber-50/90 shadow-md ring-2 ring-amber-400/50 hover:bg-amber-50"
                          : "border-blue-500 bg-blue-50/60 shadow-sm ring-2 ring-blue-500/20 hover:bg-blue-50"
                        : "border-slate-200 bg-white ring-1 ring-slate-900/5 hover:border-slate-300 disabled:hover:border-slate-200"
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      {label}
                      {enabled && (
                        <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Next
                        </span>
                      )}
                    </span>
                    {hint && (
                      <span className="mt-1 text-xs leading-snug text-slate-500">
                        {hint}
                      </span>
                    )}
                  </button>
                </form>
              </li>
            );
          })}
        </ol>
        </>
      )}

      <div className="border-t border-slate-100 pt-6">
        <button
          type="button"
          disabled
          title="Reporting will be available in a future update"
          className="w-full min-h-[48px] max-w-full cursor-not-allowed rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-400 sm:max-w-lg touch-manipulation"
        >
          Report issue
          <span className="mt-0.5 block text-xs font-normal text-slate-400">
            Coming soon
          </span>
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
