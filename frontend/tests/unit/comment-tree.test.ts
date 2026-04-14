import { describe, expect, it } from "vitest";

import { buildCommentTree } from "@/lib/forum/comments";
import type { CommentView } from "@/lib/types/views";

function makeComment(partial: Partial<CommentView> & { id: string }): CommentView {
  return {
    id: partial.id,
    thread_id: partial.thread_id ?? "t1",
    thread_post_id: partial.thread_post_id ?? "op1",
    parent_post_id: partial.parent_post_id ?? null,
    depth: partial.depth ?? 0,
    author_user_id: partial.author_user_id ?? "u1",
    username: partial.username ?? "user",
    display_name: partial.display_name ?? "User",
    title: null,
    body_markdown: partial.body_markdown ?? partial.id,
    created_at: partial.created_at ?? "2026-04-14T00:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-04-14T00:00:00.000Z",
    post_status: "visible",
    gauche_count: partial.gauche_count ?? 0,
    droite_count: partial.droite_count ?? 0,
    comment_score: 0
  };
}

describe("comment tree sorting", () => {
  it("sorts sibling comments by total political reactions", () => {
    const tree = buildCommentTree([
      makeComment({ id: "a", gauche_count: 1, droite_count: 0 }),
      makeComment({ id: "b", gauche_count: 2, droite_count: 3 }),
      makeComment({ id: "c", gauche_count: 2, droite_count: 1 })
    ]);

    expect(tree.map((node) => node.comment.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts child replies by total political reactions within same parent", () => {
    const tree = buildCommentTree([
      makeComment({ id: "parent", gauche_count: 1, droite_count: 1 }),
      makeComment({ id: "r1", parent_post_id: "parent", depth: 1, gauche_count: 0, droite_count: 1 }),
      makeComment({ id: "r2", parent_post_id: "parent", depth: 1, gauche_count: 3, droite_count: 1 }),
      makeComment({ id: "r3", parent_post_id: "parent", depth: 1, gauche_count: 1, droite_count: 1 })
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].children.map((node) => node.comment.id)).toEqual(["r2", "r3", "r1"]);
  });
});
