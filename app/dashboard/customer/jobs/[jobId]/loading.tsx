import { SkeletonAvatar, SkeletonCard, SkeletonText } from "@/components/skeleton";

export default function CustomerJobDetailLoading() {
  return (
    <div
      className="mx-auto w-full max-w-3xl pb-12 pt-8"
      aria-busy="true"
      aria-label="Loading booking"
    >
      <SkeletonText className="h-5 w-44" />
      <SkeletonCard className="mt-6">
        <SkeletonText className="h-4 w-20" />
        <SkeletonText className="mt-4 h-8 w-4/5" />
        <div className="mt-5 flex flex-wrap gap-3">
          <SkeletonText className="h-8 w-36 rounded-full" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SkeletonText lines={2} />
          <SkeletonText lines={2} />
          <SkeletonText lines={2} />
        </div>
      </SkeletonCard>
      <SkeletonCard className="mt-6">
        <SkeletonText className="h-4 w-28" />
        <div className="mt-6 flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center">
              <SkeletonAvatar size="sm" />
              <SkeletonText className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
      </SkeletonCard>
      <SkeletonCard className="mt-6">
        <div className="flex items-start gap-4">
          <SkeletonAvatar size="lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonText className="h-5 w-40" />
            <SkeletonText lines={2} />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
