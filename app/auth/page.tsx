import { AuthForm } from "@/app/auth/auth-form";
import { CenteredGradientCardShell } from "@/components/centered-gradient-card-shell";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: { absolute: "Sign in to LineCrew.ai" },
  description:
    "Sign in to book trusted Line Holders or manage your Line Holder account on LineCrew.ai.",
  openGraph: {
    url: "https://linecrew.ai/auth",
    title: "Sign in to LineCrew.ai",
    description:
      "Sign in to book trusted Line Holders or manage your Line Holder account.",
  },
  twitter: {
    title: "Sign in to LineCrew.ai",
    description:
      "Sign in to book trusted Line Holders or manage your Line Holder account.",
  },
  alternates: { canonical: "https://linecrew.ai/auth" },
};

export default function AuthPage() {
  return (
    <CenteredGradientCardShell>
      <Suspense
        fallback={
          <div className="w-full animate-pulse space-y-4">
            <div className="mx-auto h-10 w-40 rounded bg-slate-200" />
            <div className="mx-auto h-8 w-48 rounded bg-slate-200" />
            <div className="h-10 w-full rounded bg-slate-100" />
            <div className="h-10 w-full rounded bg-slate-100" />
          </div>
        }
      >
        <AuthForm />
      </Suspense>
    </CenteredGradientCardShell>
  );
}
