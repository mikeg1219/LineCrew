"use client";

import { authAction, type AuthActionState } from "@/app/auth/actions";
import {
  requestPasswordResetAction,
  type ResetPasswordState,
} from "@/app/auth/reset-actions";
import { parseAuthIntent } from "@/lib/auth-intent";
import type { UserRole } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";

const initialAuthState: AuthActionState = null;

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4 sm:text-sm";

const labelClass = "mb-2 block text-sm font-medium text-slate-800";

const intentGridClass =
  "mx-auto grid w-full gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-12 xl:gap-16";

const intentHeroClass =
  "order-1 flex w-full min-w-0 flex-col items-center text-center lg:max-w-xl lg:items-start lg:pt-2 lg:text-left xl:max-w-lg";

const intentCardColClass =
  "order-2 w-full min-w-0 lg:sticky lg:top-8 lg:justify-self-end lg:max-w-md";

const heroBadgeClass =
  "mb-4 inline-flex max-w-full rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/95 backdrop-blur-sm sm:text-xs";

const heroHighlightClass =
  "mt-6 w-full max-w-xl rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-center text-sm font-medium leading-snug text-white/95 backdrop-blur-sm sm:px-5 lg:max-w-none lg:text-left";

const cardBadgeClass =
  "rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-100";

const postAuthBoxClass =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-3.5 text-center text-xs leading-relaxed text-slate-600 sm:px-4";

const linkTextClass =
  "font-medium text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 rounded-sm";

function accessBadgeText(intent: UserRole | null): string {
  if (intent === "customer") return "Sign in · Customer";
  if (intent === "waiter") return "Sign in · Line Holder";
  return "Sign in";
}

function heroHeadline(intent: UserRole | null): string {
  if (intent === "customer") return "Book a Line Holder";
  if (intent === "waiter") return "Become a Line Holder";
  return "Welcome to LineCrew";
}

function heroSubtext(intent: UserRole | null, hasIntentLayout: boolean): string {
  if (!hasIntentLayout) return "";
  if (intent === "customer") {
    return "Sign in to post a request and get matched with a Line Holder—often within minutes.";
  }
  if (intent === "waiter") {
    return "Sign in to see open bookings, accept work, and get notified when travelers need line help.";
  }
  return "";
}

function cardTitle(hasIntentLayout: boolean): string {
  if (!hasIntentLayout) return "Welcome back";
  return "Sign in";
}

function cardSubtitle(
  hasIntentLayout: boolean,
  isCustomerIntent: boolean,
  isWaiterIntent: boolean
): string {
  if (!hasIntentLayout) {
    return "Use the email and password for your LineCrew account.";
  }
  if (isCustomerIntent) {
    return "Sign in to continue to booking.";
  }
  if (isWaiterIntent) {
    return "Sign in to continue to Line Holder setup.";
  }
  return "Use the email and password for your LineCrew account.";
}

function recoveryContextBadge(intent: UserRole | null): string {
  if (intent === "customer") return "Reset password · Customer";
  if (intent === "waiter") return "Reset password · Line Holder";
  return "Reset password";
}

type AuthFormProps = {
  initialIntent: UserRole | null;
};

type ForgotPasswordFormSectionProps = {
  intent: UserRole | null;
  initialEmail: string;
  onBack: () => void;
  onSent: (email: string) => void;
};

function ForgotPasswordFormSection({
  intent,
  initialEmail,
  onBack,
  onSent,
}: ForgotPasswordFormSectionProps) {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    null as ResetPasswordState
  );
  const [email, setEmail] = useState(initialEmail);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      onSent(email);
    }
  }, [state, email, onSent]);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Reset your password
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Enter your email. We&apos;ll send a secure link and a one-time code you
          can use if the link doesn&apos;t open.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="intent" value={intent ?? ""} />
        <div>
          <label htmlFor="recovery-email" className={labelClass}>
            Email
          </label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          {isPending ? "Please wait…" : "Send reset email"}
        </button>
      </form>

      <p className="text-center text-sm sm:text-left">
        <button type="button" onClick={onBack} className={linkTextClass}>
          ← Back to sign in
        </button>
      </p>
    </div>
  );
}

