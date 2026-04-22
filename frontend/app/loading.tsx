import { AppCard } from '@/components/app/app-card';
import { AppSkeleton } from '@/components/app/app-skeleton';
import { PageContainer } from '@/components/layout/page-container';

function LoadingPostCard({ featured = false }: { featured?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex gap-2">
        <AppSkeleton className="h-7 w-24 rounded-full" />
        <AppSkeleton className="h-7 w-24 rounded-full" />
        <AppSkeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <AppSkeleton className={featured ? 'h-10 w-4/5' : 'h-8 w-3/4'} />
        <AppSkeleton className="h-4 w-full" />
        <AppSkeleton className="h-4 w-2/3" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.9fr)]">
        <div className="rounded-lg border border-border p-4">
          <AppSkeleton className="h-3 w-24" />
          <AppSkeleton className="mt-3 h-4 w-full" />
          <AppSkeleton className="mt-5 h-8 w-32" />
        </div>
        <div className="rounded-lg border border-border p-4">
          <AppSkeleton className="h-3 w-20" />
          <div className="mt-4 space-y-3">
            <AppSkeleton className="h-4 w-full" />
            <AppSkeleton className="h-4 w-full" />
            <AppSkeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeLoading() {
  return (
    <PageContainer>
      <div className="space-y-8">
        <AppCard className="p-6 sm:p-8">
          <AppSkeleton className="h-4 w-40" />
          <AppSkeleton className="mt-4 h-12 w-3/4" />
          <AppSkeleton className="mt-3 h-5 w-2/3" />
          <AppSkeleton className="mt-8 h-12 w-44 rounded-lg" />
        </AppCard>
        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="space-y-6">
            <AppSkeleton className="h-64 rounded-xl" />
            <AppSkeleton className="h-60 rounded-xl" />
          </aside>
          <div className="space-y-4">
            <LoadingPostCard featured />
            <LoadingPostCard featured />
            <LoadingPostCard />
          </div>
          <aside className="space-y-6">
            <AppSkeleton className="h-64 rounded-xl" />
            <AppSkeleton className="h-64 rounded-xl" />
            <AppSkeleton className="h-64 rounded-xl" />
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}
