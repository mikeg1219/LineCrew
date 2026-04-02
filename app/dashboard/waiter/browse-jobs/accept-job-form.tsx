"use client";

import { acceptJobAction, type JobActionState } from "@/app/dashboard/waiter/jobs/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
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
      <FormSubmitButton
        pending={pending}
        loadingLabel="Accepting…"
        title={
          blockedByGate2
            ? "Complete your profile to accept bookings"
            : undefined
        }
        disabled={disabled}
        className={`w-full min-h-[52px] rounded-xl px-4 py-3.5 text-base font-bold shadow-md transition touch-manipulation active:scale-[0.99] ${
          disabled
            ? blockedByGate2
              ? "cursor-not-allowed bg-slate-300 text-slate-600"
              : "bg-blue-600 text-white opacity-60"
            : "bg-blue-600 text-white shadow-blue-600/25 hover:bg-blue-700"
        }`}
      >
        Accept booking
      </FormSubmitButton>
    </form>
  );
}
