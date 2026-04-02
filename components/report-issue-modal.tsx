"use client";

import {
  submitJobIssueFormAction,
  type SubmitJobIssueState,
} from "@/app/dashboard/customer/jobs/report-issue-actions";
import { JOB_ISSUE_REASON_LABELS, JOB_ISSUE_REASONS } from "@/lib/job-issues";
import type { JobIssueReporterRole } from "@/lib/types/job-issue";
import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

const initial: SubmitJobIssueState = null;
const MAX_DESC = 500;
const MIN_DESC = 20;

type Props = {
  jobId: string;
  reporterRole: JobIssueReporterRole;
  onClose: () => void;
  onSuccess: () => void;
};

export function ReportIssueModal({
  jobId,
  reporterRole,
  onClose,
  onSuccess,
}: Props) {
  const titleId = useId();
  const [state, formAction, pending] = useActionState(
    submitJobIssueFormAction,
    initial
  );
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const successNotified = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (previewUrl) {
      return () => {
        URL.revokeObjectURL(previewUrl);
      };
    }
  }, [previewUrl]);

  useEffect(() => {
    if (state !== null && "ok" in state && state.ok && !successNotified.current) {
      successNotified.current = true;
      onSuccessRef.current();
    }
  }, [state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !pending) {
        onClose();
      }
    },
    [onClose, pending]
  );

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (!f) {
      return;
    }
    setPreviewUrl(URL.createObjectURL(f));
  };

  const clearPhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const descLen = description.length;
  const formValid =
    reason !== "" &&
    descLen >= MIN_DESC &&
    descLen <= MAX_DESC;

  const showSuccess = state !== null && "ok" in state && state.ok;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 flex-col bg-slate-900/70 p-0 backdrop-blur-sm sm:p-4 sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={handleBackdrop}
    >
      <div
        className="flex min-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-xl ring-1 ring-slate-900/10 sm:my-auto sm:max-h-[90vh] sm:min-h-0 sm:max-w-lg sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              Report an issue
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              We&apos;ll review your report within 2 hours
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            aria-label="Close"
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {showSuccess ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-10 text-center"
              role="status"
            >
              <span className="text-2xl font-semibold text-emerald-800">
                Issue reported ✓
              </span>
              <p className="max-w-sm text-sm text-slate-600">
                Thanks for letting us know. You can close this window.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          ) : (
            <form action={formAction} className="space-y-5">
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="reporterRole" value={reporterRole} />

              <div>
                <label
                  htmlFor={`${titleId}-reason`}
                  className="block text-sm font-medium text-slate-800"
                >
                  Reason
                </label>
                <select
                  id={`${titleId}-reason`}
                  name="reason"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1.5 w-full min-h-[48px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                >
                  <option value="">Select a reason...</option>
                  {JOB_ISSUE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {JOB_ISSUE_REASON_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`${titleId}-desc`}
                  className="block text-sm font-medium text-slate-800"
                >
                  Description
                </label>
                <textarea
                  id={`${titleId}-desc`}
                  name="description"
                  required
                  rows={5}
                  minLength={MIN_DESC}
                  maxLength={MAX_DESC}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what happened..."
                  className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400"
                />
                <p
                  className={`mt-1 text-right text-xs tabular-nums ${
                    descLen > MAX_DESC || (descLen > 0 && descLen < MIN_DESC)
                      ? "text-amber-700"
                      : "text-slate-500"
                  }`}
                >
                  {descLen}/{MAX_DESC}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-800">
                  Add a photo (optional)
                </p>
                <label className="mt-2 flex cursor-pointer flex-col gap-2">
                  <span className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-100">
                    {previewUrl ? "Change photo" : "Choose image"}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="photo"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={onPhotoChange}
                  />
                </label>
                {previewUrl && (
                  <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Selected attachment preview"
                      className="max-h-48 w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="absolute right-2 top-2 rounded-lg bg-slate-900/80 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-900"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {state !== null && "error" in state && state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {state.error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || !formValid}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {pending ? (
                    <>
                      <span
                        className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden
                      />
                      Submitting…
                    </>
                  ) : (
                    "Submit report"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
