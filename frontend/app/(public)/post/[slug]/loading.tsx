import { AppCard } from "@/components/app/app-card";
import { AppSkeleton } from "@/components/app/app-skeleton";
import { PageContainer } from "@/components/layout/page-container";

export default function LoadingPostDetail() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <AppCard className="p-6 sm:p-8">
          <AppSkeleton className="h-8 w-24 rounded-full" />
          <AppSkeleton className="mt-4 h-12 w-3/4" />
          <AppSkeleton className="mt-3 h-4 w-full" />
          <AppSkeleton className="mt-2 h-4 w-2/3" />
        </AppCard>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_320px]">
          <AppSkeleton className="h-[420px] rounded-xl" />
          <AppSkeleton className="h-[240px] rounded-xl" />
        </div>
      </div>
    </PageContainer>
  );
}
