import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingThreadDetail() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="soft-panel p-6 sm:p-8">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="mt-4 h-12 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_320px]">
          <Skeleton className="h-[420px] rounded-xl" />
          <Skeleton className="h-[240px] rounded-xl" />
        </div>
      </div>
    </PageContainer>
  );
}
