"use client";

import { WaiterPayoutConnectForm } from "@/app/dashboard/waiter/waiter-payout-connect-form";

export function WaiterPayoutSetup({
  stripeAccountId,
}: {
  stripeAccountId: string | null;
}) {
  const incomplete = !stripeAccountId;

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
        handoffs. You receive 80% of the listed price; LineCrew keeps a 20%
        platform fee. Payouts must be connected before you can receive money for
        completed bookings.
      </p>
      {stripeAccountId ? (
        <p className="mt-3 text-sm font-medium text-emerald-800">
          Stripe account connected. You can reopen onboarding to update your
          details anytime.
        </p>
      ) : (
        <p className="mt-3 text-sm font-medium text-amber-900">
          Payout setup isn&apos;t complete yet — connect below so you&apos;re
          ready to receive earnings when bookings finish.
        </p>
      )}
      <div className="mt-6">
        <WaiterPayoutConnectForm
          buttonClassName={
            incomplete
              ? "min-h-[52px] w-full rounded-xl bg-slate-900 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 sm:min-h-[48px] sm:w-auto"
              : "min-h-[44px] rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60"
          }
        />
      </div>
    </div>
  );
}
