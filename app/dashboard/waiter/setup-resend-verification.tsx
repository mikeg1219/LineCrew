"use client";

import {
  resendVerificationEmailAction,
  type ResendVerificationState,
} from "@/app/auth/verification-actions";
import { useActionState } from "react";

export function SetupResendVerificationEmail() {
  const [state, action, pending] = useActionState(
    resendVerificationEmailAction,
    null as ResendVerificationState
  );

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <input type="hidden" name="role" value="waiter" />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Sending…" : "Resend verification email"}
      </button>
      {state && "error" in state ? (
        <span className="text-sm text-red-600">{state.error}</span>
      ) : null}
      {state && "success" in state && state.success ? (
        <span className="text-sm text-emerald-800">{state.message}</span>
      ) : null}
    </form>
  );
}
