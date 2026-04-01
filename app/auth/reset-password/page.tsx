import { ResetPasswordForm } from "@/app/auth/reset-password/reset-password-form";
import Link from "next/link";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden">
      <div className="linecrew-bg-hero absolute inset-0" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-4 py-8 sm:px-5 sm:py-12 md:py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Set a new password
              </h1>
              <p className="text-sm leading-relaxed text-slate-600">
                Choose a password you have not used elsewhere. At least 6
                characters.
              </p>
            </div>
            <Suspense
              fallback={
                <div className="mt-6 text-center text-slate-500">Loading…</div>
              }
            >
              <ResetPasswordForm />
            </Suspense>
            <div className="mt-8 border-t border-slate-100 pt-6 sm:mt-9">
              <p className="text-center text-sm text-slate-600">
                <Link
                  href="/auth"
                  className="font-medium text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 rounded-sm"
                >
                  ← Back to sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
