"use client";

import {
  adminMarkFraudReviewedAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { useActionState } from "react";

const initial: AdminActionState = null;

export function FraudReviewActionButton({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState(adminMarkFraudReviewedAction, initial);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="jobId" value={jobId} />
      <input
        type="text"
        name="notes"
        placeholder="Optional review note"
        className="rounded border border-slate-300 px-2 py-1 text-xs"
      />
      <FormSubmitButton
        pending={pending}
        loadingLabel="Saving…"
        className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        Mark reviewed
      </FormSubmitButton>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
