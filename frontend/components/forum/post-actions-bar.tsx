'use client';

import { Flag, MessageSquare, Share2 } from 'lucide-react';
import { useState } from 'react';

import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import { ReactionBar } from '@/components/social/reaction-bar';
import { toBackendVoteSide } from '@/lib/forum/vote';
import type { PostActionsBarProps } from '@/lib/types/forum-components';

export function PostActionsBar({
  postId,
  currentUserVote,
  leftCount,
  rightCount,
  isAuthenticated,
  redirectPath,
  onReplyClick,
}: PostActionsBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onShare() {
    const url =
      typeof window !== 'undefined' ? window.location.href : redirectPath;

    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({ title: 'Post', url });
        setFeedback('Partage lancé');
      } else if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(url);
        setFeedback('Lien copié');
      } else {
        setFeedback('Partage indisponible');
      }
    } catch {
      setFeedback('Partage annulé');
    }

    window.setTimeout(() => setFeedback(null), 1800);
  }

  function onReport() {
    setFeedback('Signalement enregistré');
    window.setTimeout(() => setFeedback(null), 1800);
  }

  return (
    <AppCard
      className="space-y-2 px-3 py-2"
      aria-label="Actions du post"
      data-post-id={postId}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReactionBar
          targetType="post"
          targetId={postId}
          redirectPath={redirectPath}
          leftVotes={leftCount}
          rightVotes={rightCount}
          currentVote={toBackendVoteSide(currentUserVote)}
          isAuthenticated={isAuthenticated}
        />

        <div className="flex flex-wrap items-center gap-2">
          <AppButton type="button" variant="secondary" onClick={onReplyClick}>
            <MessageSquare className="size-3.5" /> Commenter
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => void onShare()}
          >
            <Share2 className="size-3.5" /> Partager
          </AppButton>
          <AppButton type="button" variant="secondary" onClick={onReport}>
            <Flag className="size-3.5" /> Signaler
          </AppButton>
        </div>
      </div>

      {feedback ? (
        <p className="text-xs text-muted-foreground">{feedback}</p>
      ) : null}
    </AppCard>
  );
}
