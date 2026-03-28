"use client";

import { AirportCombobox } from "@/app/dashboard/customer/post-job/airport-combobox";
import { TerminalSelect } from "@/app/dashboard/customer/post-job/terminal-select";
import { postJobAction, type PostJobState } from "@/app/dashboard/customer/post-job/actions";
import {
  ESTIMATED_WAIT_OPTIONS,
  LINE_TYPES,
} from "@/lib/jobs/options";
import Link from "next/link";
import { useActionState, useState } from "react";

const initialState: PostJobState = null;

export function PostJobForm() {
  const [state, formAction, isPending] = useActionState(
    postJobAction,
    initialState
  );
  const [airportCode, setAirportCode] = useState<string | null>(null);

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-6">
      <div>
        <label
          htmlFor="airport-search"
          className="mb-1 block text-sm font-medium text-slate-800"
        >
          Airport
        </label>
        <AirportCombobox onAirportChange={setAirportCode} />
        <p className="mt-1 text-xs text-slate-500">
          Type a city name, airport code, or part of the airport name.
        </p>
      </div>

      <div>
        <label
          htmlFor="terminal"
          className="mb-1 block text-sm font-medium text-slate-800"
        >
          Terminal
        </label>
        <TerminalSelect airportCode={airportCode} />
      </div>

      <div>
        <label
          htmlFor="line_type"
          className="mb-1 block text-sm font-medium text-slate-800"
        >
          Line type
        </label>
        <select
          id="line_type"
          name="line_type"
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          defaultValue=""
        >
          <option value="" disabled>
            Select line type
          </option>
          {LINE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium text-slate-800"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Anything your Waiter should know (gate area, airline, special needs…)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
        />
      </div>

      <div>
        <label
          htmlFor="offered_price"
          className="mb-1 block text-sm font-medium text-slate-800"
        >
          Offered price (USD)
        </label>
        <input
          id="offered_price"
          name="offered_price"
          type="number"
          min={10}
          step={0.01}
          required
          placeholder="10.00"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
        />
        <p className="mt-1 text-xs text-slate-500">Minimum $10.00</p>
      </div>

      <div>
        <label
          htmlFor="overage_rate"
          className="mb-1 block text-sm font-medium text-slate-800"
        >
          Extra time rate (per 30 min)
        </label>
        <input
          id="overage_rate"
          name="overage_rate"
          type="number"
          min={5}
          step={0.01}
          defaultValue={10}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
        />
        <p className="mt-1 text-xs text-slate-500">
          If the wait runs longer than expected, your waiter can request extra
          time at this rate.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-800">
          <input
            type="checkbox"
            name="overage_agreed"
            required
            className="mt-1 size-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          <span>
            I agree to pay the extra time rate if my waiter requests it
          </span>
        </label>
      </div>

      <div>
        <label
          htmlFor="estimated_wait"
          className="mb-1 block text-sm font-medium text-slate-800"
        >
          Estimated wait time
        </label>
        <select
          id="estimated_wait"
          name="estimated_wait"
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          defaultValue=""
        >
          <option value="" disabled>
            Select duration
          </option>
          {ESTIMATED_WAIT_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Redirecting to checkout…" : "Continue to checkout"}
        </button>
        <Link
          href="/dashboard/customer"
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
