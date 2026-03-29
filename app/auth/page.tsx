import { AuthForm } from "@/app/auth/auth-form";
import { parseAuthIntent } from "@/lib/auth-intent";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{ intent?: string | string[] }>;
};

export default async function AuthPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const initialIntent = parseAuthIntent(sp.intent);

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/airport-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/45" />
      <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-4 py-8 sm:px-5 sm:py-12 md:py-16">
        <div className="w-full max-w-6xl">
          <Suspense
            fallback={
              <div className="mx-auto w-full max-w-md rounded-2xl border border-white/15 bg-white/95 px-6 py-12 text-center text-slate-600 shadow-lg backdrop-blur-sm sm:px-8 sm:py-14">
                Loading…
              </div>
            }
          >
            <AuthForm initialIntent={initialIntent} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
