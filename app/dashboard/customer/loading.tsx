import { SkeletonCard, SkeletonText } from "@/components/skeleton";
import { DashboardPageHeader } from "@/components/dashboard-page-header";

export default function CustomerDashboardLoading() {
  return (
    <div className="pb-12" aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-8 h-5 w-40 animate-pulse rounded bg-slate-200/80" />
      <DashboardPageHeader
        eyebrow="CUSTOMER"
        title="Book a Line Holder"
        subtitle="Reserve someone to hold your place in line across airports, events, retail drops, restaurants, and services."
      />
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <SkeletonText className="h-14 w-full max-w-md rounded-[14px] sm:h-12" />
      </div>
      <div className="mt-8">
        <div className="h-12 w-full max-w-xs rounded-[14px] bg-slate-200/90 animate-pulse sm:w-48" />
      </div>
      <SkeletonCard className="mt-10">
        <SkeletonText className="h-4 w-24" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <SkeletonText lines={2} />
          <SkeletonText lines={2} />
          <SkeletonText lines={2} />
        </div>
      </SkeletonCard>

      <section className="mt-12 border-t border-slate-200 pt-10">
        <div className="h-7 w-40 rounded bg-slate-200/90 animate-pulse" />
        <ul className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <SkeletonCard>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <SkeletonText className="h-6 w-3/4" />
                    <div className="flex flex-wrap gap-4">
                      <SkeletonText className="h-4 w-28" />
                      <SkeletonText className="h-4 w-40" />
                    </div>
                    <SkeletonText className="h-6 w-24 rounded-full" />
                  </div>
                  <SkeletonText className="h-10 w-full rounded-lg sm:w-32" />
                </div>
              </SkeletonCard>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
