import type { CommentView } from "@/lib/types/views";

export type CommentNode = {
  comment: CommentView;
  children: CommentNode[];
  reactionTotal: number;
};

function reactionTotal(comment: CommentView) {
  return Number(comment.upvote_weight ?? 0) + Number(comment.downvote_weight ?? 0);
}

function sortSiblingComments(list: CommentView[]) {
  return [...list].sort((a, b) => {
    const totalDiff = reactionTotal(b) - reactionTotal(a);
    if (totalDiff !== 0) return totalDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function buildNodes(parentId: string | null, byParent: Map<string | null, CommentView[]>): CommentNode[] {
  const siblings = sortSiblingComments(byParent.get(parentId) ?? []);

  return siblings.map((comment) => ({
    comment,
    children: buildNodes(comment.id, byParent),
    reactionTotal: reactionTotal(comment)
  }));
}

export function buildCommentTree(comments: CommentView[]): CommentNode[] {
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

  return buildNodes(null, byParent);
}
