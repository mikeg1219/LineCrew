"use client";

import { authAction, type AuthActionState } from "@/app/auth/actions";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useId, useState } from "react";

const initialAuthState: AuthActionState = null;

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-11 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4 sm:text-sm";

const labelClass = "mb-2 block text-sm font-medium text-slate-800";

const linkClass =
  "text-sm font-medium text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 rounded-sm";

export function AuthForm() {
  const [state, formAction, isPending] = useActionState(
    authAction,
    initialAuthState
  );
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();

  return (
    <div className="linecrew-card-marketing w-full max-w-md p-6 shadow-xl sm:p-8">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/linecrew-logo.png"
          alt="LineCrew.ai"
          width={200}
          height={60}
          className="h-10 w-auto"
          priority
        />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Sign in to your LineCrew account
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4 sm:text-sm"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor={passwordId} className="text-sm font-medium text-slate-800">
              Password
            </label>
            <Link href="/auth/reset-password" className={`${linkClass} shrink-0`}>
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={6}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {state && "error" in state && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="min-h-[48px] w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        New to LineCrew?{" "}
        <Link href="/onboarding" className={linkClass}>
          Create account
        </Link>
      </p>

      <p className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
        <Link href="/" className={linkClass}>
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
