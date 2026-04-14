import { Composer } from "@/components/compose/composer";
import { FeedList } from "@/components/feed/feed-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { PoliticalBlocSidebar } from "@/components/navigation/political-bloc-sidebar";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPoliticalBloc } from "@/lib/data/political-taxonomy";
import { getHomeScreenData } from "@/lib/data/public/home";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ bloc?: string }>;
}) {
  const { bloc } = await searchParams;
  const selectedBloc = getPoliticalBloc(bloc ?? null);
  const { data, error } = await getHomeScreenData(selectedBloc?.slug ?? null);
  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return (
    <PageContainer>
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <PoliticalBlocSidebar selectedBloc={selectedBloc?.slug ?? null} />
        </aside>

        <main className="space-y-4">
          <section className="rounded-2xl border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge label="Global" tone="info" />
              <StatusBadge label="Presidentielle" tone="muted" />
              {selectedBloc ? <StatusBadge label={selectedBloc.label} tone="accent" /> : null}
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              Feed presidentiel actif
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Posts, commentaires, reponses.</p>
          </section>

          {session ? <Composer redirectPath="/" title="Nouveau thread" /> : null}

          {error ? <EmptyState title="Feed partiel" body={`Lecture incomplete: ${error}`} /> : null}

          {data.feed.length ? (
            <FeedList items={data.feed} featuredCount={0} />
          ) : (
            <EmptyState
              title={selectedBloc ? `Aucun thread dans ${selectedBloc.label}` : "Aucun thread visible"}
              body={
                selectedBloc
                  ? "Ouvrez tous les blocs ou changez de filtre."
                  : "Le feed apparaitra ici des que les premiers threads publics seront publies."
              }
            />
          )}
        </main>
      </div>
    </PageContainer>
  );
}
