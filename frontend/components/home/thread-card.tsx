import { ThreadCard as DomainThreadCard } from "@/components/domain/thread-card";
import type { ThreadFeedItemView } from "@/lib/types/views";

export function ThreadCard({
  item,
  isAuthenticated
}: {
  item: ThreadFeedItemView;
  isAuthenticated: boolean;
}) {
  return <DomainThreadCard item={item} isAuthenticated={isAuthenticated} />;
}


