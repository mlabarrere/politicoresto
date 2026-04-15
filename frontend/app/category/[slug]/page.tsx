import { Composer } from "@/components/compose/composer";
import { FeedList } from "@/components/feed/feed-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { PoliticalBlocSidebar } from "@/components/navigation/political-bloc-sidebar";
import { getPoliticalBloc } from "@/lib/data/political-taxonomy";
import { getHomeScreenData } from "@/lib/data/public/home";
import { getCurrentUser } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CategoryPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bloc = getPoliticalBloc(slug);
  const supabase = await createServerSupabaseClient();
  const user = await getCurrentUser(supabase);
  const currentUserId = user?.id ?? null;
  const { data, error } = await getHomeScreenData(bloc?.slug ?? slug, currentUserId);

  return (
    <PageContainer>
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <PoliticalBlocSidebar selectedBloc={bloc?.slug ?? slug} />
        </aside>

        <main className="space-y-4">
          <section className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              Categorie: {bloc?.label ?? slug}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Threads filtres par categorie politique.
            </p>
          </section>

          {currentUserId ? (
            <Composer redirectPath={`/category/${bloc?.slug ?? slug}`} title="Nouveau thread" />
          ) : null}

          {error ? <EmptyState title="Feed partiel" body={`Lecture incomplete: ${error}`} /> : null}

          {data.feed.length ? (
            <FeedList items={data.feed} featuredCount={0} isAuthenticated={Boolean(currentUserId)} />
          ) : (
            <EmptyState
              title="Aucun thread dans cette categorie"
              body="Revenez plus tard ou ouvrez un nouveau thread dans cette categorie."
            />
          )}
        </main>
      </div>
    </PageContainer>
  );
}
