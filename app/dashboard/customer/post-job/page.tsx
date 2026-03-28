import { PostJobForm } from "@/app/dashboard/customer/post-job/post-job-form";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ cancelled?: string }>;
};

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/dashboard");
  }

  if (profile.role === "waiter") {
    redirect("/dashboard/waiter");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <Link
          href="/dashboard/customer"
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          Post a job
        </h1>
        <p className="mt-2 text-slate-600">
          Tell Waiters where you need someone in line. You&apos;ll pay upfront
          when you post; LineCrew holds the payment until the job is completed,
          then pays your Waiter (minus a 20% platform fee).
        </p>
      </div>

      {cancelled && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Checkout was cancelled. No charge was made.
        </div>
      )}

      <PostJobForm />
    </div>
  );
}
