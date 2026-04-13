import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { FeedList } from "@/components/feed/feed-list";
import { getTopicsScreenData } from "@/lib/data/public/topics";
import { toHomeFeedTopic } from "@/lib/data/public/canonical";

export default async function TopicsPage() {
  const { data, error } = await getTopicsScreenData();
  const items = data.topics.map((topic, index) =>
    toHomeFeedTopic(
      {
        topic_id: topic.id,
        topic_slug: topic.slug,
        topic_title: topic.title,
        topic_description: topic.description,
        topic_status: topic.topic_status,
        visibility: topic.effective_visibility,
        open_at: topic.open_at,
        close_at: topic.close_at,
        created_at: topic.created_at,
        visible_post_count: topic.visible_post_count,
        active_prediction_count: topic.active_prediction_count,
        prediction_type: topic.aggregate?.prediction_type ?? null,
        thread_score: index + 1,
        editorial_feed_rank: index + 1
      } as Record<string, unknown>,
      index + 1
    )
  );

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="rounded-3xl border border-border bg-card p-6">
          <p className="eyebrow">Sujets</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
            Tous les threads
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Vue brute de tous les fils publics visibles.
          </p>
        </section>

        {error ? <EmptyState title="Lecture partielle" body={`Certaines donnees manquent: ${error}`} /> : null}

        {items.length ? (
          <FeedList items={items} featuredCount={0} />
        ) : (
          <EmptyState
            title="Aucun sujet visible pour le moment"
            body="Les sujets publics apparaitront ici des qu'ils seront disponibles."
          />
        )}
      </div>
    </PageContainer>
  );
}
