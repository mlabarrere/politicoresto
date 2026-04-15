"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { StatusBadge } from "@/components/ui/status-badge";
import { ThreadCardActions } from "@/components/home/thread-card-actions";
import { ThreadCardMeta } from "@/components/home/thread-card-meta";
import type { ThreadFeedItemView } from "@/lib/types/views";
import { normalizeMultilineText } from "@/lib/utils/multiline";

const EXCERPT_LIMIT = 220;

function truncateExcerpt(value: string) {
  const text = normalizeMultilineText(value).trim();
  if (!text) return "";
  if (text.length <= EXCERPT_LIMIT) return text;
  return `${text.slice(0, EXCERPT_LIMIT).trimEnd()}...`;
}

export function ThreadCard({
  item,
  isAuthenticated
}: {
  item: ThreadFeedItemView;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const authorLabel =
    (item as unknown as { author_display_name?: string | null }).author_display_name ??
    (item as unknown as { author_username?: string | null }).author_username ??
    "Pseudo indisponible";
  const threadHref = `/thread/${item.topic_slug}` as Route;
  const excerpt = useMemo(() => {
    const source = item.feed_thread_post_content ?? item.discussion_payload.excerpt_text ?? item.topic_description ?? "";
    return truncateExcerpt(source);
  }, [item.feed_thread_post_content, item.discussion_payload.excerpt_text, item.topic_description]);

  return (
    <article
      className="rounded-2xl border border-border bg-card px-4 py-3"
      role="link"
      tabIndex={0}
      aria-label={`Ouvrir le thread ${item.topic_title}`}
      onClick={() => router.push(threadHref)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(threadHref);
        }
      }}
    >
      <ThreadCardMeta item={item} authorLabel={authorLabel} />

      <h3 className="mt-2 text-lg font-semibold leading-tight tracking-tight text-foreground">{item.topic_title}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {item.primary_taxonomy_label ? <StatusBadge label={item.primary_taxonomy_label} tone="accent" /> : null}
        <StatusBadge label={item.topic_status} tone="muted" />
      </div>

      {excerpt ? <p className="mt-3 text-sm leading-6 text-foreground/90">{excerpt}</p> : null}

      <ThreadCardActions item={item} threadHref={threadHref} isAuthenticated={isAuthenticated} />
    </article>
  );
}

