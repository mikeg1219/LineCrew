"use client";

import { acceptJobAction, type JobActionState } from "@/app/dashboard/waiter/jobs/actions";
import { useActionState } from "react";

const initial: JobActionState = null;

export function AcceptJobForm({
  jobId,
  gate2Unlocked,
  canAccept,
  setupHint,
}: {
  jobId: string;
  gate2Unlocked: boolean;
  canAccept: boolean;
  setupHint?: string;
}) {
  const [state, formAction, pending] = useActionState(acceptJobAction, initial);

  const blockedByGate2 = !gate2Unlocked;
  const disabled = pending || blockedByGate2 || !canAccept;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="jobId" value={jobId} />
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {blockedByGate2 ? null : !canAccept && setupHint ? (
        <p className="text-xs leading-snug text-amber-900/90">{setupHint}</p>
      ) : null}
      <button
        type="submit"
        title={
          blockedByGate2
            ? "Complete your profile to accept bookings"
            : undefined
        }
        disabled={disabled}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
          disabled
            ? blockedByGate2
              ? "cursor-not-allowed bg-slate-300 text-slate-600"
              : "bg-blue-600 text-white opacity-60"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {pending ? "Accepting…" : "Accept booking"}
      </button>
    </form>
  );
}
