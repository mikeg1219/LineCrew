import { JobPostSuccessClient } from "@/app/dashboard/customer/job-posted/success/job-post-success-client";
import { Suspense } from "react";

export default function JobPostSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-12 text-center text-slate-600">
          Loading…
        </div>
      }
    >
      <JobPostSuccessClient />
    </Suspense>
  );
}
