"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function JobPostSuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session.");
      return;
    }
    const sid = sessionId;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 45;

    async function poll() {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        const res = await fetch(
          `/api/confirm-checkout?session_id=${encodeURIComponent(sid)}`
        );
        const data: {
          error?: string;
          jobId?: string;
          pending?: boolean;
        } = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not confirm payment.");
          return;
        }
        if (data.jobId) {
          router.replace(`/dashboard/customer/job-posted/${data.jobId}`);
          return;
        }
        if (data.pending) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!cancelled) {
        setError(
          "Your payment is processing. Check your customer dashboard in a moment — the job will appear once Stripe confirms."
        );
      }
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <p className="text-slate-700">{error}</p>
        <Link
          href="/dashboard/customer"
          className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <div className="mx-auto mb-6 size-10 animate-pulse rounded-full bg-blue-100" />
      <p className="text-lg font-medium text-slate-900">Confirming payment…</p>
      <p className="mt-2 text-sm text-slate-600">
        We&apos;re posting your job to the marketplace. This usually takes a few
        seconds.
      </p>
    </div>
  );
}
