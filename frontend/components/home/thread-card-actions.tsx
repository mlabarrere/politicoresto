"use client";

import Link from "next/link";
import { MessageSquare, Share2 } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";

import { ReactionBar } from "@/components/social/reaction-bar";
import type { ThreadFeedItemView } from "@/lib/types/views";
import { formatNumber } from "@/lib/utils/format";

export function ThreadCardActions({
  item,
  threadHref,
  isAuthenticated
}: {
  item: ThreadFeedItemView;
  threadHref: Route;
  isAuthenticated: boolean;
}) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const commentCount = item.feed_comment_count ?? item.visible_post_count ?? 0;
  const targetPostId = item.feed_thread_post_id ?? null;

  async function onShare() {
    const shareUrl =
      typeof window !== "undefined" ? `${window.location.origin}/thread/${item.topic_slug}` : `/thread/${item.topic_slug}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback("Lien copie");
      } else {
        setShareFeedback("Partage indisponible");
      }
    } catch {
      setShareFeedback("Partage annule");
    }

    window.setTimeout(() => setShareFeedback(null), 1500);
  }

  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        {targetPostId ? (
          <ReactionBar
            targetType="thread_post"
            targetId={targetPostId}
            redirectPath={threadHref}
            leftVotes={item.feed_gauche_count ?? 0}
            rightVotes={item.feed_droite_count ?? 0}
            currentVote={item.feed_user_reaction_side ?? null}
            isAuthenticated={isAuthenticated}
            compact
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Link href={threadHref} className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
          <MessageSquare className="size-3.5" />
          <span>{formatNumber(commentCount)} commentaires</span>
        </Link>
        <button
          type="button"
          onClick={() => void onShare()}
          className="inline-flex items-center gap-1 hover:underline"
        >
          <Share2 className="size-3.5" />
          <span>{shareFeedback ?? "Partager"}</span>
        </button>
      </div>
    </div>
  );
}
