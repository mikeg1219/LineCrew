"use client";

import {
  confirmVerificationCodeAction,
  resendVerificationEmailAction,
  type ConfirmVerificationCodeState,
  type ResendVerificationState,
} from "@/app/auth/verification-actions";
import { parseAuthIntent } from "@/lib/auth-intent";
import type { UserRole } from "@/lib/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4 sm:text-sm";

const labelClass = "mb-2 block text-sm font-medium text-slate-800";

const linkClass =
  "font-medium text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 rounded-sm";

const errorMessages: Record<string, string> = {
  invalid: "This link is invalid or was already used. Try a new code or resend.",
  expired:
    "This link has expired. Use Resend or enter the code from your latest email.",
  already_verified: "This account is already verified. You can sign in.",
};

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pending = searchParams.get("pending") === "1";
  const initialError = searchParams.get("error") ?? undefined;
  const intent = parseAuthIntent(searchParams.get("intent"));
  const role: UserRole = intent ?? "customer";

  const [email, setEmail] = useState("");
  const [resendState, resendAction, resendPending] = useActionState(
    resendVerificationEmailAction,
    null as ResendVerificationState
  );
  const [codeState, codeAction, codePending] = useActionState(
    confirmVerificationCodeAction,
    null as ConfirmVerificationCodeState
  );

  useEffect(() => {
    if (codeState && "success" in codeState && codeState.success) {
      const q = intent
        ? `?verified=1&intent=${encodeURIComponent(intent)}`
        : "?verified=1";
      router.replace(`/auth${q}`);
    }
  }, [codeState, router, intent]);

  const queryError =
    initialError && initialError in errorMessages
      ? errorMessages[initialError]
      : initialError
        ? "We could not complete verification. Try resend or enter your code below."
        : null;

  return (
    <div className="mt-6 space-y-8">
      {queryError && (
        <p className="rounded-lg border border-red-100 bg-red-50/80 px-3 py-2.5 text-sm text-red-700" role="alert">
          {queryError}
        </p>
      )}

      {pending && (
        <div className="rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-3 text-sm leading-relaxed text-slate-700 sm:px-4">
          <p className="font-medium text-slate-800">Verification required</p>
          <p className="mt-1.5 text-slate-600">
            Open the link in your email, or enter the 6-digit code below.
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Resend email</h2>
        <form
          action={resendAction}
          className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5"
        >
          <input type="hidden" name="role" value={role} />
          <p className="text-xs leading-relaxed text-slate-500">
            If you are signed in, you can leave email blank.
          </p>
          <div>
            <label htmlFor="resend-email" className={labelClass}>
              Email
            </label>
            <input
              id="resend-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          {resendState && "error" in resendState && (
            <p className="text-sm text-red-600" role="alert">
              {resendState.error}
            </p>
          )}
          {resendState && "success" in resendState && resendState.success && (
            <p className="text-sm text-slate-600">{resendState.message}</p>
          )}
          <button
            type="submit"
            disabled={resendPending}
            className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50 disabled:opacity-60 sm:py-2.5"
          >
            {resendPending ? "Sending…" : "Resend verification email"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Verify with code</h2>
        <form action={codeAction} className="space-y-4">
          <div>
            <label htmlFor="code-email" className={labelClass}>
              Email
            </label>
            <input
              id="code-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="code" className={labelClass}>
              6-digit code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              className={inputClass}
              placeholder="000000"
            />
          </div>
          {codeState && "error" in codeState && (
            <p className="text-sm text-red-600" role="alert">
              {codeState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={codePending}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 sm:py-2.5"
          >
            {codePending ? "Please wait…" : "Verify and continue"}
          </button>
        </form>
      </section>

      <p className="text-center text-sm text-slate-600">
        <Link
          href={
            intent ? `/auth?intent=${encodeURIComponent(intent)}` : "/auth"
          }
          className={linkClass}
        >
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
