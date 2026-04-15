import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPostDetail } from "@/lib/data/public/posts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn()
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

function makeSelectQuery(result: unknown) {
  return {
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(async () => result),
      order: vi.fn(async () => result)
    })),
    in: vi.fn(async () => result),
    order: vi.fn(async () => result)
  };
}

describe("post detail loader", () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
  });

  it("does not crash when optional metadata fetch is denied", async () => {
    const topic = {
      id: "t1",
      slug: "thread-1",
      title: "Thread test",
      description: null,
      topic_status: "open",
      effective_visibility: "public",
      open_at: "2026-04-14T00:00:00.000Z",
      close_at: "2026-04-21T00:00:00.000Z",
      created_at: "2026-04-14T00:00:00.000Z",
      space_id: null
    };

    const posts = [
      {
        id: "p1",
        post_id: "t1",
        type: "article",
        title: "Post",
        content: "Body",
        created_by: "u1",
        username: "alice",
        display_name: "Alice",
        created_at: "2026-04-14T00:00:00.000Z",
        updated_at: "2026-04-14T00:00:00.000Z",
        status: "published",
        gauche_count: 1,
        droite_count: 0,
        weighted_votes: 1,
        comment_count: 0
      }
    ];

    const comments = [
      {
        id: "c1",
        post_id: "t1",
        post_item_id: "p1",
        parent_post_id: null,
        depth: 0,
        author_user_id: "u2",
        username: "bob",
        display_name: "Bob",
        title: null,
        body_markdown: "Comment",
        created_at: "2026-04-14T01:00:00.000Z",
        updated_at: "2026-04-14T01:00:00.000Z",
        post_status: "visible",
        gauche_count: 0,
        droite_count: 0,
        comment_score: 0
      }
    ];

    mockedCreateServerSupabaseClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "v_post_detail") return { select: vi.fn(() => makeSelectQuery({ data: topic, error: null })) };
        if (table === "v_posts")
          return { select: vi.fn(() => makeSelectQuery({ data: posts, error: null })) };
        if (table === "v_post_comments")
          return { select: vi.fn(() => makeSelectQuery({ data: comments, error: null })) };
        if (table === "post")
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: null,
                error: { code: "42501", message: "permission denied for table post" }
              }))
            }))
          };
        throw new Error(`Unexpected table ${table}`);
      })
    } as never);

    const detail = await getPostDetail("thread-1");

    expect(detail?.post?.slug).toBe("thread-1");
    expect(detail?.posts[0]?.metadata).toBeNull();
    expect(detail?.comments.length).toBe(1);
  });
});





