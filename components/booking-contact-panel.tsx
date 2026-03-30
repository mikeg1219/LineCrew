"use client";

import {
  contactCustomerForBooking,
  contactLineHolderForBooking,
  type BookingContactFormState,
} from "@/app/dashboard/booking-contact/actions";
import { useActionState, useEffect, useRef } from "react";

const initial = null as BookingContactFormState;

function SubmitLabel({
  target,
  pending,
}: {
  target: "line_holder" | "customer";
  pending: boolean;
}) {
  const label =
    target === "line_holder" ? "Notify Line Holder" : "Notify customer";
  return (
    <>
      {pending ? "Sending…" : label}
      <span className="ml-2 rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
        One-way
      </span>
    </>
  );
}

type Props = {
  jobId: string;
  /** Who receives the SMS */
  contactTarget: "line_holder" | "customer";
  eligible: boolean;
  /** Shown when the booking is not eligible for contact */
  ineligibleHint?: string;
};

export function BookingContactPanel({
  jobId,
  contactTarget,
  eligible,
  ineligibleHint = "Contact isn’t available for this booking right now.",
}: Props) {
  const action =
    contactTarget === "line_holder"
      ? contactLineHolderForBooking
      : contactCustomerForBooking;
  const [state, formAction, pending] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state?.success]);

  if (!eligible) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/90 p-4">
        <p className="text-sm leading-relaxed text-slate-500">{ineligibleHint}</p>
      </div>
    );
  }

  const heading =
    contactTarget === "line_holder"
      ? "Notify your Line Holder"
      : "Notify the traveler";

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/90 p-4">
      <h3 className="text-sm font-semibold text-slate-800">{heading}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
        Sends a one-way SMS from LineCrew’s number when configured. This is not
        a full masked relay—recipient numbers never appear in the app.
      </p>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="jobId" value={jobId} />
        <label htmlFor={`note-${jobId}-${contactTarget}`} className="sr-only">
          Optional message
        </label>
        <textarea
          id={`note-${jobId}-${contactTarget}`}
          name="note"
          rows={3}
          maxLength={200}
          placeholder="Optional short message (max 200 characters)"
          className="min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/15 transition focus:border-blue-600 focus:ring-[3px] sm:text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex w-full min-h-[48px] touch-manipulation items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-70"
        >
          <SubmitLabel target={contactTarget} pending={pending} />
        </button>
      </form>
      {state?.error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="mt-3 text-sm text-emerald-800" role="status">
          {state.success}
        </p>
      ) : null}
    </div>
  );
}
