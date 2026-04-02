"use client";

import {
  confirmAndCheckout,
  type ConfirmBookingState,
} from "@/app/dashboard/customer/booking-review/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PLATFORM_FEE_RATE } from "@/lib/booking-pricing";
import Link from "next/link";
import { useActionState } from "react";

const initialState: ConfirmBookingState = null;

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

type Props = {
  cardTitle: string;
  locationLine: string;
  timingLine: string;
  estimatedWaitLine: string;
  notesPreview: string;
  lineHolderFee: number;
  platformFee: number;
  totalCharged: number;
  overageRate: number;
};

export function BookingReviewClient({
  cardTitle,
  locationLine,
  timingLine,
  estimatedWaitLine,
  notesPreview,
  lineHolderFee,
  platformFee,
  totalCharged,
  overageRate,
}: Props) {
  const [state, formAction] = useActionState(
    confirmAndCheckout,
    initialState
  );

  const platformPct = Math.round(PLATFORM_FEE_RATE * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          {cardTitle}
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Location</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{locationLine}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Timing</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{timingLine}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Estimated wait</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {estimatedWaitLine}
            </dd>
          </div>
          {notesPreview ? (
            <div>
              <dt className="text-slate-500">Notes</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">
                {notesPreview}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm sm:p-6"
        aria-labelledby="pricing-heading"
      >
        <h2
          id="pricing-heading"
          className="text-sm font-semibold uppercase tracking-wide text-slate-600"
        >
          Pricing
        </h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-slate-700">Line Holder fee</span>
            <span className="tabular-nums font-medium text-slate-900">
              {formatMoney(lineHolderFee)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-slate-700">
              Platform fee ({platformPct}%)
            </span>
            <span className="tabular-nums font-medium text-slate-900">
              {formatMoney(platformFee)}
            </span>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-semibold text-slate-900">
                Total charged today
              </span>
              <span className="tabular-nums text-base font-semibold text-slate-900">
                {formatMoney(totalCharged)}
              </span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3 text-slate-600">
            <div className="flex items-baseline justify-between gap-4">
              <span>Extra time rate</span>
              <span className="tabular-nums font-medium text-slate-900">
                {formatMoney(overageRate)}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              (per 30 min if needed)
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Payment</h2>
        <p className="mt-2 text-sm text-slate-600">
          Pay with card — Stripe will collect your card securely on the next
          screen.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Accepted
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold tracking-wide text-slate-800">
              Visa
            </span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold tracking-wide text-slate-800">
              Mastercard
            </span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold tracking-wide text-slate-800">
              Amex
            </span>
          </div>
        </div>
      </section>

      <form action={formAction} className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-slate-800">
            <input
              type="checkbox"
              name="review_terms_ack"
              required
              className="mt-1 size-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            <span>
              I agree to the{" "}
              <Link
                href="/legal/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 underline-offset-2 hover:underline"
              >
                booking terms
              </Link>
              ,{" "}
              <Link
                href="/legal/cancellation-refunds"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 underline-offset-2 hover:underline"
              >
                cancellation policy
              </Link>
              , and{" "}
              <Link
                href="/legal/community-guidelines"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 underline-offset-2 hover:underline"
              >
                community guidelines
              </Link>
            </span>
          </label>
        </div>

        {state?.error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {state.error}
          </p>
        )}

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
          <FormSubmitButton
            loadingLabel="Opening checkout…"
            className="min-h-[52px] w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 sm:min-h-[48px] sm:py-3"
          >
            Confirm &amp; Pay {formatMoney(totalCharged)}
          </FormSubmitButton>
        </div>
      </form>

      <div className="hidden h-14 sm:block" aria-hidden />
    </div>
  );
}
