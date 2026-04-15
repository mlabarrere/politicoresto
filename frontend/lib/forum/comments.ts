import type { CommentView } from "@/lib/types/views";
import type { CommentTreeNode } from "@/lib/types/forum";
import { buildForumCommentTree } from "@/lib/forum/mappers";

export type CommentNode = {
  comment: CommentView;
  children: CommentNode[];
  reactionTotal: number;
};

function reactionTotal(comment: CommentView) {
  return Number(comment.gauche_count ?? 0) + Number(comment.droite_count ?? 0);
}

function buildLegacyNodes(tree: CommentTreeNode[]): CommentNode[] {
  return tree.map((node) => ({
    comment: {
      id: node.id,
      thread_id: "",
      thread_post_id: null,
      parent_post_id: node.parentCommentId ?? null,
      depth: node.depth,
      author_user_id: node.author.id,
      username: node.author.username,
      display_name: node.author.username,
      title: null,
      body_markdown: node.body,
      created_at: node.createdAt,
      updated_at: node.updatedAt ?? node.createdAt,
      post_status: "visible",
      gauche_count: node.leftCount,
      droite_count: node.rightCount,
      user_reaction_side:
        node.currentUserVote === "left"
          ? "gauche"
          : node.currentUserVote === "right"
            ? "droite"
            : null,
      comment_score: null
    },
    reactionTotal: node.leftCount + node.rightCount,
    children: buildLegacyNodes(node.children)
  }));
}

export function buildCommentTree(comments: CommentView[]): CommentNode[] {
  return buildLegacyNodes(buildForumCommentTree(comments, "top"));
}

export function getIndentPx(depth: number, maxInlineDepth: number, compactMode: boolean) {
  const hardCap = compactMode ? Math.min(maxInlineDepth, 3) : maxInlineDepth;
  const level = Math.min(depth, hardCap);
  return level * (compactMode ? 10 : 14);
}
