import { SkeletonAvatar, SkeletonCard, SkeletonText } from "@/components/skeleton";

export default function WaiterJobDetailLoading() {
  return (
    <div
      className="mx-auto w-full max-w-3xl pb-12 pt-8"
      aria-busy="true"
      aria-label="Loading booking"
    >
      <SkeletonText className="h-5 w-44" />
      <SkeletonCard className="mt-6">
        <SkeletonText className="h-4 w-28" />
        <SkeletonText className="mt-3 h-9 w-2/3" />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <SkeletonText className="h-8 w-40 rounded-full" />
        </div>
        <SkeletonText className="mt-6 h-24 w-full rounded-xl" />
      </SkeletonCard>
      <SkeletonCard className="mt-6">
        <SkeletonText className="h-5 w-48" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <SkeletonAvatar size="sm" />
              <SkeletonText className="h-14 flex-1 rounded-2xl" />
            </div>
          ))}
        </div>
      </SkeletonCard>
      <SkeletonCard className="mt-6">
        <div className="flex gap-4">
          <SkeletonAvatar size="md" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonText className="h-5 w-36" />
            <SkeletonText lines={2} />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
