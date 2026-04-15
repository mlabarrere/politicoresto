import type { ThreadFeedItemView } from "@/lib/types/views";

import { ThreadCard } from "@/components/feed/thread-card";

export function FeedList({
  items,
  featuredCount = 1,
  isAuthenticated = false
}: {
  items: ThreadFeedItemView[];
  featuredCount?: number;
  isAuthenticated?: boolean;
}) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <ThreadCard
          key={item.topic_id}
          item={item}
          featured={index < featuredCount}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}
