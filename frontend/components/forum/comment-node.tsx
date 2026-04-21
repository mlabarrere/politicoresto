'use client';

import { memo, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';

import { CommentActionsMenu } from '@/components/forum/comment-actions-menu';
import { EditComposer } from '@/components/forum/edit-composer';
import { ReplyComposer } from '@/components/forum/reply-composer';
import { ReactionBar } from '@/components/social/reaction-bar';
import { toBackendVoteSide } from '@/lib/forum/vote';
import { CornerDownLeft } from 'lucide-react';
import { AppAvatar, AppAvatarFallback } from '@/components/app/app-avatar';
import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import {
  transitionCommentNodeMode,
  type CommentNodeMode,
} from '@/lib/forum/fsm';
import { getIndentPx } from '@/lib/forum/comments';
import type { CommentNodeProps } from '@/lib/types/forum-components';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

function CommentNodeBase({
  node,
  depth,
  maxInlineDepth,
  currentUserId,
  collapsedAll,
  redirectPath,
  onReplySubmit,
  onEditSubmit,
  onDeleteSubmit,
}: CommentNodeProps) {
  const [mode, setMode] = useState<CommentNodeMode>('read');
  const [localCollapsed, setLocalCollapsed] = useState<boolean | null>(null);

  const isSubmitting = mode === 'submittingReply' || mode === 'submittingEdit';
  const canEdit = currentUserId === node.author.id;
  const canReply = depth < 1;
  const indentPx = getIndentPx(depth, maxInlineDepth, maxInlineDepth <= 3);
  const showDepthBadge = depth >= maxInlineDepth;
  const childrenCollapsed = localCollapsed ?? collapsedAll;

  const modeLabel = useMemo(() => {
    if (mode === 'replying' || mode === 'submittingReply') return 'reply';
    if (mode === 'editing' || mode === 'submittingEdit') return 'edit';
    return 'read';
  }, [mode]);

  async function handleReply(body: { body: string }) {
    setMode((previous) =>
      transitionCommentNodeMode(previous, { type: 'SUBMIT_REPLY' }),
    );

    try {
      await onReplySubmit({
        targetType: 'comment',
        targetId: node.id,
        parentCommentId: node.id,
        body: body.body,
      });
      setMode((previous) =>
        transitionCommentNodeMode(previous, { type: 'SUBMIT_SUCCESS' }),
      );
    } catch {
      setMode((previous) =>
        transitionCommentNodeMode(previous, { type: 'SUBMIT_ERROR' }),
      );
      throw new Error('reply failed');
    }
  }

  async function handleEdit(body: { body: string }) {
    setMode((previous) =>
      transitionCommentNodeMode(previous, { type: 'SUBMIT_EDIT' }),
    );

    try {
      await onEditSubmit({ commentId: node.id, body: body.body });
      setMode((previous) =>
        transitionCommentNodeMode(previous, { type: 'SUBMIT_SUCCESS' }),
      );
    } catch {
      setMode((previous) =>
        transitionCommentNodeMode(previous, { type: 'SUBMIT_ERROR' }),
      );
      throw new Error('edit failed');
    }
  }

  async function handleDelete() {
    if (isSubmitting) return;
    await onDeleteSubmit(node.id);
  }

  function handleCopyLink() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(
      `${window.location.href.split('#')[0]}#comment-${node.id}`,
    );
  }

  return (
    <div
      style={{ marginLeft: indentPx }}
      className="space-y-2"
      id={`comment-${node.id}`}
      data-depth={depth}
      data-mode={modeLabel}
    >
      <AppCard
        as="article"
        className={cn('px-3 py-3 shadow-sm', showDepthBadge && 'border-dashed')}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AppAvatar size="sm">
              <AppAvatarFallback>
                {node.author.username.slice(0, 2).toUpperCase()}
              </AppAvatarFallback>
            </AppAvatar>
            <div>
              {node.author.slug ? (
                <Link
                  href={`/user/${node.author.slug}` as Route}
                  className="text-sm font-semibold text-foreground hover:underline"
                >
                  @{node.author.username}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-foreground">
                  @{node.author.username}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(node.createdAt)} {node.isEdited ? '• modifié' : ''}
              </p>
            </div>
          </div>

          <CommentActionsMenu
            canEdit={canEdit}
            canDelete={canEdit}
            disabled={isSubmitting}
            onEdit={() =>
              setMode((previous) =>
                transitionCommentNodeMode(previous, { type: 'START_EDIT' }),
              )
            }
            onDelete={() => void handleDelete()}
            onCopyLink={handleCopyLink}
          />
        </div>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/95">
          {node.body}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canReply ? (
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() =>
                setMode((previous) =>
                  transitionCommentNodeMode(previous, { type: 'START_REPLY' }),
                )
              }
              aria-label="Répondre au commentaire"
            >
              <CornerDownLeft className="size-3.5" />
              <span className="sr-only">Répondre</span>
            </AppButton>
          ) : null}

          <ReactionBar
            targetType="comment"
            targetId={node.id}
            redirectPath={redirectPath}
            leftVotes={node.leftCount}
            rightVotes={node.rightCount}
            currentVote={toBackendVoteSide(node.currentUserVote)}
            isAuthenticated={Boolean(currentUserId)}
            compact
          />

          {node.children.length ? (
            <AppButton
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setLocalCollapsed(childrenCollapsed ? false : true);
              }}
            >
              {childrenCollapsed
                ? `Afficher ${node.children.length}`
                : `Masquer ${node.children.length}`}
            </AppButton>
          ) : null}
        </div>

        {canReply && (mode === 'replying' || mode === 'submittingReply') && (
          <div className="mt-3">
            <ReplyComposer
              targetType="comment"
              targetId={node.id}
              parentCommentId={node.id}
              onSubmit={(draft) => handleReply({ body: draft.body })}
              onCancel={() =>
                setMode((previous) =>
                  transitionCommentNodeMode(previous, { type: 'CANCEL' }),
                )
              }
              mentionPrefix={`@${node.author.username} `}
              autoFocus
            />
          </div>
        )}

        {(mode === 'editing' || mode === 'submittingEdit') && (
          <div className="mt-3">
            <EditComposer
              commentId={node.id}
              initialValue={node.body}
              onSubmit={(draft) => handleEdit({ body: draft.body })}
              onCancel={() =>
                setMode((previous) =>
                  transitionCommentNodeMode(previous, { type: 'CANCEL' }),
                )
              }
            />
          </div>
        )}
      </AppCard>

      {!childrenCollapsed && node.children.length && depth < 1 ? (
        <div className="space-y-2">
          {node.children.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              maxInlineDepth={maxInlineDepth}
              currentUserId={currentUserId}
              collapsedAll={collapsedAll}
              redirectPath={redirectPath}
              onReplySubmit={onReplySubmit}
              onEditSubmit={onEditSubmit}
              onDeleteSubmit={onDeleteSubmit}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const CommentNode = memo(CommentNodeBase);
