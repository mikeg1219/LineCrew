"use client";

import { AirportCombobox } from "@/app/dashboard/customer/post-job/airport-combobox";
import { TerminalSelect } from "@/app/dashboard/customer/post-job/terminal-select";
import { postJobAction, type PostJobState } from "@/app/dashboard/customer/post-job/actions";
import { ESTIMATED_WAIT_OPTIONS, LINE_TYPE_GROUPS } from "@/lib/jobs/options";
import {
  PAYMENT_METHOD_LABEL,
  type PaymentMethodCode,
} from "@/lib/payment-methods";
import Link from "next/link";
import { useActionState, useState } from "react";

const initialState: PostJobState = null;

const RECOMMENDED_MIN = 25;
const RECOMMENDED_MAX = 35;
const DEFAULT_OFFER = "30";
const SHOW_PAYMENT_METHOD_SELECTOR =
  process.env.NEXT_PUBLIC_SHOW_PAYMENT_METHOD_SELECTOR === "true" ||
  process.env.NODE_ENV !== "production";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

const labelClass = "mb-2 block text-sm font-medium text-slate-800";
const hintClass = "mt-1.5 text-xs leading-relaxed text-slate-500";

const sectionClass =
  "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6";
const sectionInner = "space-y-5";
const sectionTitle = "text-base font-semibold tracking-tight text-slate-900";

const urgencyOptions = [
  { value: "asap", title: "ASAP", sub: "within 15 minutes" },
  { value: "soon", title: "Soon", sub: "30–60 minutes" },
  { value: "schedule", title: "Schedule", sub: "pick date & time" },
] as const;

