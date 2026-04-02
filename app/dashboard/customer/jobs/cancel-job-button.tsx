"use client";

import {
  cancelJobAction,
  type CustomerJobActionState,
} from "@/app/dashboard/customer/jobs/customer-job-actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { useActionState, useState } from "react";

const initial: CustomerJobActionState = null;

export function CancelJobButton({ jobId }: { jobId: string }) {
  const [state, formAction, pending] = useActionState(cancelJobAction, initial);
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8 border-t border-slate-100 pt-8">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg text-sm font-medium text-red-700 underline-offset-2 hover:bg-red-50 hover:underline sm:inline sm:w-auto sm:justify-start"
        >
          Cancel booking
        </button>
      ) : (
        <form action={formAction} className="space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-4">
          <input type="hidden" name="jobId" value={jobId} />
          <label className="block text-sm text-slate-700">
            Reason (optional)
            <textarea
              name="reason"
              rows={2}
              className="mt-1 min-h-[44px] w-full rounded border border-slate-200 px-3 py-2.5 text-base"
              placeholder="Why are you cancelling?"
            />
          </label>
          {state?.error && (
            <p className="text-sm text-red-700">{state.error}</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <FormSubmitButton
              pending={pending}
              loadingLabel="Cancelling…"
              className="min-h-[44px] w-full rounded-lg bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-60 sm:w-auto"
            >
              Confirm cancel
            </FormSubmitButton>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[44px] w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-700 sm:w-auto"
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
