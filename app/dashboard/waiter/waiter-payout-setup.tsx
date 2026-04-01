"use client";

import { WaiterPayoutConnectForm } from "@/app/dashboard/waiter/waiter-payout-connect-form";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function WaiterPayoutSetup({
  stripeAccountId,
  stripeDetailsSubmitted,
  stripePayoutsEnabled,
  manualPayoutReady = false,
  manualPayoutSummary = null,
  returnTo = "/dashboard/waiter",
}: {
  stripeAccountId: string | null;
  /** When null/undefined, UI assumes legacy DB (only account id tracked). */
  stripeDetailsSubmitted?: boolean | null;
  stripePayoutsEnabled?: boolean | null;
  manualPayoutReady?: boolean;
  manualPayoutSummary?: string | null;
  returnTo?: "/dashboard/waiter" | "/dashboard/profile";
}) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const payoutBypass = process.env.NEXT_PUBLIC_ALLOW_TEST_PAYOUT_BYPASS === "true";
  if (payoutBypass) {
    return (
      <div className="mt-7 rounded-2xl border border-amber-200/90 bg-amber-50/80 p-5 shadow-sm sm:mt-8 sm:p-6">
        <h2 className="text-lg font-semibold leading-snug tracking-tight text-slate-900 sm:text-[1.125rem]">
          Payouts — test mode bypass enabled
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-900 sm:text-[15px]">
          Stripe Connect payout setup is bypassed for testing right now. You can
          continue end-to-end booking tests without registering a payout account.
        </p>
      </div>
    );
  }

  const hasSchema =
    stripeDetailsSubmitted !== undefined && stripePayoutsEnabled !== undefined;
  const payoutReady =
    manualPayoutReady ||
    (Boolean(stripeAccountId?.trim()) &&
      (!hasSchema ||
        (stripeDetailsSubmitted === true && stripePayoutsEnabled === true)));
  const incomplete = !payoutReady;

  return (
    <div
      className={
        incomplete
          ? "mt-7 rounded-2xl border-2 border-amber-300/70 bg-gradient-to-b from-amber-50/90 to-white p-5 shadow-md ring-1 ring-amber-200/60 sm:mt-8 sm:p-6"
          : "mt-7 rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-sm sm:mt-8 sm:p-6"
      }
    >
      <h2 className="text-lg font-semibold leading-snug tracking-tight text-slate-900 sm:text-[1.125rem]">
        Payouts — get paid after completed bookings
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
        Connect your bank through Stripe so earnings can be sent to you after
        handoffs. A platform service fee is applied at checkout. You must finish
        Stripe onboarding (identity + bank) and have payouts enabled before
        accepting jobs or receiving transfers.
      </p>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
        <p>
          <span className="font-semibold text-slate-800">Payout routes:</span>{" "}
          Stripe bank-link (automatic payouts) or manual payout method
          (Zelle/Cash App/PayPal/Venmo) configured in Profile.
        </p>
      </div>
      {manualPayoutReady ? (
        <p className="mt-3 text-sm font-medium text-emerald-800">
          Manual payout is configured{manualPayoutSummary ? ` (${manualPayoutSummary})` : ""}. You can accept bookings now. Stripe setup is optional if you want automatic payouts later.
        </p>
      ) : !stripeAccountId?.trim() ? (
        <p className="mt-3 text-sm font-medium text-amber-900">
          Payout setup isn&apos;t started — connect below to create your Stripe
          account and add bank details.
        </p>
      ) : hasSchema && stripeDetailsSubmitted !== true ? (
        <p className="mt-3 text-sm font-medium text-amber-900">
          Finish Stripe onboarding (identity and bank details). Use the button
          below to continue where you left off.
        </p>
      ) : hasSchema && stripePayoutsEnabled !== true ? (
        <p className="mt-3 text-sm font-medium text-amber-900">
          Stripe is still verifying your bank or identity — payouts are not
          enabled yet. Complete any outstanding steps in Stripe, or use the
          button below to update your information.
        </p>
      ) : (
        <p className="mt-3 text-sm font-medium text-emerald-800">
          Payout setup looks good — Stripe reports payouts enabled. You can
          reopen onboarding to update your details anytime.
        </p>
      )}
      <div className="mt-6">
        <WaiterPayoutConnectForm
          returnTo={returnTo}
          mode="onboarding"
          label={
            payoutReady
              ? stripeAccountId?.trim()
                ? "Update bank details"
                : "Set up Stripe (optional)"
              : stripeAccountId?.trim()
                ? "Continue payout setup"
                : "Set up payouts"
          }
          pendingLabel="Opening Stripe…"
          buttonClassName={
            incomplete
              ? "min-h-[52px] w-full rounded-xl bg-slate-900 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 sm:min-h-[48px] sm:w-auto"
              : "min-h-[44px] rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60"
          }
        />
        <WaiterPayoutConnectForm
          returnTo={returnTo}
          mode="update"
          label="Link bank account (optional)"
          pendingLabel="Opening bank-link…"
          buttonClassName="mt-3 min-h-[44px] rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-900 shadow-sm transition hover:bg-blue-100 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() =>
            startRefreshTransition(() => {
              router.push(`${returnTo}?connect=refresh`);
              router.refresh();
            })
          }
          disabled={isRefreshing}
          className="mt-3 min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          {isRefreshing ? "Refreshing Stripe status..." : "Refresh Stripe status now"}
        </button>
      </div>
    </div>
  );
}
