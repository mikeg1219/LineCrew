import { AuthForm } from "@/app/auth/auth-form";
import { Suspense } from "react";

export default function AuthPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-16">
      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-white px-12 py-16 text-slate-600 shadow-sm">
            Loading…
          </div>
        }
      >
        <AuthForm />
      </Suspense>
    </div>
  );
}
