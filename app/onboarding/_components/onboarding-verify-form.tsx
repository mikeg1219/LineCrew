"use client";

import {
  resendVerificationEmailAction,
  type ResendVerificationState,
} from "@/app/auth/verification-actions";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

export function OnboardingVerifyForm({
  role,
  initialEmail,
  initiallyVerified = false,
}: {
  role: UserRole;
  initialEmail: string;
  initiallyVerified?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [email] = useState(initialEmail);
  const [cooldown, setCooldown] = useState(60);
  const [verified, setVerified] = useState(initiallyVerified);
  const [resendState, resendAction, resendPending] = useActionState(
    resendVerificationEmailAction,
    null as ResendVerificationState
  );

  useEffect(() => {
    const t = window.setInterval(() => {
      setCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u || cancelled) return;
      if (!isEmailVerifiedForApp({ email_verified_at: null }, u)) return;
      await supabase
        .from("profiles")
        .update({
          onboarding_step: 2,
          updated_at: new Date().toISOString(),
        })
        .eq("id", u.id);
      if (cancelled) return;
      setVerified(true);
    };
    if (!initiallyVerified) {
      check();
    }
    const poll = window.setInterval(check, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [initiallyVerified, role, router, supabase]);

  useEffect(() => {
    if (!verified) return;
    const t = window.setTimeout(() => {
      router.replace(
        role === "customer"
          ? "/onboarding/profile/customer"
          : "/onboarding/profile/waiter"
      );
    }, 1200);
    return () => window.clearTimeout(t);
  }, [verified, role, router]);

  return (
    <div className="space-y-5">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8" aria-hidden>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="M4 7l8 6 8-6" />
        </svg>
      </div>
      <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
        Check your inbox
      </h2>
      <p className="text-sm text-slate-600">
        We sent a verification link to{" "}
        <span className="font-medium text-slate-800">{email || "your email"}</span>.
      </p>
      <p className="text-sm text-slate-600">
        Click the link in the email to continue. Check your spam folder if you don&apos;t see it.
      </p>

      {verified ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Email verified ✓ - continuing to profile setup...
        </p>
      ) : null}

      <form action={resendAction}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="role" value={role} />
        {resendState && "error" in resendState ? (
          <p className="mb-2 text-sm text-red-600">{resendState.error}</p>
        ) : null}
        {resendState && "success" in resendState ? (
          <p className="mb-2 text-sm text-slate-600">{resendState.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={resendPending || cooldown > 0}
          onClick={() => {
            if (cooldown === 0) {
              setCooldown(60);
            }
          }}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : resendPending
              ? "Sending..."
              : "Resend email"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        <Link
          href={`/onboarding/account?role=${encodeURIComponent(role)}`}
          className="font-medium text-blue-700 hover:text-blue-800"
        >
          Wrong email? Go back
        </Link>
      </p>
    </div>
  );
}
