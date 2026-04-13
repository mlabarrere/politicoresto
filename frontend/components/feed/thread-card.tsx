import Link from "next/link";

import { ScoreBadge } from "@/components/scores/score-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import type { HomeFeedTopicView } from "@/lib/types/views";
import { formatDate, formatNumber } from "@/lib/utils/format";

export function ThreadCard({
  item,
  featured = false
}: {
  item: HomeFeedTopicView;
  featured?: boolean;
}) {
  return (
    <article className={featured ? "rounded-3xl border border-border bg-card p-6" : "rounded-3xl border border-border bg-card p-5"}>
      <div className="flex flex-wrap items-center gap-2">
        {item.space_name ? <StatusBadge label={item.space_name} tone="muted" /> : null}
        {item.primary_taxonomy_label ? <StatusBadge label={item.primary_taxonomy_label} tone="accent" /> : null}
        <ScoreBadge label="Score" value={formatNumber(item.editorial_feed_score)} />
      </div>

      <div className="mt-4">
        <Link href={`/topic/${item.topic_slug}`} className="block text-balance text-xl font-semibold tracking-tight text-foreground hover:text-primary">
          {item.topic_title}
        </Link>
        {item.topic_description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted-foreground">{item.topic_description}</p>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">
            {item.prediction_type ? "Bet" : item.active_prediction_count ? "Poll" : "Article"}
          </p>
          <p className="text-xs text-muted-foreground">{item.feed_reason_label}</p>
        </div>
        <p className="mt-2 text-sm font-medium leading-7 text-foreground">
          {item.prediction_question_title ?? item.discussion_payload.excerpt_title ?? item.topic_title}
        </p>
        {item.discussion_payload.excerpt_text ? (
          <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">
            {item.discussion_payload.excerpt_text}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{formatNumber(item.visible_post_count ?? 0)} items</span>
          <span>{formatNumber(item.active_prediction_count ?? 0)} paris</span>
          <span>{formatDate(item.last_activity_at)}</span>
        </div>
        <Link href={`/topic/${item.topic_slug}`} className="text-sm font-medium text-foreground hover:text-primary">
          Ouvrir
        </Link>
      </div>
    </article>
  );
}
