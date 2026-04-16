"use client";

import { memo, useMemo, useState } from "react";

import { CommentActionsMenu } from "@/components/forum/comment-actions-menu";
import { EditComposer } from "@/components/forum/edit-composer";
import { ReplyComposer } from "@/components/forum/reply-composer";
import { VoteBinaryLR } from "@/components/forum/vote-binary-lr";
import { AppButton } from "@/components/app/app-button";
import { AppCard } from "@/components/app/app-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { transitionCommentNodeMode, type CommentNodeMode } from "@/lib/forum/fsm";
import { getIndentPx } from "@/lib/forum/comments";
import type { CommentNodeProps } from "@/lib/types/forum-components";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

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
  onVoteChange
}: CommentNodeProps) {
  const [mode, setMode] = useState<CommentNodeMode>("read");
  const [collapsedChildren, setCollapsedChildren] = useState(false);

  const isSubmitting = mode === "submittingReply" || mode === "submittingEdit";
  const canEdit = currentUserId === node.author.id;
  const indentPx = getIndentPx(depth, maxInlineDepth, maxInlineDepth <= 3);
  const showDepthBadge = depth >= maxInlineDepth;
  const childrenCollapsed = collapsedAll || collapsedChildren;

  const modeLabel = useMemo(() => {
    if (mode === "replying" || mode === "submittingReply") return "reply";
    if (mode === "editing" || mode === "submittingEdit") return "edit";
    return "read";
  }, [mode]);

  async function handleReply(body: { body: string }) {
    setMode((previous) => transitionCommentNodeMode(previous, { type: "SUBMIT_REPLY" }));

    try {
      await onReplySubmit({
        targetType: "comment",
        targetId: node.id,
        parentCommentId: node.id,
        body: body.body
      });
      setMode((previous) => transitionCommentNodeMode(previous, { type: "SUBMIT_SUCCESS" }));
    } catch {
      setMode((previous) => transitionCommentNodeMode(previous, { type: "SUBMIT_ERROR" }));
      throw new Error("reply failed");
    }
  }

  async function handleEdit(body: { body: string }) {
    setMode((previous) => transitionCommentNodeMode(previous, { type: "SUBMIT_EDIT" }));

    try {
      await onEditSubmit({ commentId: node.id, body: body.body });
      setMode((previous) => transitionCommentNodeMode(previous, { type: "SUBMIT_SUCCESS" }));
    } catch {
      setMode((previous) => transitionCommentNodeMode(previous, { type: "SUBMIT_ERROR" }));
      throw new Error("edit failed");
    }
  }

  async function handleDelete() {
    if (isSubmitting) return;
    await onDeleteSubmit(node.id);
  }

  function handleCopyLink() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(`${window.location.href.split("#")[0]}#comment-${node.id}`);
  }

  return (
    <div style={{ marginLeft: indentPx }} className="space-y-2" id={`comment-${node.id}`} data-depth={depth} data-mode={modeLabel}>
      <AppCard as="article" className={cn("px-3 py-3 shadow-sm", showDepthBadge && "border-dashed")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback>{node.author.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{node.author.username}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(node.createdAt)} {node.isEdited ? "• modifié" : ""}
              </p>
            </div>
          </div>

          <CommentActionsMenu
            canEdit={canEdit}
            canDelete={canEdit}
            disabled={isSubmitting}
            onEdit={() => setMode((previous) => transitionCommentNodeMode(previous, { type: "START_EDIT" }))}
            onDelete={() => void handleDelete()}
            onCopyLink={handleCopyLink}
          />
        </div>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/95">{node.body}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSubmitting}
            onClick={() => setMode((previous) => transitionCommentNodeMode(previous, { type: "START_REPLY" }))}
          >
            Répondre
          </AppButton>

          <VoteBinaryLR
            entityType="comment"
            value={node.currentUserVote}
            leftCount={node.leftCount}
            rightCount={node.rightCount}
            disabled={isSubmitting}
            onChange={(next) => void onVoteChange(node.id, next)}
            isAuthenticated={Boolean(currentUserId)}
            redirectPath={redirectPath}
          />

          {node.children.length ? (
            <AppButton
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setCollapsedChildren((previous) => !previous)}
            >
              {childrenCollapsed ? `Afficher ${node.children.length}` : `Masquer ${node.children.length}`}
            </AppButton>
          ) : null}
        </div>

        {(mode === "replying" || mode === "submittingReply") && (
          <div className="mt-3">
            <ReplyComposer
              targetType="comment"
              targetId={node.id}
              parentCommentId={node.id}
              onSubmit={(draft) => handleReply({ body: draft.body })}
              onCancel={() => setMode((previous) => transitionCommentNodeMode(previous, { type: "CANCEL" }))}
              mentionPrefix={`@${node.author.username} `}
              autoFocus
            />
          </div>
        )}

        {(mode === "editing" || mode === "submittingEdit") && (
          <div className="mt-3">
            <EditComposer
              commentId={node.id}
              initialValue={node.body}
              onSubmit={(draft) => handleEdit({ body: draft.body })}
              onCancel={() => setMode((previous) => transitionCommentNodeMode(previous, { type: "CANCEL" }))}
            />
          </div>
        )}
      </AppCard>

      {!childrenCollapsed && node.children.length ? (
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
              onVoteChange={onVoteChange}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const CommentNode = memo(CommentNodeBase);



