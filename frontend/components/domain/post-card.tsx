'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { CornerDownLeft, MessageSquare, Share2 } from 'lucide-react';

import { ReactionBar } from '@/components/social/reaction-bar';
import { PollCardInline } from '@/components/poll/poll-card-inline';
import { AppCard } from '@/components/app/app-card';
import { AppBadge } from '@/components/app/app-badge';
import { AppButton } from '@/components/app/app-button';
import type { PostFeedItemView } from '@/lib/types/views';
import { formatDate, formatNumber } from '@/lib/utils/format';
import { normalizeMultilineText } from '@/lib/utils/multiline';

const PREVIEW_LIMIT = 500;

function truncatePreview(value: string) {
  const text = normalizeMultilineText(value).trim();
  if (!text) return '';
  if (text.length <= PREVIEW_LIMIT) return text;
  return `${text.slice(0, PREVIEW_LIMIT).trimEnd()}...`;
}

export const PostCard = memo(function PostCard({
  item,
  featured = false,
  isAuthenticated = false,
}: {
  item: PostFeedItemView;
  featured?: boolean;
  isAuthenticated?: boolean;
}) {
  const router = useRouter();
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const shareFeedbackTimeoutRef = useRef<number | null>(null);

  const authorLabel =
    (item as unknown as { author_display_name?: string | null })
      .author_display_name ??
    (item as unknown as { author_username?: string | null }).author_username ??
    'Pseudo indisponible';

  const postHref = `/post/${item.topic_slug}` as Route;
  const replyHref = `/post/${item.topic_slug}#reply-form` as Route;
  const targetPostId = item.feed_post_id ?? null;
  const commentCount = item.feed_comment_count ?? item.visible_post_count ?? 0;

  const previewText = useMemo(() => {
    const source =
      item.feed_post_content ??
      item.discussion_payload.excerpt_text ??
      item.topic_description ??
      '';
    return truncatePreview(source);
  }, [
    item.feed_post_content,
    item.discussion_payload.excerpt_text,
    item.topic_description,
  ]);

  const openPost = useCallback(() => {
    router.push(postHref);
  }, [router, postHref]);

  useEffect(() => {
    return () => {
      if (shareFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(shareFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const stopCardNavigation = useCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  }, []);

  const onShare = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const shareUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/post/${item.topic_slug}`
          : `/post/${item.topic_slug}`;

      try {
        if (
          typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function'
        ) {
          await navigator.share({ title: item.topic_title, url: shareUrl });
          setShareFeedback('Partage lance');
        } else if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(shareUrl);
          setShareFeedback('Lien copie');
        } else {
          setShareFeedback('Partage indisponible');
        }
      } catch {
        setShareFeedback('Partage annule');
      }

      if (shareFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(shareFeedbackTimeoutRef.current);
      }
      shareFeedbackTimeoutRef.current = window.setTimeout(() => {
        setShareFeedback(null);
      }, 1800);
    },
    [item.topic_slug, item.topic_title],
  );

  return (
    <AppCard
      as="article"
      className={
        featured ? 'cursor-pointer px-5 py-4' : 'cursor-pointer px-4 py-3'
      }
      onClick={openPost}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPost();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Ouvrir le post ${item.topic_title}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{authorLabel}</span>
        <span>|</span>
        <span>{formatDate(item.last_activity_at)}</span>
        <span>|</span>
        <span>
          {item.primary_taxonomy_label ?? item.space_name ?? 'Global'}
        </span>
      </div>

      <div className="mt-2">
        <h3 className="text-balance text-xl font-semibold leading-tight tracking-tight text-foreground">
          {item.topic_title}
        </h3>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.primary_taxonomy_label ? (
          <AppBadge label={item.primary_taxonomy_label} tone="accent" />
        ) : null}
        <AppBadge label={item.topic_status} tone="muted" />
      </div>

      {previewText ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
          {previewText}
        </p>
      ) : null}

      {item.feed_poll_summary ? (
        <div className="mt-3" onClick={stopCardNavigation}>
          <PollCardInline
            poll={item.feed_poll_summary}
            isAuthenticated={isAuthenticated}
          />
        </div>
      ) : null}

      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"
        onClick={stopCardNavigation}
      >
        <div className="flex items-center gap-3">
          {targetPostId ? (
            <ReactionBar
              targetType="post"
              targetId={targetPostId}
              redirectPath={postHref}
              leftVotes={item.feed_gauche_count ?? 0}
              rightVotes={item.feed_droite_count ?? 0}
              currentVote={item.feed_user_reaction_side ?? null}
              isAuthenticated={isAuthenticated}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <a
            href={replyHref}
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            <CornerDownLeft className="size-3.5" />
            <span>Repondre direct</span>
          </a>

          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            <span>{formatNumber(commentCount)} commentaires</span>
          </span>

          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto border-0 p-0 text-xs"
            onClick={onShare}
          >
            <Share2 className="size-3.5" />
            <span>{shareFeedback ?? 'Partager'}</span>
          </AppButton>
        </div>
      </div>
    </AppCard>
  );
});
