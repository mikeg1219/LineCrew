import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { PostJobForm } from "@/app/dashboard/customer/post-job/post-job-form";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ cancelled?: string }>;
};

function HowItWorksPanel() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
        How it works
      </h2>
      <ol className="mt-5 space-y-5">
        <li className="flex gap-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
            1
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="font-medium leading-snug text-slate-900">
              Line Holder goes to your line
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              They head to your queue location and hold your place.
            </p>
          </div>
        </li>
        <li className="flex gap-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
            2
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="font-medium leading-snug text-slate-900">
              Holds your place
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              They stay in line so you don&apos;t lose your spot.
            </p>
          </div>
        </li>
        <li className="flex gap-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
            3
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="font-medium leading-snug text-slate-900">
              You arrive before the front
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Meet them before it&apos;s your turn—swap in, done.
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}

export default async function PostJobPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const cancelled = sp.cancelled === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <DashboardFinishingSetup
        userEmail={user.email ?? ""}
        errorMessage={`We couldn’t load your profile (${profileError.message}). Try again in a moment.`}
      />
    );
  }

  if (!profile) {
    return <DashboardFinishingSetup userEmail={user.email ?? ""} />;
  }

  if (profile.role === "waiter") {
    redirect("/dashboard/waiter");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10 lg:px-6">
      <header className="mb-8 max-w-3xl space-y-3 sm:mb-10">
        <Link
          href="/dashboard/customer"
          className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          ← Back to dashboard
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
          Book a request
        </h1>
        <p className="text-[15px] leading-relaxed text-slate-600 sm:text-base">
          Tell Line Holders where and what queue you need covered across
          airports, events, attractions, retail drops, and services. You&apos;ll pay
          upfront when you post, and LineCrew releases payment only after
          completion.
        </p>
        <p className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3.5 text-sm leading-relaxed text-slate-700 sm:px-5">
          <span className="font-semibold text-slate-900">Cancellation:</span>{" "}
          free cancellation before a Line Holder accepts. After a Line Holder accepts, a{" "}
          <span className="font-semibold">$5</span> cancellation fee applies (paid
          to the Line Holder); the rest is refunded to you.
        </p>
      </header>

      <div className="mb-8 rounded-xl border border-blue-200/90 bg-blue-50/90 px-4 py-3.5 text-center shadow-sm sm:mb-10 sm:px-5 sm:py-4">
        <p className="text-sm font-medium leading-snug text-blue-900">
          Most bookings are accepted in 3–10 minutes
        </p>
      </div>

      {cancelled && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 sm:mb-8 sm:px-5">
          Checkout was cancelled. No charge was made.
        </div>
      )}

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)] lg:items-start lg:gap-x-10 lg:gap-y-0 xl:gap-x-12">
        <div className="order-2 min-w-0 lg:order-1">
          <PostJobForm />
        </div>
        <aside className="order-1 lg:sticky lg:top-20 lg:order-2 lg:self-start">
          <HowItWorksPanel />
        </aside>
      </div>
    </div>
  );
}
