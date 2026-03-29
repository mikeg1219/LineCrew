"use client";

import { authAction, type AuthActionState } from "@/app/auth/actions";
import { parseAuthIntent } from "@/lib/auth-intent";
import type { UserRole } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";

const initialAuthState: AuthActionState = null;

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4 sm:text-sm";

const labelClass = "mb-2 block text-sm font-medium text-slate-800";

const intentGridClass =
  "mx-auto grid w-full gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-12 xl:gap-16";

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
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-3.5 text-center text-xs leading-relaxed text-slate-600";

type AuthFormProps = {
  /** From server `searchParams` — keeps first paint aligned with URL for hydration */
  initialIntent: UserRole | null;
};

export function AuthForm({ initialIntent }: AuthFormProps) {
  const searchParams = useSearchParams();
  const intent =
    parseAuthIntent(searchParams.get("intent")) ?? initialIntent;

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<UserRole>(() => initialIntent ?? "customer");

  const [state, formAction, isPending] = useActionState(
    authAction,
    initialAuthState
  );

  const isCustomerIntent = intent === "customer";
  const isWaiterIntent = intent === "waiter";
  const hasIntentLayout = isCustomerIntent || isWaiterIntent;

  const submitLabel = (() => {
    if (isPending) return "Please wait…";
    if (isCustomerIntent) {
      return mode === "signup" ? "Create account & continue" : "Continue to booking";
    }
    if (isWaiterIntent) {
      return mode === "signup"
        ? "Create account & continue"
        : "Continue to waiter dashboard";
    }
    return mode === "signup" ? "Create account" : "Sign in";
  })();

  return (
    <div
      className={
        hasIntentLayout ? intentGridClass : "mx-auto w-full max-w-md"
      }
    >
      {isCustomerIntent && (
        <div className={intentHeroClass}>
          <div className={heroBadgeClass}>Booking as: Customer</div>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl sm:leading-tight">
            Continue to book your line holder
          </h1>
          <p className="mt-4 w-full max-w-xl text-base leading-relaxed text-white/85 lg:mx-0">
            Sign in or create an account to post your request and get matched with
            a waiter in minutes.
          </p>

          <ul className="mt-8 flex w-full max-w-xl flex-col gap-3 text-left text-sm text-white/90 lg:mx-0 lg:items-start">
            <li className="flex w-full items-start gap-2.5 sm:min-h-[1.375rem] sm:items-center">
              <span className="mt-0.5 shrink-0 text-emerald-400 sm:mt-0" aria-hidden>
                ✔
              </span>
              <span className="min-w-0 flex-1 leading-snug">Verified waiters</span>
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

          <p className={heroHighlightClass}>
            Most customer requests are accepted in 3–10 minutes
          </p>

          <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/75 lg:mx-0">
            You&apos;ll create your request after this step — airport, line type,
            and timing. No payment is required yet.
          </p>
        </div>
      )}

      {isWaiterIntent && (
        <div className={intentHeroClass}>
          <div className={heroBadgeClass}>Signing in as: Waiter</div>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl sm:leading-tight">
            Continue to become a LineCrew waiter
          </h1>
          <p className="mt-4 w-full max-w-xl text-base leading-relaxed text-white/85 lg:mx-0">
            Sign in or create an account to accept jobs, earn by waiting in line,
            and get notified when customers need help nearby.
          </p>

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
              <span className="min-w-0 flex-1 leading-snug">Nearby airport job alerts</span>
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

          <p className={heroHighlightClass}>
            New jobs can appear throughout the day based on airport demand
          </p>

          <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/75 lg:mx-0">
            After you continue, you&apos;ll complete your waiter setup and be ready
            to accept jobs when customers need line help.
          </p>
        </div>
      )}

      <div className={hasIntentLayout ? intentCardColClass : "w-full min-w-0"}>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
          {hasIntentLayout && (
            <div className="mb-6 flex justify-center sm:justify-start">
              <span className={cardBadgeClass}>
                {isCustomerIntent ? "Customer access" : "Waiter access"}
              </span>
            </div>
          )}

          <div className="mb-7 text-center sm:mb-8 sm:text-left">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {hasIntentLayout
                ? "Sign in or create account"
                : "Welcome to LineCrew"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {isCustomerIntent &&
                "Takes less than 30 seconds. Continue to booking when you're ready."}
              {isWaiterIntent &&
                "Takes less than 30 seconds. Continue to waiter setup when you're ready."}
              {!hasIntentLayout && "Sign in or create an account to continue."}
            </p>
          </div>

          <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors sm:py-2 ${
                mode === "signin"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors sm:py-2 ${
                mode === "signup"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign up
            </button>
          </div>

          <form action={formAction} className="space-y-5">
            <input
              type="hidden"
              name="mode"
              value={mode === "signup" ? "signup" : "signin"}
            />

            {mode === "signup" && (
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-slate-800">
                  I am a
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex min-h-[3rem] cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-3 text-sm font-medium transition-colors ${
                      role === "customer"
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="customer"
                      checked={role === "customer"}
                      onChange={() => setRole("customer")}
                      className="sr-only"
                    />
                    Customer
                  </label>
                  <label
                    className={`flex min-h-[3rem] cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-3 text-sm font-medium transition-colors ${
                      role === "waiter"
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="waiter"
                      checked={role === "waiter"}
                      onChange={() => setRole("waiter")}
                      className="sr-only"
                    />
                    Waiter
                  </label>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  Customers post airport line jobs. Waiters hold spots for them.
                </p>
              </fieldset>
            )}

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
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
                minLength={6}
                className={inputClass}
              />
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              Already have an account? Sign in to continue. New to LineCrew?
              Switch to Sign up to create your account.
            </p>

            {state && "error" in state && state.mode === mode && (
              <p className="text-sm text-red-600" role="alert">
                {state.error}
              </p>
            )}

            {state && "message" in state && state.mode === mode && (
              <p className="text-sm text-slate-600">{state.message}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 sm:py-2.5"
            >
              {submitLabel}
            </button>

            {isCustomerIntent && (
              <div className={postAuthBoxClass}>
                After you continue, you&apos;ll post your request and review
                pricing before checkout.
              </div>
            )}
            {isWaiterIntent && (
              <div className={postAuthBoxClass}>
                After you continue, you&apos;ll finish setup and review available
                jobs before accepting work.
              </div>
            )}
          </form>

          <p className="mt-7 text-center text-sm text-slate-600 sm:mt-8">
            <Link
              href="/"
              className="font-medium text-blue-700 transition hover:text-blue-800"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
