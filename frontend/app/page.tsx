import { Composer } from "@/components/compose/composer";
import { FeedList } from "@/components/feed/feed-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { PoliticalBlocSidebar } from "@/components/navigation/political-bloc-sidebar";
import { getHomeScreenData } from "@/lib/data/public/home";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const { data, error } = await getHomeScreenData(null);
  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return (
    <PageContainer>
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <PoliticalBlocSidebar selectedBloc={null} />
        </aside>

        <main className="space-y-4">
          <section className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-sm font-medium text-foreground">Forum politique</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fil public des discussions. Ouvrez un thread, commentez, et repondez clairement.
            </p>
          </section>

          {session ? <Composer redirectPath="/" title="Nouveau thread" /> : null}

          {error ? <EmptyState title="Feed partiel" body={`Lecture incomplete: ${error}`} /> : null}

          {data.feed.length ? (
            <FeedList items={data.feed} featuredCount={0} isAuthenticated={Boolean(session)} />
          ) : (
            <EmptyState
              title="Aucun thread visible"
              body="Le feed apparaitra ici des que les premiers threads publics seront publies."
            />
          )}
        </main>
      </div>
    </PageContainer>
  );
}
