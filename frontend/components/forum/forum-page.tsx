"use client";

import { useMemo, useState } from "react";

import { CommentThread } from "@/components/forum/comment-thread";
import { PostActionsBar } from "@/components/forum/post-actions-bar";
import { PostCard } from "@/components/forum/post-card";
import { ReplyComposer } from "@/components/forum/reply-composer";
import { RightSidebar } from "@/components/forum/right-sidebar";
import { ThreadToolbar } from "@/components/forum/thread-toolbar";
import { applyVoteTransition, computeNextVote } from "@/lib/forum/vote";
import type { CommentTreeNode, VoteSide } from "@/lib/types/forum";
import type { ForumPageProps, ForumPageState } from "@/lib/types/forum-components";

type VoteEntity = "post" | "comment";

type VoteApiSide = "left" | "right" | "gauche" | "droite" | null;

type VoteResponse = {
  leftVotes: number;
  rightVotes: number;
  currentVote: VoteApiSide;
};

type CommentMutationResponse = {
  comment?: CommentTreeNode;
};

function normalizeVoteSide(value: VoteApiSide): VoteSide {
  if (value === "left" || value === "gauche") return "left";
  if (value === "right" || value === "droite") return "right";
  return null;
}

function mapVoteSideToReaction(value: Exclude<VoteSide, null>): "gauche" | "droite" {
  return value === "left" ? "gauche" : "droite";
}

function updateCommentNode(
  tree: CommentTreeNode[],
  commentId: string,
  updater: (node: CommentTreeNode) => CommentTreeNode
): CommentTreeNode[] {
  return tree.map((node) => {
    if (node.id === commentId) {
      return updater(node);
    }

    if (!node.children.length) {
      return node;
    }

    return {
      ...node,
      children: updateCommentNode(node.children, commentId, updater)
    };
  });
}

function insertReply(tree: CommentTreeNode[], parentCommentId: string, comment: CommentTreeNode): CommentTreeNode[] {
  return tree.map((node) => {
    if (node.id === parentCommentId) {
      return {
        ...node,
        replyCount: node.replyCount + 1,
        children: [...node.children, comment]
      };
    }

    if (!node.children.length) return node;

    return {
      ...node,
      children: insertReply(node.children, parentCommentId, comment)
    };
  });
}

function removeCommentNode(tree: CommentTreeNode[], commentId: string): CommentTreeNode[] {
  return tree
    .filter((node) => node.id !== commentId)
    .map((node) => ({
      ...node,
      children: removeCommentNode(node.children, commentId)
    }));
}

function countComments(tree: CommentTreeNode[]): number {
  return tree.reduce((total, node) => total + 1 + countComments(node.children), 0);
}

async function mutateVote(params: {
  targetType: "thread_post" | "comment";
  targetId: string;
  side: Exclude<VoteSide, null>;
}): Promise<{ leftVotes: number; rightVotes: number; currentVote: VoteSide }> {
  const response = await fetch("/api/reactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      targetType: params.targetType,
      targetId: params.targetId,
      side: mapVoteSideToReaction(params.side)
    })
  });

  if (!response.ok) {
    throw new Error("vote mutation failed");
  }

  const payload = (await response.json()) as VoteResponse;

  return {
    leftVotes: Number(payload.leftVotes ?? 0),
    rightVotes: Number(payload.rightVotes ?? 0),
    currentVote: normalizeVoteSide(payload.currentVote)
  };
}

