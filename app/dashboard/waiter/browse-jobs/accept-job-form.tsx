"use client";

import { acceptJobAction, type JobActionState } from "@/app/dashboard/waiter/jobs/actions";
import { useActionState } from "react";

const initial: JobActionState = null;

export function AcceptJobForm({
  jobId,
  canAccept,
}: {
  jobId: string;
  canAccept: boolean;
}) {
  const [state, formAction, pending] = useActionState(acceptJobAction, initial);

  return (
    <form action={formAction} className="mt-4 space-y-2">
      <input type="hidden" name="jobId" value={jobId} />
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending || !canAccept}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Accepting…" : "Accept job"}
      </button>
    </form>
  );
}
