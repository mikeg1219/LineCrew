"use client";

import {
  cancelJobAction,
  type CustomerJobActionState,
} from "@/app/dashboard/customer/jobs/customer-job-actions";
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
          className="text-sm font-medium text-red-700 underline-offset-2 hover:underline"
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
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              placeholder="Why are you cancelling?"
            />
          </label>
          {state?.error && (
            <p className="text-sm text-red-700">{state.error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? "Cancelling…" : "Confirm cancel"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
