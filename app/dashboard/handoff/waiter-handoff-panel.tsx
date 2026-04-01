"use client";

import {
  confirmWorkerTransferAction,
  generateHandoffQrAction,
  reportHandoffIssueAction,
  waiterReadyForHandoffAction,
  type HandoffActionState,
} from "@/app/dashboard/handoff/actions";
import type { JobStatus } from "@/lib/types/job";
import { useActionState, useState } from "react";

const initial: HandoffActionState = null;

export function WaiterHandoffPanel({
  jobId,
  status,
  handoffToken,
  handoffCode,
  handoffQrExpiresAt,
}: {
  jobId: string;
  status: JobStatus;
  handoffToken: string | null | undefined;
  handoffCode: string | null | undefined;
  handoffQrExpiresAt: string | null | undefined;
}) {
  const [loc, setLoc] = useState<{ lat: string; lng: string } | null>(null);
  const [readyState, readyAction, readyPending] = useActionState(waiterReadyForHandoffAction, initial);
  const [qrState, qrAction, qrPending] = useActionState(generateHandoffQrAction, initial);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmWorkerTransferAction, initial);
  const [issueState, issueAction, issuePending] = useActionState(reportHandoffIssueAction, initial);
  const busy = readyPending || qrPending || confirmPending || issuePending;
  const canGenerateQr = status === "ready_for_handoff" || status === "qr_generated";
  const canConfirm = status === "awaiting_dual_confirmation";

  const err =
    (readyState && "error" in readyState && readyState.error) ||
    (qrState && "error" in qrState && qrState.error) ||
    (confirmState && "error" in confirmState && confirmState.error) ||
    (issueState && "error" in issueState && issueState.error) ||
    null;

  return (
    <section className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">LineCrew Handoff</h3>
      <p className="mt-1 text-sm text-slate-600">
        Show identity, validate proximity, verify QR/code, then complete dual confirmation.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <form action={readyAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <button className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white" disabled={busy}>
            Ready for handoff
          </button>
        </form>
        <form action={qrAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="lat" value={loc?.lat ?? ""} />
          <input type="hidden" name="lng" value={loc?.lng ?? ""} />
          <button
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!canGenerateQr || busy}
          >
            Show Handoff QR
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={() =>
          navigator.geolocation.getCurrentPosition(
            (p) => setLoc({ lat: String(p.coords.latitude), lng: String(p.coords.longitude) }),
            () => setLoc(null)
          )
        }
        className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
      >
        Use my location
      </button>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Identity card</p>
        <p className="mt-1 text-sm text-slate-700">
          Badge: <span className="font-semibold">Your LineCrew line holder</span>
        </p>
        <p className="mt-1 text-sm text-slate-700">Token: <span className="font-mono">{handoffToken ?? "Generate QR to view token"}</span></p>
        <p className="mt-1 text-sm text-slate-700">Fallback code: <span className="font-semibold">{handoffCode ?? "—"}</span></p>
        <p className="mt-1 text-xs text-slate-500">QR expiry: {handoffQrExpiresAt ? new Date(handoffQrExpiresAt).toLocaleTimeString() : "—"}</p>
      </div>

      <form action={confirmAction} className="mt-3">
        <input type="hidden" name="jobId" value={jobId} />
        <button
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={!canConfirm || busy}
        >
          I transferred the place successfully
        </button>
      </form>

      <form action={issueAction} className="mt-4 grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <input type="hidden" name="jobId" value={jobId} />
        <select name="reason" className="rounded-lg border border-amber-300 bg-white px-2 py-2 text-sm">
          <option value="">Report issue…</option>
          <option>Customer did not arrive</option>
          <option>Wrong person</option>
          <option>Location mismatch</option>
          <option>Scanning not working</option>
          <option>Customer disputed transfer</option>
        </select>
        <textarea
          name="notes"
          placeholder="Optional notes / photo proof placeholder"
          className="min-h-20 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
        />
        <button className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-semibold text-amber-900" disabled={busy}>
          Report issue
        </button>
      </form>

      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </section>
  );
}
