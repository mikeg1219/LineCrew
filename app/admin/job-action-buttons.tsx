"use client";

import {
  adminPayWaiterAction,
  adminRefundCustomerAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { useActionState } from "react";

const initial: AdminActionState = null;

export function JobActionButtons({ jobId }: { jobId: string }) {
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
      <form action={refundAction}>
        <input type="hidden" name="jobId" value={jobId} />
        <button
          type="submit"
          disabled={refundPending || payPending}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {refundPending ? "…" : "Refund customer"}
        </button>
      </form>
      <form action={payAction}>
        <input type="hidden" name="jobId" value={jobId} />
        <button
          type="submit"
          disabled={refundPending || payPending}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {payPending ? "…" : "Pay waiter"}
        </button>
      </form>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
