import { describe, expect, it } from "vitest";

import { buildForumCommentTree } from "@/lib/forum/mappers";
import { getIndentPx } from "@/lib/forum/comments";
import type { CommentView } from "@/lib/types/views";

function makeComment(partial: Partial<CommentView> & { id: string }): CommentView {
  return {
    id: partial.id,
    post_id: partial.post_id ?? "t1",
    post_item_id: partial.post_item_id ?? "op1",
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
    user_reaction_side: partial.user_reaction_side,
    comment_score: 0
  };
}

describe("forum comment tree", () => {
  it("builds tree once and preserves hierarchy", () => {
    const tree = buildForumCommentTree([
      makeComment({ id: "a", gauche_count: 1 }),
      makeComment({ id: "b", parent_post_id: "a", depth: 1 }),
      makeComment({ id: "c", parent_post_id: "b", depth: 2 })
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.children[0]!.id).toBe("b");
    expect(tree[0]!.children[0]!.children[0]!.id).toBe("c");
  });

  it("supports visual depth compression", () => {
    expect(getIndentPx(8, 6, false)).toBe(84);
    expect(getIndentPx(8, 6, true)).toBe(30);
  });
});



