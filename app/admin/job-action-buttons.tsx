"use client";

import {
  adminPayWaiterAction,
  adminRefundCustomerAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { useActionState, useRef, useState } from "react";

const initial: AdminActionState = null;

export function JobActionButtons({ jobId }: { jobId: string }) {
  const refundFormRef = useRef<HTMLFormElement>(null);
  const payFormRef = useRef<HTMLFormElement>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  const [refundState, refundAction, refundPending] = useActionState(
    adminRefundCustomerAction,
    initial
  );
  const [payState, payAction, payPending] = useActionState(
    adminPayWaiterAction,
    initial
  );

  const err = refundState?.error ?? payState?.error;

  return (
    <div className="flex flex-col gap-2">
      <form ref={refundFormRef} action={refundAction} className="flex flex-col gap-2">
        <input type="hidden" name="jobId" value={jobId} />
        <button
          type="button"
          disabled={refundPending || payPending}
          onClick={() => setRefundDialogOpen(true)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {refundPending ? "…" : "Refund customer"}
        </button>
      </form>

      <form ref={payFormRef} action={payAction} className="flex flex-col gap-2">
        <input type="hidden" name="jobId" value={jobId} />
        <button
          type="button"
          disabled={refundPending || payPending}
          onClick={() => setPayDialogOpen(true)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {payPending ? "…" : "Pay Line Holder"}
        </button>
      </form>

      {err ? <p className="text-xs text-red-600">{err}</p> : null}

      {refundDialogOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="refund-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="refund-dialog-title" className="text-lg font-semibold text-slate-900">
              Refund payment
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Are you sure you want to refund this payment? This cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                onClick={() => setRefundDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => {
                  setRefundDialogOpen(false);
                  refundFormRef.current?.requestSubmit();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {payDialogOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="pay-dialog-title" className="text-lg font-semibold text-slate-900">
              Manual payout
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Confirm manual payout to Line Holder?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                onClick={() => setPayDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={() => {
                  setPayDialogOpen(false);
                  payFormRef.current?.requestSubmit();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
