"use client";

import Link from "next/link";
import type { Route } from "next";
import { MessageSquare } from "lucide-react";

import { AppCard } from "@/components/app/app-card";
import { ReactionBar } from "@/components/social/reaction-bar";
import { HOME_STRINGS } from "@/lib/ui/strings";
import type { PostPollSummaryView, PostFeedItemView } from "@/lib/types/views";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { normalizeMultilineText } from "@/lib/utils/multiline";

function truncatePreview(value: string) {
  const text = normalizeMultilineText(value).trim();
  if (!text) return "";
  return text;
}

function PollPreview({ poll }: { poll: PostPollSummaryView }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {poll.poll_status === "open" ? HOME_STRINGS.pollOpen : HOME_STRINGS.pollClosed}
        </p>
      </div>
      <p className="text-sm text-foreground">{poll.question}</p>
      <p className="text-xs text-muted-foreground">Panel: {poll.sample_size} - Représentativité: {poll.representativity_score.toFixed(1)}</p>
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
  const postSlug = item.topic_slug || item.topic_id;
  const postHref = `/post/${postSlug}` as Route;
  const previewText = truncatePreview(item.feed_post_content ?? item.discussion_payload.excerpt_text ?? item.topic_description ?? "");
  const authorUsername = item.feed_author_username?.trim() || null;
  const authorLabel = authorUsername ? `@${authorUsername}` : HOME_STRINGS.unknownMember;
  const authorHref = authorUsername ? (`/user/${authorUsername}` as Route) : null;

  return (
    <AppCard className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {authorHref ? (
          <Link href={authorHref} className="font-medium text-foreground hover:underline">
            {authorLabel}
          </Link>
        ) : (
          <span className="font-medium text-foreground">{authorLabel}</span>
        )}
        <span>•</span>
        <span>{formatDate(item.last_activity_at)}</span>
      </div>

      <Link href={postHref} className="block">
        <h3 className="text-xl font-semibold tracking-tight text-foreground hover:underline">{item.topic_title}</h3>
      </Link>

      {previewText ? (
        <div className="relative">
          <Link href={postHref} className="group block">
            <p className="max-h-28 overflow-hidden whitespace-pre-wrap text-sm leading-6 text-foreground/90">
              {previewText}
            </p>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
            <p className="mt-1 text-xs font-medium text-foreground group-hover:underline">{HOME_STRINGS.readMore}</p>
          </Link>
        </div>
      ) : null}

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
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            <span>{formatNumber(item.feed_comment_count ?? item.visible_post_count ?? 0)} {HOME_STRINGS.commentsSuffix}</span>
          </span>
        </div>
      </div>
    </AppCard>
  );
}