type ForgotPasswordSuccessSectionProps = {
  email: string;
  intent: UserRole | null;
  onBackToSignIn: () => void;
};

function ForgotPasswordSuccessSection({
  email,
  intent,
  onBackToSignIn,
}: ForgotPasswordSuccessSectionProps) {
  const [state, resendAction, resendPending] = useActionState(
    requestPasswordResetAction,
    null as ResetPasswordState
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Check your email
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          If an account exists for that address, we&apos;ve sent reset
          instructions. Use the link or the 6-digit code from the email.
        </p>
        <p className="text-xs leading-relaxed text-slate-500">
          No email yet? Check spam or promotions, then try Resend in a few
          minutes.
        </p>
      </div>

      <form action={resendAction} className="space-y-3">
        <input type="hidden" name="email" defaultValue={email} />
        <input type="hidden" name="intent" defaultValue={intent ?? ""} />
        {state && "error" in state && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state && "success" in state && state.success && (
          <p className="text-sm text-slate-600">{state.message}</p>
        )}
        <button
          type="submit"
          disabled={resendPending}
          className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50 disabled:opacity-60 sm:py-2.5"
        >
          {resendPending ? "Sending…" : "Resend reset email"}
        </button>
      </form>

      <p className="text-center text-sm sm:text-left">
        <button
          type="button"
          onClick={onBackToSignIn}
          className={linkTextClass}
        >
          ← Back to sign in
        </button>
      </p>
    </div>
  );
}

