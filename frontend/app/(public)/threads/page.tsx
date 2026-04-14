import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { FeedList } from "@/components/feed/feed-list";
import { getThreadsScreenData } from "@/lib/data/public/threads";
import { toHomeFeedTopic } from "@/lib/data/public/canonical";

export default async function ThreadsPage() {
  const { data, error } = await getThreadsScreenData();
  const items = data.threads.map((thread, index) =>
    toHomeFeedTopic(
      {
        topic_id: thread.id,
        topic_slug: thread.slug,
        topic_title: thread.title,
        topic_description: thread.description,
        topic_status: thread.topic_status,
        visibility: thread.effective_visibility,
        open_at: thread.open_at,
        close_at: thread.close_at,
        created_at: thread.created_at,
        visible_post_count: thread.visible_post_count,
        active_prediction_count: thread.active_prediction_count,
        prediction_type: thread.aggregate?.prediction_type ?? null,
        thread_score: index + 1,
        editorial_feed_rank: index + 1
      } as Record<string, unknown>,
      index + 1
    )
  );

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm font-medium text-foreground">Archive du feed</p>
          <p className="mt-1 text-xs text-muted-foreground">Liste brute des threads publics.</p>
        </section>

        {error ? <EmptyState title="Lecture partielle" body={`Certaines donnees manquent: ${error}`} /> : null}

        {items.length ? (
          <FeedList items={items} featuredCount={0} />
        ) : (
          <EmptyState
            title="Aucun thread visible pour le moment"
            body="Les threads publics apparaitront ici des qu'ils seront disponibles."
          />
        )}
      </div>
    </PageContainer>
  );
}
