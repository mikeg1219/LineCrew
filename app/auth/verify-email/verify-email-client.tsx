"use client";

import {
  confirmVerificationCodeAction,
  resendVerificationEmailAction,
  type ConfirmVerificationCodeState,
  type ResendVerificationState,
} from "@/app/auth/verification-actions";
import { parseAuthIntent } from "@/lib/auth-intent";
import type { UserRole } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

const inputClass =
  "w-full min-h-[44px] rounded-lg border border-slate-200 px-3 py-2.5 text-base text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4 sm:min-h-0 sm:text-sm touch-manipulation";

const labelClass = "mb-2 block text-sm font-medium text-slate-800";

const codeInputClass =
  "w-full min-h-[52px] rounded-lg border border-slate-200 px-3 py-3 text-center font-mono text-xl tracking-[0.25em] text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4 sm:min-h-[44px] sm:text-lg sm:tracking-[0.2em] touch-manipulation";

const linkClass =
  "font-medium text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 rounded-sm";

const errorMessages: Record<string, string> = {
  invalid:
    "This link is invalid or was already used. Try a new code or resend.",
  expired:
    "This link has expired. Use Resend or enter the code from your latest email.",
  already_verified: "This account is already verified. You can sign in.",
};

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const initialError = searchParams.get("error") ?? undefined;
  const sendFailed = searchParams.get("send_failed") === "1";
  const intent = parseAuthIntent(searchParams.get("intent"));
  const role: UserRole = intent ?? "customer";

  const [email, setEmail] = useState("");
  const [editEmail, setEditEmail] = useState(false);

  const [resendState, resendAction, resendPending] = useActionState(
    resendVerificationEmailAction,
    null as ResendVerificationState
  );
  const [codeState, codeAction, codePending] = useActionState(
    confirmVerificationCodeAction,
    null as ConfirmVerificationCodeState
  );

  useEffect(() => {
    const q = searchParams.get("email");
    if (q) {
      try {
        setEmail(decodeURIComponent(q));
      } catch {
        setEmail(q);
      }
      setEditEmail(false);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setEmail(user.email);
        setEditEmail(false);
      }
    });
  }, [searchParams, supabase]);

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

  const sendFailedMessage = sendFailed
    ? "We couldn't send the verification email just now. Use Resend below to try again."
    : null;

  const trimmed = email.trim();
  const lockedEmail = Boolean(trimmed) && !editEmail;

  return (
    <div className="mt-2 space-y-6 sm:mt-4 sm:space-y-7">
      <header className="space-y-3 text-pretty">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Verify your email
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          {trimmed ? (
            <>
              We sent a verification email to{" "}
              <span className="break-all font-medium text-slate-800 sm:break-normal">
                {trimmed}
              </span>
              . Open the link in that email, or enter the 6-digit code below.
            </>
          ) : (
            <>
              Enter the email you used to sign up, then resend or verify with
              your 6-digit code.
            </>
          )}
        </p>
      </header>

      {queryError && (
        <p
          className="rounded-lg border border-red-100 bg-red-50/80 px-3 py-3 text-sm leading-snug text-red-700 sm:py-2.5"
          role="alert"
        >
          {queryError}
        </p>
      )}

      {sendFailedMessage && (
        <p
          className="rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-3 text-sm leading-snug text-amber-900 sm:py-2.5"
          role="status"
        >
          {sendFailedMessage}
        </p>
      )}

      {lockedEmail && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/90 px-4 py-3.5 text-sm text-slate-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:py-3">
          <span className="min-w-0 break-all font-medium sm:truncate sm:break-normal">
            {trimmed}
          </span>
          <button
            type="button"
            onClick={() => setEditEmail(true)}
            className="-m-2 inline-flex min-h-[44px] shrink-0 items-center self-start rounded-md px-2 py-2 text-left text-sm font-medium text-blue-700 underline decoration-blue-700/30 underline-offset-2 hover:text-blue-800 sm:m-0 sm:self-auto"
          >
            Use a different email
          </button>
        </div>
      )}

      <div className="space-y-0">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Resend verification email
          </h2>
          <form
            action={resendAction}
            className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5"
          >
            <input type="hidden" name="role" value={role} />
            {lockedEmail ? (
              <input type="hidden" name="email" value={trimmed} />
            ) : (
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
                  required
                />
              </div>
            )}
            {resendState && "error" in resendState && (
              <p className="text-sm leading-snug text-red-600" role="alert">
                {resendState.error}
              </p>
            )}
            {resendState && "success" in resendState && resendState.success && (
              <p className="text-sm leading-snug text-slate-600">
                {resendState.message}
              </p>
            )}
            <button
              type="submit"
              disabled={resendPending || (!lockedEmail && !trimmed)}
              className="w-full min-h-[48px] rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50 active:bg-blue-50/80 disabled:opacity-60 sm:min-h-[44px] touch-manipulation"
            >
              {resendPending ? "Sending…" : "Resend verification email"}
            </button>
          </form>
        </section>

        <section
          className="mt-8 space-y-4 border-t border-slate-100 pt-8 sm:mt-9 sm:pt-9"
          aria-labelledby="verify-code-heading"
        >
          <h2
            id="verify-code-heading"
            className="text-sm font-semibold text-slate-900"
          >
            Enter verification code
          </h2>
          <form action={codeAction} className="space-y-4">
            {lockedEmail ? (
              <input type="hidden" name="email" value={trimmed} />
            ) : (
              <div>
                <label htmlFor="code-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="code-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="code" className={labelClass}>
                6-digit code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                className={codeInputClass}
                placeholder="000000"
                aria-describedby="code-hint"
              />
              <p id="code-hint" className="mt-2 text-xs leading-relaxed text-slate-500">
                From your latest verification email (check spam if needed).
              </p>
            </div>
            {codeState && "error" in codeState && (
              <p className="text-sm leading-snug text-red-600" role="alert">
                {codeState.error}
              </p>
            )}
            <button
              type="submit"
              disabled={codePending || !trimmed}
              className="w-full min-h-[48px] rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 sm:min-h-[44px] touch-manipulation"
            >
              {codePending ? "Please wait…" : "Verify and continue"}
            </button>
          </form>
        </section>
      </div>

      <p className="pt-1 text-center text-sm text-slate-600">
        <Link
          href={
            intent ? `/auth?intent=${encodeURIComponent(intent)}` : "/auth"
          }
          className={`${linkClass} inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 py-2 -mx-2 touch-manipulation`}
        >
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