export function PostJobForm() {
  const [state, formAction, isPending] = useActionState(
    postJobAction,
    initialState
  );
  const [airportCode, setAirportCode] = useState<string | null>(null);
  const [urgencyType, setUrgencyType] = useState<string>("asap");
  const [offeredPrice, setOfferedPrice] = useState(DEFAULT_OFFER);
  const [overageRate, setOverageRate] = useState("10");
  const [estimatedWait, setEstimatedWait] = useState<string>(
    ESTIMATED_WAIT_OPTIONS[0] ?? ""
  );
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodCode>("stripe_card");

  const offerNum = parseFloat(offeredPrice);
  const offerValid = !Number.isNaN(offerNum) && offerNum >= 10;
  const platformFee = offerValid ? offerNum * 0.2 : 0;

  return (
    <form
      action={formAction}
      noValidate
      className="mx-auto max-w-2xl space-y-6 sm:space-y-8"
    >
      {/* Timing */}
      <section className={sectionClass} aria-labelledby="section-timing">
        <h2 id="section-timing" className={sectionTitle}>
          When
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          When do you need your Line Holder?
        </p>
        <div className={`${sectionInner} mt-5`}>
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="sr-only">Urgency</legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
              {urgencyOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`relative flex min-h-[4.25rem] cursor-pointer flex-col justify-center rounded-xl border-2 px-4 py-3.5 text-left shadow-sm transition ${
                    urgencyType === opt.value
                      ? "border-blue-600 bg-blue-50/90 ring-1 ring-blue-600/15"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency_type"
                    value={opt.value}
                    checked={urgencyType === opt.value}
                    onChange={() => setUrgencyType(opt.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold text-slate-900">
                    {opt.title}
                  </span>
                  <span className="mt-0.5 text-xs leading-snug text-slate-600">
                    {opt.sub}
                  </span>
                </label>
              ))}
            </div>
            {urgencyType === "schedule" && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <label
                  htmlFor="urgency_schedule"
                  className={labelClass}
                >
                  Date &amp; time
                </label>
                <input
                  id="urgency_schedule"
                  name="urgency_schedule"
                  type="datetime-local"
                  className={inputClass}
                />
              </div>
            )}
          </fieldset>
        </div>
      </section>

      {/* Location */}
      <section className={sectionClass} aria-labelledby="section-location">
        <h2 id="section-location" className={sectionTitle}>
          Location
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Airport, terminal, and flight details (if helpful).
        </p>
        <div className={`${sectionInner} mt-5`}>
          <div>
            <label htmlFor="airport-search" className={labelClass}>
              Airport
            </label>
            <AirportCombobox onAirportChange={setAirportCode} />
            <p className={hintClass}>
              Type a city name, airport code, or part of the airport name.
            </p>
          </div>

          <div>
            <label htmlFor="terminal" className={labelClass}>
              Terminal
            </label>
            <TerminalSelect airportCode={airportCode} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
            <div className="min-w-0">
              <label htmlFor="airline" className={labelClass}>
                Airline
              </label>
              <input
                id="airline"
                name="airline"
                type="text"
                placeholder="e.g. Delta"
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="flight_number" className={labelClass}>
                Flight number{" "}
                <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="flight_number"
                name="flight_number"
                type="text"
                placeholder="e.g. 2841"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Line & spot */}
      <section className={sectionClass} aria-labelledby="section-line">
        <h2 id="section-line" className={sectionTitle}>
          Line &amp; spot
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          What kind of line, and where to meet.
        </p>
        <div className={`${sectionInner} mt-5`}>
          <div>
            <label htmlFor="line_type" className={labelClass}>
              Line type
            </label>
            <select
              id="line_type"
              name="line_type"
              required
              className={inputClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select line type
              </option>
              {LINE_TYPE_GROUPS.map((group) => (
                <optgroup key={group.heading} label={group.heading}>
                  {group.items.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="exact_location" className={labelClass}>
              Exact location
            </label>
            <input
              id="exact_location"
              name="exact_location"
              type="text"
              placeholder="Gate B12, Delta counter, near Starbucks"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Description */}
      <section className={sectionClass} aria-labelledby="section-notes">
        <h2 id="section-notes" className={sectionTitle}>
          Notes
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Anything else your Line Holder should know.
        </p>
        <div className="mt-5">
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Describe what you need: line type, gate/area, what the Line Holder should do, and when you will arrive."
            className={`${inputClass} min-h-[108px] resize-y`}
          />
        </div>
      </section>

      {/* Pricing */}
      <section className={sectionClass} aria-labelledby="section-pricing">
        <h2 id="section-pricing" className={sectionTitle}>
          Price &amp; time
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Offer, optional extra time, and how long you expect to wait.
        </p>

        <div className={`${sectionInner} mt-5`}>
          <div className="rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/90 to-white p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-900">
              Recommended offer
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-blue-700">
              ${RECOMMENDED_MIN}–${RECOMMENDED_MAX}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Based on airport, line type, and current demand
            </p>
            <p className="mt-3 text-xs font-medium text-blue-800">
              Higher offers get faster acceptance
            </p>
          </div>

          <div>
            <label htmlFor="offered_price" className={labelClass}>
              Offered price (USD)
            </label>
            <input
              id="offered_price"
              name="offered_price"
              type="number"
              min={10}
              step={0.01}
              required
              value={offeredPrice}
              onChange={(e) => setOfferedPrice(e.target.value)}
              className={inputClass}
            />
            <p className={hintClass}>
              Minimum $10.00. Your card is charged this amount at checkout; the
              platform keeps 20% and the rest goes to your Line Holder after the booking
              is completed.
            </p>
          </div>

          <div>
            <label htmlFor="overage_rate" className={labelClass}>
              Extra time rate (per 30 min)
            </label>
            <input
              id="overage_rate"
              name="overage_rate"
              type="number"
              min={5}
              step={0.01}
              defaultValue={10}
              onChange={(e) => setOverageRate(e.target.value)}
              className={inputClass}
            />
            <p className={hintClass}>
              If the wait runs longer than expected, your Line Holder can request
              extra time at this rate.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-4 sm:px-5">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-slate-800">
              <input
                type="checkbox"
                name="overage_agreed"
                defaultChecked
                required
                className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span>
                Allow Line Holder to continue if line takes longer at $
                {Number.isNaN(parseFloat(overageRate))
                  ? "…"
                  : parseFloat(overageRate).toFixed(2)}{" "}
                per 30 min
              </span>
            </label>
          </div>

          <div>
            <label htmlFor="estimated_wait" className={labelClass}>
              Estimated wait time
            </label>
            <select
              id="estimated_wait"
              name="estimated_wait"
              required
              className={inputClass}
              value={estimatedWait}
              onChange={(e) => setEstimatedWait(e.target.value)}
            >
              {ESTIMATED_WAIT_OPTIONS.length > 1 && (
                <option value="" disabled>
                  Select duration
                </option>
              )}
              {ESTIMATED_WAIT_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Summary & actions */}
      <section className={sectionClass} aria-labelledby="section-review">
        <h2 id="section-review" className={sectionTitle}>
          Review &amp; pay
        </h2>
        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-900">
              Checkout summary
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-600">Your offer</dt>
                <dd className="tabular-nums font-medium text-slate-900">
                  {offerValid ? `$${offerNum.toFixed(2)}` : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-600">Platform fee (20%)</dt>
                <dd className="tabular-nums font-medium text-slate-900">
                  {offerValid ? `$${platformFee.toFixed(2)}` : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-slate-200/80 pt-3">
                <dt className="font-semibold text-slate-900">Total charged</dt>
                <dd className="tabular-nums text-base font-semibold text-blue-700">
                  {offerValid ? `$${offerNum.toFixed(2)}` : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              The fee is deducted from your payment before payout to your Line Holder.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              No Stripe account signup is required. Pay as guest in Stripe Checkout
              with card/wallet methods; bank-link options appear in Checkout when
              available for your device and region.
            </p>
          </div>

          {/* Test-only payment method selector (does not change Stripe flow yet) */}
          {SHOW_PAYMENT_METHOD_SELECTOR && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
              <label className={labelClass}>
                Payment method (test planning)
              </label>
              <p className={hintClass}>
                All options currently charge through Stripe in test mode. This field
                lets us mark which method you intend to use (e.g. Apple Pay, PayPal,
                Zelle) so we can validate flows before native app launch.
              </p>
              <select
                name="payment_method_code"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethodCode)
                }
                className={`${inputClass} mt-2 max-w-md`}
              >
                <optgroup label="Stripe (card & wallets)">
                  <option value="stripe_card">
                    {PAYMENT_METHOD_LABEL.stripe_card}
                  </option>
                  <option value="stripe_apple_pay">
                    {PAYMENT_METHOD_LABEL.stripe_apple_pay}
                  </option>
                  <option value="stripe_google_pay">
                    {PAYMENT_METHOD_LABEL.stripe_google_pay}
                  </option>
                  <option value="stripe_link">
                    {PAYMENT_METHOD_LABEL.stripe_link}
                  </option>
                  <option value="stripe_wallet_qr">
                    {PAYMENT_METHOD_LABEL.stripe_wallet_qr}
                  </option>
                </optgroup>
                <optgroup label="External / P2P (manual in test)">
                  <option value="external_paypal">
                    {PAYMENT_METHOD_LABEL.external_paypal}
                  </option>
                  <option value="external_cash_app">
                    {PAYMENT_METHOD_LABEL.external_cash_app}
                  </option>
                  <option value="external_zelle">
                    {PAYMENT_METHOD_LABEL.external_zelle}
                  </option>
                  <option value="external_other">
                    {PAYMENT_METHOD_LABEL.external_other}
                  </option>
                </optgroup>
              </select>
            </div>
          )}

          {state?.error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800"
            >
              {state.error}
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="order-1 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 sm:order-none sm:w-auto sm:py-2.5"
            >
              {isPending ? "Redirecting to checkout…" : "Continue to checkout"}
            </button>
            <Link
              href="/dashboard/customer"
              className="order-2 w-full rounded-lg border border-slate-200 px-5 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:order-none sm:w-auto sm:py-2.5"
            >
              Cancel
            </Link>
          </div>
        </div>
      </section>
    </form>
  );
}
