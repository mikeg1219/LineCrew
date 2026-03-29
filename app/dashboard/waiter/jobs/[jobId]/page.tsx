import { LineHolderStatusPanel } from "@/app/dashboard/waiter/jobs/line-holder-status-panel";
import { ProviderBookingTimeline } from "@/app/dashboard/waiter/jobs/provider-booking-timeline";
import { ProviderCustomerCard } from "@/app/dashboard/waiter/jobs/provider-customer-card";
import { RequestExtraTimeForm } from "@/app/dashboard/waiter/jobs/request-extra-time-form";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import { buildProviderTimelineEvents } from "@/lib/provider-booking";
import { PROVIDER_LINE_STATUS_LABELS, statusBadgeClass } from "@/lib/job-status";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ jobId: string }> };

function airportLabel(code: string) {
  return US_AIRPORTS_TOP_20.find((a) => a.code === code)?.label ?? code;
}

export default async function WaiterJobDetailPage({ params }: PageProps) {
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

  if (profile?.role !== "waiter") {
    redirect("/dashboard/customer");
  }

  const { data: row, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const job = row as Job;

  if (job.waiter_id !== user.id) {
    redirect("/dashboard/waiter/browse-jobs");
  }

  const status = job.status as JobStatus;
  const showExtraTimeRequest =
    status === "in_line" || status === "near_front";
  const overageRate = Number(job.overage_rate ?? 10);

  const { data: cust } = await supabase
    .from("profiles")
    .select("first_name, full_name, avatar_url")
    .eq("id", job.customer_id)
    .maybeSingle();

  let customerAvatarPublic: string | null = null;
  if (cust?.avatar_url) {
    const { data: pub } = supabase.storage
      .from("avatars")
      .getPublicUrl(cust.avatar_url);
    customerAvatarPublic = pub.publicUrl;
  }

  const customerDisplayName =
    cust?.first_name?.trim() ||
    cust?.full_name?.trim() ||
    (job.customer_email ? job.customer_email.split("@")[0] : "Customer");

  const timelineEvents = buildProviderTimelineEvents(job);
  const badgeLabel = PROVIDER_LINE_STATUS_LABELS[status];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
      <Link
        href="/dashboard/waiter"
        className="text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        ← Back to dashboard
      </Link>

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Booking
        </p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-slate-900">
          {airportLabel(job.airport)} — {job.line_type}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ring-1 ${statusBadgeClass(status)}`}
          >
            {badgeLabel}
          </span>
          <span className="text-sm text-slate-600">
            Offer ${Number(job.offered_price).toFixed(2)} · Est. wait{" "}
            {job.estimated_wait}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Payment is released after the customer confirms completion (or per
          LineCrew policy).
        </p>
      </header>

      <ProviderCustomerCard
        job={job}
        customerDisplayName={customerDisplayName}
        customerAvatarUrl={customerAvatarPublic}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {status === "pending_confirmation" ? (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Booking marked complete
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Waiting for the customer to confirm. You&apos;ll be paid after they
              confirm or after 15 minutes if they don&apos;t respond.
            </p>
          </div>
        ) : (
          <LineHolderStatusPanel jobId={job.id} currentStatus={status} />
        )}
      </div>

      {showExtraTimeRequest && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Extra time</h2>
          <p className="mt-1 text-sm text-slate-600">
            If the line is slower than expected, request an extra 30 minutes at
            the customer&apos;s agreed rate (${overageRate.toFixed(2)}).
          </p>
          <div className="mt-4 max-w-md">
            <RequestExtraTimeForm jobId={job.id} />
          </div>
        </div>
      )}

      <ProviderBookingTimeline events={timelineEvents} />
    </div>
  );
}
