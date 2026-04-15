import { EmptyState } from "@/components/layout/empty-state";
import { ThreadCard } from "@/components/home/thread-card";
import type { FeedSortMode } from "@/lib/types/homepage";
import type { ThreadFeedItemView } from "@/lib/types/views";

function sortItems(items: ThreadFeedItemView[], sortMode: FeedSortMode) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sortMode === "recent") {
      return new Date(b.last_activity_at ?? b.open_at ?? 0).getTime() - new Date(a.last_activity_at ?? a.open_at ?? 0).getTime();
    }

    if (sortMode === "most_comments") {
      return Number((b.feed_comment_count ?? b.visible_post_count ?? 0) - (a.feed_comment_count ?? a.visible_post_count ?? 0));
    }

    return Number((b.editorial_feed_score ?? 0) - (a.editorial_feed_score ?? 0));
  });

  return sorted;
}

export function ThreadFeed({
  items,
  isAuthenticated,
  sortMode
}: {
  items: ThreadFeedItemView[];
  isAuthenticated: boolean;
  sortMode: FeedSortMode;
}) {
  const sortedItems = sortItems(items, sortMode);

  if (!sortedItems.length) {
    return (
      <EmptyState
        title="Aucun thread visible"
        body="Le feed apparaitra ici quand les premiers threads publics seront publies."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sortedItems.map((item) => (
        <ThreadCard key={item.topic_id} item={item} isAuthenticated={isAuthenticated} />
      ))}
    </div>
  );
}
