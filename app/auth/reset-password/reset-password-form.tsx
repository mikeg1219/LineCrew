"use client";

import { completePasswordResetAction } from "@/app/auth/reset-actions";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4 sm:text-sm";

const labelClass = "mb-2 block text-sm font-medium text-slate-800";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const intent = searchParams.get("intent") ?? "";

  const [state, formAction, isPending] = useActionState(
    completePasswordResetAction,
    null
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      const q = intent ? `?intent=${encodeURIComponent(intent)}` : "";
      router.replace(`/auth${q}`);
    }
  }, [state, router, intent]);

  const hasToken = Boolean(token);

  return (
    <form action={formAction} className="mt-6 space-y-5 sm:space-y-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="intent" value={intent} />

      {!hasToken && (
        <>
          <p className="text-xs leading-relaxed text-slate-500">
            Enter the email from your account and the code from the same email.
          </p>
          <div>
            <label htmlFor="reset-email" className={labelClass}>
              Email
            </label>
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="reset-code" className={labelClass}>
              Verification code
            </label>
            <input
              id="reset-code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              className={inputClass}
              placeholder="6-digit code"
            />
          </div>
        </>
      )}

      <div>
        <label htmlFor="new-password" className={labelClass}>
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="confirm-new-password" className={labelClass}>
          Confirm password
        </label>
        <input
          id="confirm-new-password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={inputClass}
        />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 sm:py-2.5"
      >
        {isPending ? "Please wait…" : "Save new password"}
      </button>
    </form>
  );
}
