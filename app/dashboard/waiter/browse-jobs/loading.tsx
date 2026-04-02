import { SkeletonCard, SkeletonText } from "@/components/skeleton";

export default function BrowseJobsLoading() {
  return (
    <div className="pb-12" aria-busy="true" aria-label="Loading open bookings">
      <div className="mb-6 h-5 w-48 animate-pulse rounded bg-slate-200/80" />
      <div className="mb-8 space-y-2">
        <div className="h-8 w-64 max-w-full rounded bg-slate-200/90 animate-pulse" />
        <SkeletonText className="h-4 w-full max-w-2xl" />
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <li key={i}>
            <SkeletonCard>
              <SkeletonText className="h-3 w-24" />
              <SkeletonText className="mt-2 h-6 w-4/5" />
              <SkeletonText className="mt-4 h-9 w-32" />
              <SkeletonText className="mt-3 h-4 w-full" />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <SkeletonText className="h-11 w-full rounded-lg" />
                <SkeletonText className="h-12 w-full rounded-xl sm:max-w-xs" />
              </div>
            </SkeletonCard>
          </li>
        ))}
      </ul>
    </div>
  );
}
