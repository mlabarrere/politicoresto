import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/polls/vote/route";
import { createServerSupabaseClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn()
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/polls/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("poll vote route", () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
  });

  it("rejects unauthenticated request", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
    } as never);

    const response = await POST(makeRequest({ postItemId: "p1", optionId: "o1" }));
    expect(response.status).toBe(401);
  });

  it("rejects invalid payload", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) }
    } as never);

    const response = await POST(makeRequest({ foo: "bar" }));
    expect(response.status).toBe(400);
  });

  it("returns rpc errors for duplicate or closed vote", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      rpc: vi.fn().mockResolvedValue({ error: { message: "Poll is closed" } })
    } as never);

    const response = await POST(makeRequest({ postItemId: "p1", optionId: "o1" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Poll is closed" });
  });

  it("returns normalized poll payload on success", async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            error: null,
            data: {
              post_item_id: "p1",
              post_id: "t1",
              post_slug: "slug",
              post_title: "Title",
              question: "Q?",
              deadline_at: "2026-04-18T10:00:00.000Z",
              poll_status: "open",
              sample_size: 20,
              effective_sample_size: 14,
              representativity_score: 55,
              coverage_score: 60,
              distance_score: 45,
              stability_score: 50,
              anti_brigading_score: 70,
              raw_results: [],
              corrected_results: [],
              options: [],
              selected_option_id: "o1"
            }
          })
        })
      })
    });

    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      rpc: vi.fn().mockResolvedValue({ error: null }),
      from: fromMock
    } as never);

    const response = await POST(makeRequest({ postItemId: "p1", optionId: "o1" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        poll: expect.objectContaining({
          post_item_id: "p1",
          selected_option_id: "o1"
        })
      })
    );
  });
});
