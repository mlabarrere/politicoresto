import type { CommentView, PostView } from '@/lib/types/views';
import type { CommentTreeNode, ForumPost } from '@/lib/types/forum';
import { fromBackendVoteSide } from '@/lib/forum/vote';
import { normalizeMultilineText } from '@/lib/utils/multiline';

function toUsername(username: string | null, displayName: string | null) {
  return displayName ?? username ?? 'Membre';
}

export function mapPostViewToForumPost(
  post: PostView,
  fallbackTitle?: string | null,
): ForumPost {
  return {
    id: post.id,
    title: post.title ?? fallbackTitle ?? undefined,
    author: {
      id: post.created_by,
      username: toUsername(post.username, post.display_name),
      slug: post.username ?? null,
    },
    createdAt: post.created_at,
    body: normalizeMultilineText(post.content),
    leftCount: Number(post.gauche_count ?? 0),
    rightCount: Number(post.droite_count ?? 0),
    commentCount: Number(post.comment_count ?? 0),
    currentUserVote: fromBackendVoteSide(post.user_reaction_side ?? null),
    pollSummary: post.poll_summary ?? null,
    isEdited:
      Boolean(post.updated_at) &&
      Boolean(post.created_at) &&
      post.updated_at !== post.created_at,
  };
}

export function mapCommentViewToForumNode(
  comment: CommentView,
): CommentTreeNode {
  return {
    id: comment.id,
    author: {
      id: comment.author_user_id,
      username: toUsername(comment.username, comment.display_name),
      slug: comment.username ?? null,
    },
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    body: normalizeMultilineText(comment.body_markdown),
    depth: comment.depth,
    parentCommentId: comment.parent_post_id,
    leftCount: Number(comment.gauche_count ?? 0),
    rightCount: Number(comment.droite_count ?? 0),
    currentUserVote: fromBackendVoteSide(comment.user_reaction_side ?? null),
    replyCount: 0,
    isEdited: comment.updated_at !== comment.created_at,
    children: [],
  };
}

function toReactionTotal(comment: CommentView) {
  return Number(comment.gauche_count ?? 0) + Number(comment.droite_count ?? 0);
}

function sortByMode(
  comments: CommentView[],
  mode: 'top' | 'recent' | 'oldest' = 'top',
): CommentView[] {
  return [...comments].sort((a, b) => {
    if (mode === 'recent') {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    if (mode === 'oldest') {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    const diff = toReactionTotal(b) - toReactionTotal(a);
    if (diff !== 0) return diff;

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function buildNode(
  comment: CommentView,
  byParent: Map<string | null, CommentView[]>,
  sortMode: 'top' | 'recent' | 'oldest',
): CommentTreeNode {
  const childrenComments = sortByMode(byParent.get(comment.id) ?? [], sortMode);
  const children = childrenComments.map((child) =>
    buildNode(child, byParent, sortMode),
  );

  return {
    id: comment.id,
    author: {
      id: comment.author_user_id,
      username: toUsername(comment.username, comment.display_name),
      slug: comment.username ?? null,
    },
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    body: normalizeMultilineText(comment.body_markdown),
    depth: comment.depth,
    parentCommentId: comment.parent_post_id,
    leftCount: Number(comment.gauche_count ?? 0),
    rightCount: Number(comment.droite_count ?? 0),
    currentUserVote: fromBackendVoteSide(comment.user_reaction_side ?? null),
    replyCount: children.length,
    isEdited: comment.updated_at !== comment.created_at,
    children,
  };
}

export function buildForumCommentTree(
  comments: CommentView[],
  sortMode: 'top' | 'recent' | 'oldest' = 'top',
): CommentTreeNode[] {
  const byParent = new Map<string | null, CommentView[]>();

  for (const comment of comments) {
    const key = comment.parent_post_id ?? null;
    const existing = byParent.get(key);
    if (existing) {
      existing.push(comment);
    } else {
      byParent.set(key, [comment]);
    }
  }

  const roots = sortByMode(byParent.get(null) ?? [], sortMode);
  return roots.map((root) => buildNode(root, byParent, sortMode));
}
