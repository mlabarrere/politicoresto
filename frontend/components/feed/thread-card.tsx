import Link from "next/link";
import type { Route } from "next";

import { StatusBadge } from "@/components/ui/status-badge";
import type { ThreadFeedItemView } from "@/lib/types/views";
import { formatDate, formatNumber } from "@/lib/utils/format";

export function ThreadCard({
  item,
  featured = false
}: {
  item: ThreadFeedItemView;
  featured?: boolean;
}) {
  const authorLabel =
    (item as unknown as { author_display_name?: string | null }).author_display_name ??
    (item as unknown as { author_username?: string | null }).author_username ??
    "Pseudo indisponible";

  return (
    <article
      className={
        featured ? "rounded-2xl border border-border bg-card px-5 py-4" : "rounded-2xl border border-border bg-card px-4 py-3"
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{authorLabel}</span>
        <span>•</span>
        <span>{formatDate(item.last_activity_at)}</span>
        <span>•</span>
        <span>{item.primary_taxonomy_label ?? item.space_name ?? "Global"}</span>
      </div>

      <div className="mt-2">
        <Link
          href={`/thread/${item.topic_slug}` as Route}
          className="block text-balance text-xl font-semibold leading-tight tracking-tight text-foreground hover:underline"
        >
          {item.topic_title}
        </Link>
        {item.topic_description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.topic_description}</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.space_name ? <StatusBadge label={item.space_name} tone="muted" /> : null}
        {item.primary_taxonomy_label ? <StatusBadge label={item.primary_taxonomy_label} tone="accent" /> : null}
        {item.active_prediction_count ? <StatusBadge label="Sondage" tone="info" /> : <StatusBadge label="Discussion" tone="default" />}
      </div>

      {item.discussion_payload.excerpt_text ? (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-foreground/90">
          {item.discussion_payload.excerpt_text}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{formatNumber(item.visible_post_count ?? 0)} messages</span>
          <span>{formatNumber(item.active_prediction_count ?? 0)} reponses sondage</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/thread/${item.topic_slug}#reply-form` as Route} className="font-medium text-foreground hover:underline">
            Repondre vite
          </Link>
          <Link href={`/thread/${item.topic_slug}` as Route} className="font-medium text-muted-foreground hover:text-foreground">
            Ouvrir thread
          </Link>
        </div>
      </div>
    </article>
  );
}
