"use client";

import {
  requestOverageAction,
  type RequestOverageState,
} from "@/app/dashboard/waiter/jobs/overage-actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

const initial: RequestOverageState = null;

export function RequestExtraTimeForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    requestOverageAction,
    initial
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="jobId" value={jobId} />
      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && "success" in state && state.success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Extra time request sent to customer
        </p>
      )}
      <FormSubmitButton
        pending={pending}
        loadingLabel="Sending…"
        disabled={
          pending ||
          Boolean(state && "success" in state && state.success === true)
        }
        className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
      >
        Request extra time (+30 min)
      </FormSubmitButton>
    </form>
  );
}
