import { beforeEach, describe, expect, it, vi } from "vitest";

import { getHomeScreenData } from "@/lib/data/public/home";
import { resolveCurrentUserId } from "@/lib/supabase/auth-user";
import { getPollSummariesByPostItemIds } from "@/lib/data/public/polls";
import { createServerSupabaseClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn()
}));

vi.mock("@/lib/supabase/auth-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/auth-user")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => null),
    resolveCurrentUserId: vi.fn(async () => null)
  };
});

vi.mock("@/lib/data/public/polls", () => ({
  getPollSummariesByPostItemIds: vi.fn(async () => new Map())
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);
const mockedResolveCurrentUserId = vi.mocked(resolveCurrentUserId);
const mockedGetPollSummaries = vi.mocked(getPollSummariesByPostItemIds);

type QueryResult = {
  data: Array<Record<string, unknown>> | null;
  error: { message?: string; code?: string } | null;
};

function makeFeedRow(id: string, score: number, createdAt: string) {
  return {
    topic_id: id,
    topic_slug: `${id}-slug`,
    topic_title: `Topic ${id}`,
    topic_status: "open",
    visibility: "public",
    created_at: createdAt,
    last_activity_at: createdAt,
    latest_thread_post_at: createdAt,
    thread_score: score,
    editorial_feed_score: score,
    editorial_feed_rank: score
  };
}

function makePostRow(id: string, threadId: string) {
  return {
    id,
    thread_id: threadId,
    type: "article",
    content: "Post body",
    gauche_count: 1,
    droite_count: 0,
    comment_count: 0,
    created_at: "2026-04-16T10:00:00.000Z"
  };
}

function makeSupabase({
  feed,
  postRows = [],
  reactionRows = []
}: {
  feed: QueryResult;
  postRows?: Array<Record<string, unknown>>;
  reactionRows?: Array<{ target_id: string; reaction_type: string }>;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "v_feed_global") {
        return {
          select: vi.fn(() => {
            const query = {
              order: vi.fn(() => query),
              limit: vi.fn(async () => feed)
            };
            return query;
          })
        };
      }

      if (table === "v_thread_posts") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(async () => ({ data: postRows, error: null }))
            }))
          }))
        };
      }

      if (table === "reaction") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(async () => ({ data: reactionRows, error: null }))
              }))
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    })
  };
}

describe("getHomeScreenData", () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
    mockedResolveCurrentUserId.mockReset();
    mockedResolveCurrentUserId.mockResolvedValue(null);
    mockedGetPollSummaries.mockReset();
    mockedGetPollSummaries.mockResolvedValue(new Map());
  });

  it("uses v_feed_global as canonical feed source", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        feed: {
          data: [makeFeedRow("topic-primary", 10, "2026-04-16T10:00:00.000Z")],
          error: null
        },
        postRows: [makePostRow("post-item-primary", "topic-primary")]
      }) as never
    );

    const result = await getHomeScreenData(null);

    expect(result.error).toBeNull();
    expect(result.data.feed[0]?.topic_id).toBe("topic-primary");
  });

  it("returns a generic feed error when canonical view fails", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        feed: {
          data: null,
          error: { message: "statement timeout", code: "57014" }
        }
      }) as never
    );

    const result = await getHomeScreenData(null);

    expect(result.error).toBe("Feed indisponible pour le moment.");
    expect(result.data.feed).toEqual([]);
  });

  it("does not expose feed entries without initial post rows", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        feed: {
          data: [makeFeedRow("topic-without-op", 9, "2026-04-16T09:00:00.000Z")],
          error: null
        }
      }) as never
    );

    const result = await getHomeScreenData(null);

    expect(result.error).toBeNull();
    expect(result.data.feed).toEqual([]);
  });

  it("attaches the authenticated user's reaction side to each feed item", async () => {
    mockedResolveCurrentUserId.mockResolvedValue("user-123");
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        feed: { data: [makeFeedRow("topic-1", 10, "2026-04-16T10:00:00.000Z")], error: null },
        postRows: [makePostRow("post-1", "topic-1")],
        reactionRows: [{ target_id: "post-1", reaction_type: "upvote" }]
      }) as never
    );

    const result = await getHomeScreenData("user-123");

    expect(result.data.feed[0]?.feed_user_reaction_side).toBe("gauche");
  });

  it("attaches poll summaries to feed items that have polls", async () => {
    const pollSummary = { post_item_id: "post-1", question: "Who wins?" };
    mockedGetPollSummaries.mockResolvedValue(
      new Map([["post-1", pollSummary]]) as never
    );
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        feed: { data: [makeFeedRow("topic-1", 10, "2026-04-16T10:00:00.000Z")], error: null },
        postRows: [makePostRow("post-1", "topic-1")]
      }) as never
    );

    const result = await getHomeScreenData(null);

    expect(result.data.feed[0]?.feed_poll_summary).toEqual(pollSummary);
  });
});
