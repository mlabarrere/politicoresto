import { beforeEach, describe, expect, it, vi } from "vitest";

import { getHomeScreenData } from "@/lib/data/public/home";
import { createServerSupabaseClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn()
}));

vi.mock("@/lib/supabase/auth-user", () => ({
  getCurrentUser: vi.fn(async () => null)
}));

vi.mock("@/lib/data/public/polls", () => ({
  getPollSummariesByPostItemIds: vi.fn(async () => new Map())
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

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
    latest_post_at: createdAt,
    post_score: score,
    thread_score: score,
    editorial_feed_score: score,
    editorial_feed_rank: score
  };
}

function makeSupabase({
  primaryFeed,
  fallbackFeed
}: {
  primaryFeed: QueryResult;
  fallbackFeed: QueryResult;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "v_feed_global_post") {
        return {
          select: vi.fn(() => {
            const query = {
              order: vi.fn(() => query),
              limit: vi.fn(async () => primaryFeed)
            };
            return query;
          })
        };
      }

      if (table === "v_feed_global") {
        return {
          select: vi.fn(() => ({
            limit: vi.fn(async () => fallbackFeed)
          }))
        };
      }

      if (table === "v_posts") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(async () => ({ data: [], error: null }))
            }))
          }))
        };
      }

      if (table === "reaction") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(async () => ({ data: [], error: null }))
              }))
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    })
  };
}

describe("getHomeScreenData fallback", () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
  });

  it("uses v_feed_global_post when available", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        primaryFeed: {
          data: [makeFeedRow("topic-primary", 10, "2026-04-16T10:00:00.000Z")],
          error: null
        },
        fallbackFeed: {
          data: [makeFeedRow("topic-fallback", 5, "2026-04-16T09:00:00.000Z")],
          error: null
        }
      }) as never
    );

    const result = await getHomeScreenData(null, null);

    expect(result.error).toBeNull();
    expect(result.data.feed[0]?.topic_id).toBe("topic-primary");
  });

  it("falls back to v_feed_global when v_feed_global_post is missing", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        primaryFeed: {
          data: null,
          error: { message: "Could not find the table 'public.v_feed_global_post' in the schema cache" }
        },
        fallbackFeed: {
          data: [makeFeedRow("topic-fallback", 12, "2026-04-16T12:00:00.000Z")],
          error: null
        }
      }) as never
    );

    const result = await getHomeScreenData(null, null);

    expect(result.error).toBeNull();
    expect(result.data.feed[0]?.topic_id).toBe("topic-fallback");
  });

  it("returns a silent empty feed when both feed views are unavailable", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        primaryFeed: {
          data: null,
          error: { message: "Could not find the table 'public.v_feed_global_post' in the schema cache" }
        },
        fallbackFeed: {
          data: null,
          error: { message: "Could not find the table 'public.v_feed_global' in the schema cache" }
        }
      }) as never
    );

    const result = await getHomeScreenData(null, null);

    expect(result.error).toBeNull();
    expect(result.data.feed).toEqual([]);
  });
});