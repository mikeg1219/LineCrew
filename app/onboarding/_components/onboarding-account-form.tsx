"use client";

import {
  onboardingAccountAction,
  type OnboardingAccountState,
} from "@/app/onboarding/actions";
import type { UserRole } from "@/lib/types";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4";

export function OnboardingAccountForm({ role }: { role: UserRole }) {
  const [passwordDraft, setPasswordDraft] = useState("");
  const [state, formAction, pending] = useActionState(
    onboardingAccountAction,
    null as OnboardingAccountState
  );

  const strength = useMemo(() => {
    const p = passwordDraft;
    if (!p) return "";
    let score = 0;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1;
    if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) score += 1;
    if (score <= 1) return "weak";
    if (score === 2) return "fair";
    return "strong";
  }, [passwordDraft]);

  useEffect(() => {
    try {
      sessionStorage.setItem("linecrew_role_intent", role);
    } catch {
      // Ignore browser storage errors.
    }
  }, [role]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-800">
          Email address
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
        {state?.fieldErrors?.email ? (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email}</p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-slate-800"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          value={passwordDraft}
          onChange={(e) => setPasswordDraft(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-500">Minimum 8 characters.</p>
        {strength ? (
          <p
            className={`mt-1 text-xs ${
              strength === "strong"
                ? "text-emerald-700"
                : strength === "fair"
                  ? "text-amber-700"
                  : "text-red-600"
            }`}
          >
            Password strength: {strength}
          </p>
        ) : null}
        {state?.fieldErrors?.password ? (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.password}</p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="confirm_password"
          className="mb-1.5 block text-sm font-medium text-slate-800"
        >
          Confirm password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          minLength={8}
          required
          className={inputClass}
        />
        {state?.fieldErrors?.confirm_password ? (
          <p className="mt-1 text-xs text-red-600">
            {state.fieldErrors.confirm_password}
          </p>
        ) : null}
      </div>
      {state?.formError ? (
        <p className="text-sm text-red-600" role="alert">
          {state.formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create account ->"}
      </button>
      <p className="text-center text-sm text-slate-600">
        <Link href="/onboarding" className="font-medium text-blue-700 hover:text-blue-800">
          Back
        </Link>
      </p>
    </form>
  );
}
