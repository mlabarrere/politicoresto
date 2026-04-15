import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingPostCard({ featured = false }: { featured?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className={featured ? "h-10 w-4/5" : "h-8 w-3/4"} />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.9fr)]">
        <div className="rounded-lg border border-border p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-5 h-8 w-32" />
        </div>
        <div className="rounded-lg border border-border p-4">
          <Skeleton className="h-3 w-20" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
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
        <section className="soft-panel p-6 sm:p-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-12 w-3/4" />
          <Skeleton className="mt-3 h-5 w-2/3" />
          <Skeleton className="mt-8 h-12 w-44 rounded-lg" />
        </section>
        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-60 rounded-xl" />
          </aside>
          <div className="space-y-4">
            <LoadingPostCard featured />
            <LoadingPostCard featured />
            <LoadingPostCard />
          </div>
          <aside className="space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}

