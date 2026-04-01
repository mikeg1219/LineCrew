"use client";

import {
  startStripeConnectOnboardingAction,
  type ConnectState,
} from "@/app/dashboard/waiter/connect/actions";
import { useActionState } from "react";

const initial: ConnectState = null;

export function WaiterPayoutConnectForm({
  buttonClassName,
  label = "Set up payouts",
  pendingLabel = "Redirecting…",
  mode = "onboarding",
  /** Where to land after Stripe onboarding (server validates allowlist). */
  returnTo = "/dashboard/waiter",
}: {
  buttonClassName: string;
  label?: string;
  pendingLabel?: string;
  mode?: "onboarding" | "update";
  returnTo?: "/dashboard/waiter" | "/dashboard/profile";
}) {
  const [state, formAction, pending] = useActionState(
    startStripeConnectOnboardingAction,
    initial
  );

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="mode" value={mode} />
        <button
          type="submit"
          disabled={pending}
          className={buttonClassName}
        >
          {pending ? pendingLabel : label}
        </button>
      </form>
      {state?.error ? (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      ) : null}
    </div>
  );
}