export function AuthForm({ initialIntent }: AuthFormProps) {
  const searchParams = useSearchParams();
  const intent =
    parseAuthIntent(searchParams.get("intent")) ?? initialIntent;

  const [authPanel, setAuthPanel] = useState<
    "main" | "forgot" | "forgot-sent"
  >("main");
  const [recoveryEmail, setRecoveryEmail] = useState("");

  const handleRecoverySent = useCallback((email: string) => {
    setRecoveryEmail(email);
    setAuthPanel("forgot-sent");
  }, []);

  const handleBackToSignIn = useCallback(() => {
    setAuthPanel("main");
  }, []);

  const [state, formAction, isPending] = useActionState(
    authAction,
    initialAuthState
  );

  const isCustomerIntent = intent === "customer";
  const isWaiterIntent = intent === "waiter";
  const hasIntentLayout = isCustomerIntent || isWaiterIntent;

  const heroAudience: "customer" | "waiter" = isCustomerIntent
    ? "customer"
    : "waiter";

  const badgeLabel =
    authPanel === "forgot" || authPanel === "forgot-sent"
      ? recoveryContextBadge(intent)
      : accessBadgeText(intent);
  const displayBadge = badgeLabel;
  const heroH1 = heroHeadline(intent);
  const heroP = heroSubtext(intent, hasIntentLayout);

  const submitLabel = (() => {
    if (isPending) return "Please wait…";
    if (isCustomerIntent) return "Continue to booking";
    if (isWaiterIntent) return "Continue to Line Holder dashboard";
    return "Sign in";
  })();

  return (
    <div
      className={
        hasIntentLayout ? intentGridClass : "mx-auto w-full max-w-md"
      }
    >
      {hasIntentLayout && (
        <div className={intentHeroClass}>
          <div className={heroBadgeClass}>{displayBadge}</div>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl sm:leading-tight">
            {heroH1}
          </h1>
          <p className="mt-4 w-full max-w-xl text-base leading-relaxed text-white/85 lg:mx-0">
            {heroP}
          </p>

          {heroAudience === "customer" ? (
            <ul className="mt-8 flex w-full max-w-xl flex-col gap-3 text-left text-sm text-white/90 lg:mx-0 lg:items-start">
              <li className="flex w-full items-start gap-2.5 sm:min-h-[1.375rem] sm:items-center">
                <span className="mt-0.5 shrink-0 text-emerald-400 sm:mt-0" aria-hidden>
                  ✔
                </span>
                <span className="min-w-0 flex-1 leading-snug">Verified Line Holders</span>
              </li>
              <li className="flex w-full items-start gap-2.5 sm:min-h-[1.375rem] sm:items-center">
                <span className="mt-0.5 shrink-0 text-emerald-400 sm:mt-0" aria-hidden>
                  ✔
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  Secure payment held until completion
                </span>
              </li>
              <li className="flex w-full items-start gap-2.5 sm:min-h-[1.375rem] sm:items-center">
                <span className="mt-0.5 shrink-0 text-emerald-400 sm:mt-0" aria-hidden>
                  ✔
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  Free cancellation before acceptance
                </span>
              </li>
            </ul>
          ) : (
            <ul className="mt-8 flex w-full max-w-xl flex-col gap-3 text-left text-sm text-white/90 lg:mx-0 lg:items-start">
              <li className="flex w-full items-start gap-2.5 sm:min-h-[1.375rem] sm:items-center">
                <span className="mt-0.5 shrink-0 text-emerald-400 sm:mt-0" aria-hidden>
                  ✔
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  Flexible earning opportunities
                </span>
              </li>
              <li className="flex w-full items-start gap-2.5 sm:min-h-[1.375rem] sm:items-center">
                <span className="mt-0.5 shrink-0 text-emerald-400 sm:mt-0" aria-hidden>
                  ✔
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  Nearby booking alerts
                </span>
              </li>
              <li className="flex w-full items-start gap-2.5 sm:min-h-[1.375rem] sm:items-center">
                <span className="mt-0.5 shrink-0 text-emerald-400 sm:mt-0" aria-hidden>
                  ✔
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  Secure payouts through LineCrew
                </span>
              </li>
            </ul>
          )}

          {heroAudience === "customer" ? (
            <p className={heroHighlightClass}>
              Many requests get a match in 3–10 minutes
            </p>
          ) : (
            <p className={heroHighlightClass}>
              Booking volume follows airport demand through the day
            </p>
          )}

          <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/75 lg:mx-0">
            {heroAudience === "customer"
              ? "Next you\u2019ll add airport, line type, and timing. You won\u2019t pay until you review pricing."
              : "Next you\u2019ll finish Line Holder setup so you can accept bookings when travelers need help."}
          </p>
        </div>
      )}

      <div className={hasIntentLayout ? intentCardColClass : "w-full min-w-0"}>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-5 flex justify-center sm:mb-6 sm:justify-start">
            <span className={`${cardBadgeClass} max-w-[min(100%,20rem)] text-center leading-snug`}>
              {displayBadge}
            </span>
          </div>

          {authPanel === "main" && (
            <>
          <div className="mb-6 space-y-2 text-center sm:mb-7 sm:text-left">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {cardTitle(hasIntentLayout)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {cardSubtitle(hasIntentLayout, isCustomerIntent, isWaiterIntent)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Encrypted sign-in. Same account works for customers and Line Holders.
            </p>
          </div>

          <form action={formAction} className="space-y-5">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-800"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setAuthPanel("forgot")}
                  className={`${linkTextClass} text-sm`}
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
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
              {submitLabel}
            </button>

            {isCustomerIntent && (
              <div className={postAuthBoxClass}>
                After sign-in: post your request, then review price before you
                pay.
              </div>
            )}
            {isWaiterIntent && (
              <div className={postAuthBoxClass}>
                After sign-in: finish setup, then browse and accept bookings you
                want.
              </div>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 sm:text-left">
            New here?{" "}
            <Link href="/onboarding" className={linkTextClass}>
              Create account
            </Link>
          </p>
            </>
          )}

          {authPanel === "forgot" && (
            <ForgotPasswordFormSection
              intent={intent}
              initialEmail={recoveryEmail}
              onBack={handleBackToSignIn}
              onSent={handleRecoverySent}
            />
          )}

          {authPanel === "forgot-sent" && recoveryEmail && (
            <ForgotPasswordSuccessSection
              email={recoveryEmail}
              intent={intent}
              onBackToSignIn={handleBackToSignIn}
            />
          )}

          <div className="mt-8 border-t border-slate-100 pt-6 sm:mt-9">
            <p className="text-center text-sm text-slate-600">
              <Link href="/" className={linkTextClass}>
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
