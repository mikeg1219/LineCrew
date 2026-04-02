import { JobPostSuccessClient } from "@/app/dashboard/customer/job-posted/success/job-post-success-client";
import { Suspense } from "react";

type PageProps = { searchParams: Promise<{ session_id?: string }> };

export default async function JobPostSuccessPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const sessionKey = sp.session_id ?? "no-session";

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-12 text-center text-slate-600">
          Loading…
        </div>
      }
    >
      <JobPostSuccessClient key={sessionKey} />
    </Suspense>
  );
}