async function mutateComment(
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>
): Promise<CommentMutationResponse> {
  const response = await fetch("/api/comments", {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error("comment mutation failed");
  }

  return (await response.json()) as CommentMutationResponse;
}

export function ForumPage({ post, comments, currentUserId, postSlug }: ForumPageProps) {
  const [state, setState] = useState<ForumPageState>({
    postStatus: "ready",
    commentsStatus: "ready",
    sortMode: "top",
    collapsedAll: false,
    focusedBranchId: undefined
  });
  const [compactMode, setCompactMode] = useState(false);
  const [postVote, setPostVote] = useState<VoteSide>(post.currentUserVote);
  const [postCounts, setPostCounts] = useState({
    leftCount: post.leftCount,
    rightCount: post.rightCount
  });
  const [tree, setTree] = useState<CommentTreeNode[]>(comments);
  const [showRootComposer, setShowRootComposer] = useState(false);

  const redirectPath = `/post/${postSlug}`;
  const maxInlineDepth = compactMode ? 3 : 6;

  const postView = useMemo(
    () => ({
      ...post,
      leftCount: postCounts.leftCount,
      rightCount: postCounts.rightCount,
      commentCount: countComments(tree)
    }),
    [post, postCounts.leftCount, postCounts.rightCount, tree]
  );

  async function handleVote(entityType: VoteEntity, entityId: string, next: VoteSide) {
    if (!currentUserId) {
      return;
    }

    if (entityType === "post") {
      const previous = { ...postCounts, currentVote: postVote };
      const optimistic = applyVoteTransition(previous, next);

      setPostCounts({ leftCount: optimistic.leftCount, rightCount: optimistic.rightCount });
      setPostVote(optimistic.currentVote);

      const sideForServer = (next ?? previous.currentVote) as Exclude<VoteSide, null> | null;
      if (!sideForServer) return;

      try {
        const payload = await mutateVote({
          targetType: "thread_post",
          targetId: entityId,
          side: sideForServer
        });
        setPostCounts({ leftCount: payload.leftVotes, rightCount: payload.rightVotes });
        setPostVote(payload.currentVote);
      } catch {
        setPostCounts({ leftCount: previous.leftCount, rightCount: previous.rightCount });
        setPostVote(previous.currentVote);
      }

      return;
    }

    const targetNode = findCommentNode(tree, entityId);
    if (!targetNode) return;

    const previous = {
      leftCount: targetNode.leftCount,
      rightCount: targetNode.rightCount,
      currentVote: targetNode.currentUserVote
    };
    const optimistic = applyVoteTransition(previous, next);

    setTree((prev) =>
      updateCommentNode(prev, entityId, (node) => ({
        ...node,
        leftCount: optimistic.leftCount,
        rightCount: optimistic.rightCount,
        currentUserVote: optimistic.currentVote
      }))
    );

    const sideForServer = (next ?? previous.currentVote) as Exclude<VoteSide, null> | null;
    if (!sideForServer) return;

    try {
      const payload = await mutateVote({
        targetType: "comment",
        targetId: entityId,
        side: sideForServer
      });

      setTree((prev) =>
        updateCommentNode(prev, entityId, (node) => ({
          ...node,
          leftCount: payload.leftVotes,
          rightCount: payload.rightVotes,
          currentUserVote: payload.currentVote
        }))
      );
    } catch {
      setTree((prev) =>
        updateCommentNode(prev, entityId, (node) => ({
          ...node,
          leftCount: previous.leftCount,
          rightCount: previous.rightCount,
          currentUserVote: previous.currentVote
        }))
      );
    }
  }

  async function handleRootReplySubmit(payload: { body: string }) {
    const result = await mutateComment("POST", {
      postSlug,
      body: payload.body,
      parentCommentId: null
    });

    if (result.comment) {
      setTree((previous) => [...previous, result.comment as CommentTreeNode]);
    }
    setShowRootComposer(false);
  }

  async function handleReplySubmit(payload: { targetId: string; body: string }) {
    const result = await mutateComment("POST", {
      postSlug,
      body: payload.body,
      parentCommentId: payload.targetId
    });

    if (result.comment) {
      setTree((previous) => insertReply(previous, payload.targetId, result.comment as CommentTreeNode));
    }
  }

  async function handleEditSubmit(payload: { commentId: string; body: string }) {
    await mutateComment("PATCH", {
      commentId: payload.commentId,
      body: payload.body
    });

    setTree((previous) =>
      updateCommentNode(previous, payload.commentId, (node) => ({
        ...node,
        body: payload.body,
        isEdited: true,
        updatedAt: new Date().toISOString()
      }))
    );
  }

  async function handleDeleteSubmit(commentId: string) {
    await mutateComment("DELETE", { commentId });
    setTree((previous) => removeCommentNode(previous, commentId));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]" role="feed" aria-busy={state.commentsStatus === "loading"}>
      <section className="space-y-4" id="thread-main">
        <PostCard post={postView} />

        <PostActionsBar
          postId={post.id}
          currentUserVote={postVote}
          leftCount={postCounts.leftCount}
          rightCount={postCounts.rightCount}
          isAuthenticated={Boolean(currentUserId)}
          redirectPath={redirectPath}
          onVoteChange={(next) => handleVote("post", post.id, computeNextVote(postVote, next))}
          onReplyClick={() => setShowRootComposer(true)}
        />

        <ThreadToolbar
          sortMode={state.sortMode}
          collapsedAll={state.collapsedAll}
          compactMode={compactMode}
          showComposer={showRootComposer}
          composerSlot={
            <ReplyComposer
              targetType="post"
              targetId={post.id}
              onSubmit={(draft) => handleRootReplySubmit({ body: draft.body })}
              onCancel={() => setShowRootComposer(false)}
              autoFocus
            />
          }
          onSortChange={(next) => setState((previous) => ({ ...previous, sortMode: next }))}
          onToggleCollapseAll={() => setState((previous) => ({ ...previous, collapsedAll: !previous.collapsedAll }))}
          onToggleCompactMode={() => setCompactMode((previous) => !previous)}
          onToggleComposer={() => setShowRootComposer((previous) => !previous)}
        />

        <CommentThread
          comments={tree}
          sortMode={state.sortMode}
          currentUserId={currentUserId}
          maxInlineDepth={maxInlineDepth}
          collapsedAll={state.collapsedAll}
          redirectPath={redirectPath}
          onReplySubmit={(draft) => handleReplySubmit({ targetId: draft.targetId, body: draft.body })}
          onEditSubmit={(draft) => handleEditSubmit({ commentId: draft.commentId, body: draft.body })}
          onDeleteSubmit={handleDeleteSubmit}
          onVoteChange={(commentId, next) => handleVote("comment", commentId, next)}
        />
      </section>

      <RightSidebar
        sortMode={state.sortMode}
        totalComments={postView.commentCount}
        onSortChange={(next) => setState((previous) => ({ ...previous, sortMode: next }))}
      />
    </div>
  );
}

function findCommentNode(tree: CommentTreeNode[], commentId: string): CommentTreeNode | null {
  for (const node of tree) {
    if (node.id === commentId) {
      return node;
    }

    if (node.children.length) {
      const inChildren = findCommentNode(node.children, commentId);
      if (inChildren) return inChildren;
    }
  }

  return null;
}

