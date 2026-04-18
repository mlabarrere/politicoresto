"use client";

import { useMemo, useState } from "react";

import { CommentThread } from "@/components/forum/comment-thread";
import { PostActionsBar } from "@/components/forum/post-actions-bar";
import { PostCard } from "@/components/forum/post-card";
import { PostToolbar } from "@/components/forum/post-toolbar";
import { ReplyComposer } from "@/components/forum/reply-composer";
import type { CommentTreeNode } from "@/lib/types/forum";
import type { ForumPageProps, ForumPageState } from "@/lib/types/forum-components";

type CommentMutationResponse = {
  comment?: CommentTreeNode;
};

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

function updateCommentBody(
  tree: CommentTreeNode[],
  commentId: string,
  body: string
): CommentTreeNode[] {
  return tree.map((node) => {
    if (node.id === commentId) {
      return { ...node, body, isEdited: true, updatedAt: new Date().toISOString() };
    }
    if (!node.children.length) return node;
    return { ...node, children: updateCommentBody(node.children, commentId, body) };
  });
}

function countComments(tree: CommentTreeNode[]): number {
  return tree.reduce((total, node) => total + 1 + countComments(node.children), 0);
}

async function mutateComment(
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>
): Promise<CommentMutationResponse> {
  const response = await fetch("/api/comments", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error("comment mutation failed");
  }

  return (await response.json()) as CommentMutationResponse;
}

export function ForumPage({ post, comments, currentUserId, postSlug }: ForumPageProps) {
  const [sortMode, setSortMode] = useState<ForumPageState["sortMode"]>("top");
  const [tree, setTree] = useState<CommentTreeNode[]>(comments);
  const [showRootComposer, setShowRootComposer] = useState(false);

  const redirectPath = `/post/${postSlug}`;

  const postView = useMemo(() => ({
    ...post,
    commentCount: countComments(tree)
  }), [post, tree]);

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
    await mutateComment("PATCH", { commentId: payload.commentId, body: payload.body });
    setTree((previous) => updateCommentBody(previous, payload.commentId, payload.body));
  }

  async function handleDeleteSubmit(commentId: string) {
    await mutateComment("DELETE", { commentId });
    setTree((previous) => removeCommentNode(previous, commentId));
  }

  return (
    <div className="grid gap-4">
      <section className="space-y-4" id="post-main">
        <PostCard post={postView} isAuthenticated={Boolean(currentUserId)} />

        <PostActionsBar
          postId={post.id}
          currentUserVote={post.currentUserVote}
          leftCount={post.leftCount}
          rightCount={post.rightCount}
          isAuthenticated={Boolean(currentUserId)}
          redirectPath={redirectPath}
          onReplyClick={() => setShowRootComposer(true)}
        />

        {showRootComposer ? (
          <ReplyComposer
            targetType="post"
            targetId={post.id}
            onSubmit={(draft) => handleRootReplySubmit({ body: draft.body })}
            onCancel={() => setShowRootComposer(false)}
            autoFocus
          />
        ) : null}

        <PostToolbar
          sortMode={sortMode}
          onSortChange={setSortMode}
        />

        <CommentThread
          comments={tree}
          sortMode={sortMode}
          currentUserId={currentUserId}
          maxInlineDepth={6}
          collapsedAll={false}
          redirectPath={redirectPath}
          onReplySubmit={(draft) => handleReplySubmit({ targetId: draft.targetId, body: draft.body })}
          onEditSubmit={(draft) => handleEditSubmit({ commentId: draft.commentId, body: draft.body })}
          onDeleteSubmit={handleDeleteSubmit}
        />
      </section>
    </div>
  );
}
