"use client";

import {
  startStripeConnectOnboardingAction,
  type ConnectState,
} from "@/app/dashboard/waiter/connect/actions";
import { useActionState } from "react";

const initial: ConnectState = null;

export function WaiterPayoutSetup({
  stripeAccountId,
}: {
  stripeAccountId: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    startStripeConnectOnboardingAction,
    initial
  );

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Payouts</h2>
      <p className="mt-2 text-sm text-slate-600">
        Connect your bank account through Stripe to receive your share when you
        complete jobs (80% of the listed price; LineCrew keeps a 20% platform
        fee).
      </p>
      {stripeAccountId ? (
        <p className="mt-3 text-sm font-medium text-emerald-800">
          Stripe account connected. You can reopen onboarding to update your
          details anytime.
        </p>
      ) : (
        <p className="mt-3 text-sm text-amber-800">
          You haven&apos;t connected payouts yet — complete this before marking
          a job complete.
        </p>
      )}
      <form action={formAction} className="mt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Redirecting…" : "Set up payouts"}
        </button>
      </form>
      {state?.error && (
        <p className="mt-3 text-sm text-red-600">{state.error}</p>
      )}
    </div>
  );
}
