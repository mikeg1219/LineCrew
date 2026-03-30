import { VerifyEmailClient } from "@/app/auth/verify-email/verify-email-client";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { parseAuthIntent } from "@/lib/auth-intent";
import { verifyEmailTokenFromLink } from "@/lib/email-verification-service";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{
    token?: string | string[];
    intent?: string | string[];
    error?: string | string[];
    email?: string | string[];
  }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tokenRaw = sp.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
  const emailRaw = sp.email;
  const emailParam = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;
  const emailQ = emailParam
    ? `&email=${encodeURIComponent(emailParam)}`
    : "";

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
      `/auth/verify-email?error=${encodeURIComponent(result.reason)}${intentQ}&pending=1${emailQ}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (profileErr) {
      console.error("[verify-email page] profiles select:", profileErr.message);
    }
    if (isEmailVerifiedForApp(profileErr ? null : profile, user)) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/airport-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/45" />
      <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:pt-12 sm:pb-[max(3rem,env(safe-area-inset-bottom))] md:pt-16 md:pb-[max(4rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg sm:p-8">
            <Suspense
              fallback={
                <div className="min-h-[12rem] py-8 text-center text-sm text-slate-500 sm:min-h-[10rem]">
                  Loading…
                </div>
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
