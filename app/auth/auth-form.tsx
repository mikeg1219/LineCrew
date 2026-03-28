"use client";

import { authAction, type AuthActionState } from "@/app/auth/actions";
import type { UserRole } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";

function parseIntent(value: string | null): UserRole | null {
  if (value === "customer" || value === "waiter") return value;
  return null;
}

const initialAuthState: AuthActionState = null;

export function AuthForm() {
  const searchParams = useSearchParams();
  const intent = parseIntent(searchParams.get("intent"));

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<UserRole>(intent ?? "customer");

  const [state, formAction, isPending] = useActionState(
    authAction,
    initialAuthState
  );

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome to LineCrew
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in or create an account to continue.
        </p>
      </div>

      <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
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
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Sign up
        </button>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="mode" value={mode === "signup" ? "signup" : "signin"} />

        {mode === "signup" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-800">
              I am a
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-3 text-sm font-medium transition-colors ${
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
                className={`flex cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-3 text-sm font-medium transition-colors ${
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
            <p className="text-xs text-slate-500">
              Customers post airport line jobs. Waiters hold spots for them.
            </p>
          </fieldset>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-slate-800"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-slate-800"
          >
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
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4"
          />
        </div>

        {state && "error" in state && state.mode === mode && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        {state && "message" in state && state.mode === mode && (
          <p className="text-sm text-slate-600">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/" className="font-medium text-blue-700 hover:text-blue-800">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
