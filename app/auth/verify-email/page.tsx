import { VerifyEmailClient } from "@/app/auth/verify-email/verify-email-client";
import { parseAuthIntent } from "@/lib/auth-intent";
import { verifyEmailTokenFromLink } from "@/lib/email-verification-service";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{
    token?: string | string[];
    intent?: string | string[];
    error?: string | string[];
  }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tokenRaw = sp.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;

  if (token) {
    const intent = parseAuthIntent(sp.intent);
    const intentQ = intent ? `&intent=${encodeURIComponent(intent)}` : "";
    const result = await verifyEmailTokenFromLink(token);
    if (result.ok) {
      const q = intent
        ? `?verified=1&intent=${encodeURIComponent(intent)}`
        : "?verified=1";
      redirect(`/auth${q}`);
    }
    redirect(
      `/auth/verify-email?error=${encodeURIComponent(result.reason)}${intentQ}&pending=1`
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/airport-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/45" />
      <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-4 py-8 sm:px-5 sm:py-12 md:py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Verify your email
              </h1>
              <p className="text-sm leading-relaxed text-slate-600">
                Use the link in your inbox, or enter the code below. One
                verification unlocks your account.
              </p>
            </div>
            <Suspense
              fallback={
                <div className="mt-6 text-center text-slate-500">Loading…</div>
              }
            >
              <VerifyEmailClient />
            </Suspense>
            <div className="mt-8 border-t border-slate-100 pt-6 sm:mt-9">
              <p className="text-center text-sm text-slate-600">
                <Link
                  href="/"
                  className="font-medium text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 rounded-sm"
                >
                  ← Back to home
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
