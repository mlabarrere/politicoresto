"use client";

import Link from "next/link";
import type { Route } from "next";
import { MessageSquare } from "lucide-react";

import { AppBadge } from "@/components/app/app-badge";
import { AppButton } from "@/components/app/app-button";
import { AppCard } from "@/components/app/app-card";
import { ReactionBar } from "@/components/social/reaction-bar";
import type { PostPollSummaryView, PostFeedItemView } from "@/lib/types/views";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { normalizeMultilineText } from "@/lib/utils/multiline";

function truncatePreview(value: string) {
  const text = normalizeMultilineText(value).trim();
  if (!text) return "";
  if (text.length <= 420) return text;
  return `${text.slice(0, 420).trimEnd()}...`;
}

function PollPreview({ poll }: { poll: PostPollSummaryView }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Sondage</p>
        <AppBadge label={poll.poll_status === "open" ? "Actif" : "Clos"} tone={poll.poll_status === "open" ? "info" : "muted"} />
      </div>
      <p className="text-sm text-foreground">{poll.question}</p>
      <p className="text-xs text-muted-foreground">Panel: {poll.sample_size} - Representativite: {poll.representativity_score.toFixed(1)}</p>
    </div>
  );
}

export function AppFeedItem({
  item,
  isAuthenticated
}: {
  item: PostFeedItemView;
  isAuthenticated: boolean;
}) {
  const postHref = `/post/${item.topic_slug}` as Route;
  const replyHref = `/post/${item.topic_slug}#reply-form` as Route;
  const previewText = truncatePreview(item.feed_post_content ?? item.discussion_payload.excerpt_text ?? item.topic_description ?? "");

  return (
    <AppCard className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{formatDate(item.last_activity_at)}</span>
        <span>|</span>
        <span>{item.primary_taxonomy_label ?? item.space_name ?? "Global"}</span>
      </div>

      <Link href={postHref} className="block">
        <h3 className="text-xl font-semibold tracking-tight text-foreground hover:underline">{item.topic_title}</h3>
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        {item.primary_taxonomy_label ? <AppBadge label={item.primary_taxonomy_label} tone="accent" /> : null}
        <AppBadge label={item.topic_status} tone="muted" />
      </div>

      {previewText ? <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{previewText}</p> : null}

      {item.feed_poll_summary ? <PollPreview poll={item.feed_poll_summary} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-3">
          {item.feed_post_id ? (
            <ReactionBar
              targetType="post"
              targetId={item.feed_post_id}
              redirectPath={postHref}
              leftVotes={item.feed_gauche_count ?? 0}
              rightVotes={item.feed_droite_count ?? 0}
              currentVote={item.feed_user_reaction_side ?? null}
              isAuthenticated={isAuthenticated}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Link href={replyHref} className="font-medium text-foreground hover:underline">Repondre</Link>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            <span>{formatNumber(item.feed_comment_count ?? item.visible_post_count ?? 0)} commentaires</span>
          </span>
          <AppButton href={postHref} variant="secondary" size="sm">Ouvrir</AppButton>
        </div>
      </div>
    </AppCard>
  );
}

export function AppPollFeedItem({ row }: { row: PostPollSummaryView }) {
  return (
    <AppCard className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{row.question}</h3>
        <AppBadge label={row.poll_status === "open" ? "Actif" : "Clos"} tone={row.poll_status === "open" ? "info" : "muted"} />
      </div>
      <p className="text-xs text-muted-foreground">Representativite {row.representativity_score.toFixed(1)} / 100 - Panel {row.sample_size}</p>
      <div className="flex items-center gap-2">
        <AppButton href={`/post/${row.post_slug}` as Route} variant="secondary" size="sm">Voir detail</AppButton>
        <AppButton href={`/post/${row.post_slug}` as Route} variant="ghost" size="sm">Post source</AppButton>
      </div>
    </AppCard>
  );
}
