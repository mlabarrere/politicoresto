import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPostAction } from "@/lib/actions/posts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchUrlPreview } from "@/lib/utils/url-preview";

const mocks = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  redirectMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  rpcMock: vi.fn(),
  fetchUrlPreviewMock: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePathMock }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirectMock }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClientMock
}));
vi.mock("@/lib/utils/url-preview", () => ({
  normalizeSourceUrl: (raw: string) => (raw ? raw : null),
  fetchUrlPreview: mocks.fetchUrlPreviewMock
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);
const mockedFetchUrlPreview = vi.mocked(fetchUrlPreview);

function makeFormData(entries: Record<string, string | string[]>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const item of value) formData.append(key, item);
      continue;
    }
    formData.set(key, value);
  }
  return formData;
}

// Le RPC consolidé rpc_create_post_full retourne { thread_id, post_item_id }
// via .single(). On mock donc la chaîne rpc(...).single().
function mockRpcSingle(result: { data?: unknown; error?: unknown }) {
  mocks.rpcMock.mockReturnValue({
    single: vi.fn().mockResolvedValue(result)
  });
}

describe("createPostAction", () => {
  beforeEach(() => {
    mocks.revalidatePathMock.mockReset();
    mocks.redirectMock.mockReset();
    mocks.createServerSupabaseClientMock.mockReset();
    mocks.rpcMock.mockReset();
    mocks.fetchUrlPreviewMock.mockReset();

    mockedCreateServerSupabaseClient.mockResolvedValue({
      rpc: mocks.rpcMock
    } as never);
  });

  it("calls rpc_create_post_full once and redirects on success (post mode)", async () => {
    mockRpcSingle({
      data: { thread_id: "t-1", post_item_id: "pi-1" },
      error: null
    });
    mockedFetchUrlPreview.mockResolvedValue({ url: "https://example.com", title: "Titre" });

    await createPostAction(
      makeFormData({
        title: "Thread",
        body: "Body",
        source_url: "https://example.com",
        redirect_path: "/"
      })
    );

    expect(mocks.rpcMock).toHaveBeenCalledTimes(1);
    expect(mocks.rpcMock).toHaveBeenCalledWith(
      "rpc_create_post_full",
      expect.objectContaining({
        p_title: "Thread",
        p_body: "Body",
        p_source_url: "https://example.com",
        p_mode: "post",
        p_poll_question: null,
        p_poll_deadline_at: null,
        p_poll_options: [],
        p_subject_ids: [],
        p_party_tags: [],
        p_link_preview: { url: "https://example.com", title: "Titre" }
      })
    );
    expect(mocks.redirectMock).toHaveBeenCalledWith("/");
  });

  it("passes poll options and deadline when mode=poll", async () => {
    mockRpcSingle({
      data: { thread_id: "t-2", post_item_id: "pi-2" },
      error: null
    });
    mockedFetchUrlPreview.mockResolvedValue(null);

    await createPostAction(
      makeFormData({
        title: "Budget 2026",
        body: "Contexte politique",
        post_mode: "poll",
        poll_question: "Quelle priorite?",
        poll_deadline_hours: "24",
        poll_options: ["Sante", "Education", "Securite"],
        redirect_path: "/"
      })
    );

    expect(mocks.rpcMock).toHaveBeenCalledTimes(1);
    const args = mocks.rpcMock.mock.calls[0]?.[1];
    expect(args).toMatchObject({
      p_mode: "poll",
      p_poll_question: "Quelle priorite?",
      p_poll_options: ["Sante", "Education", "Securite"]
    });
    expect(typeof args.p_poll_deadline_at).toBe("string");
  });

  it("rejects poll create when options are insufficient (client-side validation)", async () => {
    await expect(
      createPostAction(
        makeFormData({
          title: "Budget 2026",
          post_mode: "poll",
          poll_question: "Quelle priorite?",
          poll_options: ["Sante"],
          redirect_path: "/"
        })
      )
    ).rejects.toThrow(/At least two poll options required/i);
    expect(mocks.rpcMock).not.toHaveBeenCalled();
  });

  it("redirects to composer with safe error code when rpc fails", async () => {
    mockRpcSingle({ data: null, error: { message: "db explosion", code: "XX000" } });

    await createPostAction(
      makeFormData({ title: "Thread erreur", body: "Body", redirect_path: "/" })
    );

    expect(mocks.redirectMock).toHaveBeenCalledWith("/post/new?error=publish_failed");
  });

  it("passes through validation messages from rpc as user-visible errors", async () => {
    mockRpcSingle({
      data: null,
      error: { message: "Daily post limit reached", code: "P0001" }
    });

    await expect(
      createPostAction(makeFormData({ title: "Thread", redirect_path: "/" }))
    ).rejects.toThrow(/Daily post limit reached/);
  });

  it("forwards subject_ids and party_tags to the RPC", async () => {
    mockRpcSingle({
      data: { thread_id: "t-3", post_item_id: "pi-3" },
      error: null
    });
    mockedFetchUrlPreview.mockResolvedValue(null);

    await createPostAction(
      makeFormData({
        title: "Avec taxonomie",
        body: null as unknown as string,
        subject_ids: ["s1", "s2"],
        party_tags: ["rn", "lfi", "ps", "lr"],
        redirect_path: "/"
      })
    );

    const args = mocks.rpcMock.mock.calls[0]?.[1];
    expect(args.p_subject_ids).toEqual(["s1", "s2"]);
    // slice(0,3) côté action
    expect(args.p_party_tags).toEqual(["rn", "lfi", "ps"]);
  });
});
