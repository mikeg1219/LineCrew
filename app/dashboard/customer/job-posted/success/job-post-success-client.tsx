"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const MAX_ATTEMPTS = 45;
const POLL_MS = 1000;
const REDIRECT_SECONDS = 90;

function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`size-12 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

function WarningIcon() {
  return (
    <svg
      className="mx-auto size-14 text-amber-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="mx-auto size-14 text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function MissingSessionIcon() {
  return (
    <svg
      className="mx-auto size-14 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

export function JobPostSuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  const [attempt, setAttempt] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [pollStopped, setPollStopped] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [redirectSec, setRedirectSec] = useState(REDIRECT_SECONDS);

  const sessionRefShort = useMemo(
    () => (sessionId ? sessionId.slice(0, 8) : ""),
    [sessionId]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setRedirectSec((s) => {
        if (s <= 0) return 0;
        if (s === 1) {
          router.push("/dashboard/customer");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [router]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const sid = sessionId;
    let cancelled = false;

    async function poll() {
      let n = 0;
      while (!cancelled && n < MAX_ATTEMPTS) {
        n += 1;
        setAttempt(n);
        try {
          const res = await fetch(
            `/api/confirm-checkout?session_id=${encodeURIComponent(sid)}`
          );
          const data: {
            error?: string;
            jobId?: string;
            pending?: boolean;
          } = await res.json();

          if (!res.ok) {
            setApiError(data.error ?? "Could not confirm payment.");
            return;
          }
          if (data.jobId) {
            router.replace(`/dashboard/customer/job-posted/${data.jobId}`);
            return;
          }
          if (data.pending) {
            await new Promise((r) => setTimeout(r, POLL_MS));
            continue;
          }
          await new Promise((r) => setTimeout(r, POLL_MS));
        } catch {
          setApiError(
            "We couldn’t reach the server. Check your connection and try again."
          );
          return;
        }
      }
      if (!cancelled) {
        setPollStopped(true);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router, retryKey]);

  const onTryAgain = useCallback(() => {
    setAttempt(0);
    setPollStopped(false);
    setApiError(null);
    setRetryKey((k) => k + 1);
  }, []);

  const visualPhase = useMemo(() => {
    if (!sessionId) return "missing_session" as const;
    if (apiError) return "api_error" as const;
    if (attempt >= 41 || pollStopped) return "timeout_recovery" as const;
    if (attempt >= 21) return "polling_late" as const;
    return "polling_early" as const;
  }, [sessionId, apiError, attempt, pollStopped]);

  const progressPercent =
    attempt >= 21 && attempt <= 40
      ? Math.min(100, Math.round(((attempt - 20) / 20) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        {visualPhase === "missing_session" && (
          <div className="text-center">
            <MissingSessionIcon />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Missing checkout session. Return to the dashboard and try posting
              again.
            </p>
            <Link
              href="/dashboard/customer"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to dashboard
            </Link>
          </div>
        )}

        {visualPhase === "api_error" && sessionId && (
          <div className="text-center">
            <ErrorIcon />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {apiError}
            </p>
            <p className="mt-4 text-xs text-slate-500">
              Reference:{" "}
              <span className="font-mono text-slate-700">{sessionRefShort}</span>…
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/legal/contact-support"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Contact support
              </Link>
              <Link
                href="/dashboard/customer"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        )}

        {visualPhase === "polling_early" && (
          <div className="text-center">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <h1 className="mt-6 text-lg font-semibold text-slate-900">
              Confirming your booking...
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              This usually takes a few seconds
            </p>
          </div>
        )}

        {visualPhase === "polling_late" && (
          <div className="text-center">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <h1 className="mt-6 text-lg font-semibold text-slate-900">
              Still processing your payment...
            </h1>
            <div className="mx-auto mt-5 max-w-sm">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[11px] tabular-nums text-slate-500">
                ~{progressPercent}%
              </p>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Hang tight — this can take up to 30 seconds
            </p>
          </div>
        )}

        {visualPhase === "timeout_recovery" && sessionId && (
          <div className="text-center">
            <WarningIcon />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">
              Taking longer than expected
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Your payment was received but we&apos;re still setting up your
              booking.
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Reference:{" "}
              <span className="font-mono font-semibold text-slate-800">
                {sessionRefShort}
              </span>
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/dashboard/customer"
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Check my dashboard
              </Link>
              <button
                type="button"
                onClick={onTryAgain}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Try again
              </button>
              <Link
                href="/legal/contact-support"
                className="text-center text-sm font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
              >
                Contact support
              </Link>
            </div>
          </div>
        )}

      <p className="mt-10 text-center text-xs text-slate-500" aria-live="polite">
        Redirecting to dashboard in {redirectSec}s...
      </p>
    </div>
  );
}
