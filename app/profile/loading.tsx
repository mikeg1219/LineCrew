import { SkeletonAvatar, SkeletonCard, SkeletonText } from "@/components/skeleton";
import { DashboardPageHeader } from "@/components/dashboard-page-header";

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl pb-12" aria-busy="true" aria-label="Loading profile">
      <DashboardPageHeader
        eyebrow="ACCOUNT"
        title="Profile & settings"
        subtitle="Manage your account and preferences."
      />
      <SkeletonCard className="mt-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <SkeletonAvatar size="lg" />
          <div className="w-full flex-1 space-y-3 text-center sm:text-left">
            <SkeletonText className="mx-auto h-6 w-48 sm:mx-0" />
            <SkeletonText className="mx-auto h-4 w-64 sm:mx-0" />
          </div>
        </div>
      </SkeletonCard>
      <div className="mt-8 flex gap-1 border-b border-slate-200 pb-px">
        {[1, 2, 3].map((i) => (
          <SkeletonText key={i} className="h-10 w-24 shrink-0 rounded-lg" />
        ))}
      </div>
      <div className="mt-8 space-y-6">
        <SkeletonCard>
          <SkeletonText className="h-5 w-32" />
          <div className="mt-6 space-y-5">
            <SkeletonText className="h-11 w-full rounded-xl" />
            <SkeletonText className="h-11 w-full rounded-xl" />
            <SkeletonText className="h-24 w-full rounded-xl" />
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}
