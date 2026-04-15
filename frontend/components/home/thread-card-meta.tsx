import type { ThreadFeedItemView } from "@/lib/types/views";
import { formatDate } from "@/lib/utils/format";

export function ThreadCardMeta({ item, authorLabel }: { item: ThreadFeedItemView; authorLabel: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>{authorLabel}</span>
      <span>•</span>
      <span>{formatDate(item.last_activity_at)}</span>
      <span>•</span>
      <span>{item.primary_taxonomy_label ?? item.space_name ?? "Global"}</span>
    </div>
  );
}

