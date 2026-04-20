import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  canCreateCommentToday: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));

vi.mock("@/lib/security/rate-limit", () => ({
  canCreateCommentToday: mocks.canCreateCommentToday,
  RATE_LIMIT_MESSAGES: { comment: "Trop de commentaires aujourd'hui." }
}));

import { POST, PATCH, DELETE } from "@/app/api/comments/route";

function makeRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/comments", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

type FromTable = "v_thread_detail" | "v_thread_posts" | "v_post_comments" | "reaction";

function makeClient({
  userNull = false,
  rpcError = null,
  commentData = null,
  postSlugError = false
}: {
  userNull?: boolean;
  rpcError?: unknown;
  commentData?: Record<string, unknown> | null;
  postSlugError?: boolean;
} = {}) {
  const fromMock = vi.fn().mockImplementation((table: FromTable) => {
    if (table === "v_thread_detail") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: async () =>
              postSlugError
                ? { data: null, error: { message: "not found" } }
                : { data: { id: "thread-1" }, error: null }
          })
        })
      };
    }
    if (table === "v_thread_posts") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: async () => ({ data: { id: "post-item-1" }, error: null })
              })
            })
          })
        })
      };
    }
    if (table === "v_post_comments") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: async () =>
              commentData
                ? { data: commentData, error: null }
                : { data: null, error: { message: "not found" } }
          })
        })
      };
    }
    if (table === "reaction") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: async () => ({ data: null, error: null })
              })
            })
          })
        })
      };
    }
    return {};
  });

  return {
    auth: {
      getClaims: async () => ({
        data: { claims: userNull ? null : { sub: "user-1" } }
      }),
      getSession: async () => ({
        data: { session: userNull ? null : { user: { id: "user-1" } } }
      })
    },
    from: fromMock,
    rpc: vi.fn().mockResolvedValue({
      data: rpcError ? null : { id: "comment-new" },
      error: rpcError
    })
  };
}

describe("POST /api/comments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.canCreateCommentToday.mockResolvedValue({ allowed: true });
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient({ userNull: true }));
    const response = await POST(makeRequest({ postSlug: "slug", body: "hello" }));
    expect(response.status).toBe(401);
  });

  it("returns 429 when rate limit exceeded", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    mocks.canCreateCommentToday.mockResolvedValue({ allowed: false });
    const response = await POST(makeRequest({ postSlug: "slug", body: "hello" }));
    expect(response.status).toBe(429);
  });

  it("returns 400 when payload is missing postSlug", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await POST(makeRequest({ body: "hello" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when payload is missing body", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await POST(makeRequest({ postSlug: "some-slug" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when post not found by slug", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient({ postSlugError: true }));
    const response = await POST(makeRequest({ postSlug: "bad-slug", body: "hello" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when rpc create_comment fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ rpcError: { message: "db error", code: "500" } })
    );
    const response = await POST(makeRequest({ postSlug: "valid-slug", body: "hello" }));
    expect(response.status).toBe(400);
  });

  it("returns comment node on success", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({
        commentData: {
          id: "comment-new",
          post_id: "thread-1",
          thread_id: "thread-1",
          post_item_id: "post-item-1",
          thread_post_id: null,
          parent_post_id: null,
          depth: 0,
          author_user_id: "user-1",
          username: "citoyen",
          display_name: "Citoyen",
          title: null,
          body_markdown: "hello",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          post_status: "visible",
          gauche_count: 0,
          droite_count: 0,
          comment_score: 0
        }
      })
    );
    const response = await POST(makeRequest({ postSlug: "valid-slug", body: "hello" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comment).toBeTruthy();
  });
});

describe("PATCH /api/comments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient({ userNull: true }));
    const response = await PATCH(makeRequest({ commentId: "c1", body: "updated" }, "PATCH"));
    expect(response.status).toBe(401);
  });

  it("returns 400 when commentId is missing", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await PATCH(makeRequest({ body: "updated" }, "PATCH"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when body is missing", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await PATCH(makeRequest({ commentId: "c1" }, "PATCH"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when rpc fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ rpcError: { message: "err", code: "500" } })
    );
    const response = await PATCH(
      makeRequest({ commentId: "c1", body: "updated text" }, "PATCH")
    );
    expect(response.status).toBe(400);
  });

  it("returns ok on success", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await PATCH(
      makeRequest({ commentId: "c1", body: "updated text" }, "PATCH")
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });
});

describe("DELETE /api/comments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient({ userNull: true }));
    const response = await DELETE(makeRequest({ commentId: "c1" }, "DELETE"));
    expect(response.status).toBe(401);
  });

  it("returns 400 when commentId is missing", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await DELETE(makeRequest({}, "DELETE"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when rpc fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ rpcError: { message: "err", code: "500" } })
    );
    const response = await DELETE(makeRequest({ commentId: "c1" }, "DELETE"));
    expect(response.status).toBe(400);
  });

  it("returns ok on success", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await DELETE(makeRequest({ commentId: "c1" }, "DELETE"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });
});
