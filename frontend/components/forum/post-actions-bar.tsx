"use client";

import { Flag, MessageSquare, Share2 } from "lucide-react";
import { useState } from "react";

import { AppButton } from "@/components/app/app-button";
import { VoteBinaryLR } from "@/components/forum/vote-binary-lr";
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
        await navigator.share({ title: "Post", url });
        setFeedback("Partage lance");
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setFeedback("Lien copie");
      } else {
        setFeedback("Partage indisponible");
      }
    } catch {
      setFeedback("Partage annule");
    }

    window.setTimeout(() => setFeedback(null), 1800);
  }

  function onReport() {
    setFeedback("Signalement enregistre");
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
          <AppButton type="button" variant="secondary" onClick={onReplyClick}>
            <MessageSquare className="size-3.5" /> Commenter
          </AppButton>
          <AppButton type="button" variant="secondary" onClick={() => void onShare()}>
            <Share2 className="size-3.5" /> Partager
          </AppButton>
          <AppButton type="button" variant="secondary" onClick={onReport}>
            <Flag className="size-3.5" /> Signaler
          </AppButton>
        </div>
      </div>

      {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
    </div>
  );
}
