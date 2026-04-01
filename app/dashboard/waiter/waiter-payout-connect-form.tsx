"use client";

import {
  startStripeConnectOnboardingAction,
  type ConnectState,
} from "@/app/dashboard/waiter/connect/actions";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useFormStatus } from "react-dom";
import { useState } from "react";

const initial: ConnectState = null;

function ConnectSubmitButton({
  buttonClassName,
  label,
  pendingLabel,
}: {
  buttonClassName: string;
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClassName}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

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
  returnTo?: "/dashboard/waiter" | "/dashboard/profile" | "/profile";
}) {
  const [state, setState] = useState<ConnectState>(initial);

  async function submitAction(formData: FormData) {
    setState(null);
    try {
      const result = await startStripeConnectOnboardingAction(initial, formData);
      if (result?.error) {
        setState(result);
      }
    } catch (e) {
      if (isRedirectError(e)) {
        throw e;
      }
      const msg =
        e instanceof Error ? e.message : "Could not start Stripe onboarding.";
      console.error("[waiter/connect] client submitAction:", e);
      setState({ error: msg });
    }
  }

  return (
    <div>
      <form action={submitAction}>
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="mode" value={mode} />
        <ConnectSubmitButton
          buttonClassName={buttonClassName}
          label={label}
          pendingLabel={pendingLabel}
        />
      </form>
      {state?.error ? (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      ) : null}
    </div>
  );
}
