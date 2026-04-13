import { notFound } from "next/navigation";

import { Composer } from "@/components/compose/composer";
import { FeedList } from "@/components/feed/feed-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { LeaderboardCard } from "@/components/scores/leaderboard-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSpaceDetail } from "@/lib/data/public/spaces";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SpaceDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getSpaceDetail(slug);

  if (!detail?.space) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return (
    <PageContainer>
      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-4">
            <p className="eyebrow">Espace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {detail.space.name}
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {detail.space.description ?? "Espace politique visible dans le cycle presidentiel."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge label={detail.space.space_type} tone="accent" />
              <StatusBadge label={detail.space.visibility} tone="muted" />
            </div>
          </div>

          {session ? (
            <Composer
              redirectPath={`/space/${detail.space.slug}`}
              title="Nouveau thread local"
              spaceId={detail.space.id}
            />
          ) : null}
        </aside>

        <main className="space-y-4">
          {detail.feed.length ? (
            <FeedList items={detail.feed} featuredCount={1} />
          ) : (
            <EmptyState
              title="Aucun thread visible"
              body="L'espace existe, mais aucun thread public n'y remonte encore."
            />
          )}
        </main>

        <aside className="space-y-4">
          <LeaderboardCard
            title="Classement local"
            eyebrow={detail.space.name}
            rows={detail.leaderboard}
          />
        </aside>
      </div>
    </PageContainer>
  );
}
