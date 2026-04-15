"use client";

import { Flag, MessageSquare, Share2 } from "lucide-react";
import { useState } from "react";

import { VoteBinaryLR } from "@/components/forum/vote-binary-lr";
import { Button } from "@/components/ui/button";
import type { PostActionsBarProps } from "@/lib/types/forum-components";

export function PostActionsBar({
  postId,
  currentUserVote,
  leftCount,
  rightCount,
  isAuthenticated,
  redirectPath,
  onVoteChange,
  onReplyClick
}: PostActionsBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : redirectPath;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "Thread", url });
        setFeedback("Partage lancé");
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setFeedback("Lien copié");
      } else {
        setFeedback("Partage indisponible");
      }
    } catch {
      setFeedback("Partage annulé");
    }

    window.setTimeout(() => setFeedback(null), 1800);
  }

  function onReport() {
    setFeedback("Signalement enregistré");
    window.setTimeout(() => setFeedback(null), 1800);
  }

  return (
    <div className="space-y-2 app-card px-3 py-2" aria-label="Actions du post" data-post-id={postId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VoteBinaryLR
          entityType="post"
          value={currentUserVote}
          leftCount={leftCount}
          rightCount={rightCount}
          onChange={(next) => void onVoteChange(next)}
          isAuthenticated={isAuthenticated}
          redirectPath={redirectPath}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onReplyClick}>
            <MessageSquare className="size-3.5" /> Commenter
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onShare()}>
            <Share2 className="size-3.5" /> Partager
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onReport}>
            <Flag className="size-3.5" /> Signaler
          </Button>
        </div>
      </div>

      {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
    </div>
  );
}




