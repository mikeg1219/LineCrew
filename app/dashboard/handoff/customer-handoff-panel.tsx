"use client";

import {
  confirmCustomerReceivedAction,
  customerArrivedAction,
  customerOnMyWayAction,
  customerVerifyHandoffAction,
  reportHandoffIssueAction,
  type HandoffActionState,
} from "@/app/dashboard/handoff/actions";
import { QRScannerLive } from "@/app/dashboard/handoff/qr-scanner-placeholder";
import type { JobStatus } from "@/lib/types/job";
import { useActionState, useState } from "react";

const initial: HandoffActionState = null;

export function CustomerHandoffPanel({
  jobId,
  status,
  handoffToken,
  handoffCode,
}: {
  jobId: string;
  status: JobStatus;
  handoffToken: string | null | undefined;
  handoffCode: string | null | undefined;
}) {
  const [loc, setLoc] = useState<{ lat: string; lng: string } | null>(null);
  const [mode, setMode] = useState<"qr" | "code">("qr");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [parsedToken, setParsedToken] = useState("");

  const [onWayState, onWayAction, onWayPending] = useActionState(customerOnMyWayAction, initial);
  const [arrivedState, arrivedAction, arrivedPending] = useActionState(customerArrivedAction, initial);
  const [verifyState, verifyAction, verifyPending] = useActionState(customerVerifyHandoffAction, initial);
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmCustomerReceivedAction,
    initial
  );
  const [issueState, issueAction, issuePending] = useActionState(reportHandoffIssueAction, initial);

  const busy = onWayPending || arrivedPending || verifyPending || confirmPending || issuePending;
  const msg =
    onWayState && "ok" in onWayState
      ? onWayState.ok
      : arrivedState && "ok" in arrivedState
        ? arrivedState.ok
        : verifyState && "ok" in verifyState
          ? verifyState.ok
          : confirmState && "ok" in confirmState
            ? confirmState.ok
            : issueState && "ok" in issueState
              ? issueState.ok
              : null;
  const err =
    (onWayState && "error" in onWayState && onWayState.error) ||
    (arrivedState && "error" in arrivedState && arrivedState.error) ||
    (verifyState && "error" in verifyState && verifyState.error) ||
    (confirmState && "error" in confirmState && confirmState.error) ||
    (issueState && "error" in issueState && issueState.error) ||
    null;

  const canVerify = status === "qr_generated" || status === "ready_for_handoff";
  const canConfirm = status === "awaiting_dual_confirmation";

  return (
    <section className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">LineCrew Handoff</h3>
      <p className="mt-1 text-sm text-slate-600">
        Multi-layer verification: identity, proximity, QR/code, then dual confirmation.
      </p>

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

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <form action={onWayAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <button className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white" disabled={busy}>
            I&apos;m on my way
          </button>
        </form>
        <form action={arrivedAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <button className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white" disabled={busy}>
            I&apos;m here
          </button>
        </form>
      </div>

      <form action={verifyAction} className="mt-4 space-y-2 rounded-xl border border-slate-200 p-3">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="lat" value={loc?.lat ?? ""} />
        <input type="hidden" name="lng" value={loc?.lng ?? ""} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("qr")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === "qr" ? "bg-cyan-100 text-cyan-900" : "bg-slate-100 text-slate-700"}`}
          >
            QR token
          </button>
          <button
            type="button"
            onClick={() => setMode("code")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === "code" ? "bg-cyan-100 text-cyan-900" : "bg-slate-100 text-slate-700"}`}
          >
            4-digit code
          </button>
        </div>
        {mode === "qr" ? (
          <>
            <input
              name="handoffToken"
              value={parsedToken || handoffToken || ""}
              onChange={(e) => setParsedToken(e.target.value)}
              placeholder="Enter scanned QR token"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setScannerOpen((v) => !v)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {scannerOpen ? "Hide scanner" : "Open scanner"}
            </button>
            {scannerOpen && (
              <QRScannerLive
                onParsed={(token) => {
                  setParsedToken(token);
                  setMode("qr");
                }}
              />
            )}
          </>
        ) : (
          <input
            name="handoffCode"
            defaultValue={handoffCode ?? ""}
            placeholder="Enter 4-digit code"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}
        <button
          className="w-full rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-900"
          disabled={!canVerify || busy}
        >
          Scan QR to complete handoff
        </button>
      </form>

      <form action={confirmAction} className="mt-3">
        <input type="hidden" name="jobId" value={jobId} />
        <button
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={!canConfirm || busy}
        >
          I received my place in line
        </button>
      </form>

      <form action={issueAction} className="mt-4 grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <input type="hidden" name="jobId" value={jobId} />
        <select name="reason" className="rounded-lg border border-amber-300 bg-white px-2 py-2 text-sm">
          <option value="">Report issue…</option>
          <option>I can’t find my line holder</option>
          <option>Wrong person</option>
          <option>Line position was not transferred</option>
          <option>Location mismatch</option>
          <option>Scanning not working</option>
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

      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </section>
  );
}
