import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types/job";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

function airportLabel(code: string) {
  return (
    US_AIRPORTS_TOP_20.find((a) => a.code === code)?.label ?? code
  );
}

export default async function JobPostedPage({ params }: PageProps) {
  const { jobId } = await params;
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

  if (profile?.role !== "customer") {
    redirect("/dashboard");
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error || !job) {
    notFound();
  }

  const j = job as Job;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/80 to-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Job posted
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          We&apos;re finding you a Waiter
        </h1>
        <p className="mt-3 text-slate-600">
          Your listing is live. Waiters can browse open jobs and will connect with
          you here as we add matching.
        </p>

        <dl className="mt-8 space-y-4 border-t border-slate-200 pt-8">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Airport
            </dt>
            <dd className="mt-1 text-slate-900">{airportLabel(j.airport)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Terminal
            </dt>
            <dd className="mt-1 text-slate-900">{j.terminal}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Line type
            </dt>
            <dd className="mt-1 text-slate-900">{j.line_type}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Description
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-900">
              {j.description || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Offered price
            </dt>
            <dd className="mt-1 text-slate-900">
              ${Number(j.offered_price).toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Estimated wait
            </dt>
            <dd className="mt-1 text-slate-900">{j.estimated_wait}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/dashboard/customer/post-job"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Post another job
        </Link>
        <Link
          href="/dashboard/customer"
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
