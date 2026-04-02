import { AuthForm } from "@/app/auth/auth-form";
import { Suspense } from "react";

export default function AuthPage() {
  return (
    <div className="linecrew-zone-marketing-page relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.18),transparent_52%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[100dvh] flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <Suspense
          fallback={
            <div className="linecrew-card-marketing w-full max-w-md animate-pulse p-10 shadow-xl">
              <div className="mx-auto h-10 w-40 rounded bg-slate-200" />
              <div className="mx-auto mt-6 h-8 w-48 rounded bg-slate-200" />
              <div className="mx-auto mt-2 h-4 w-full max-w-xs rounded bg-slate-100" />
            </div>
          }
        >
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
