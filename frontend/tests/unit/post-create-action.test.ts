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

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePathMock
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirectMock
}));

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
      for (const item of value) {
        formData.append(key, item);
      }
      continue;
    }
    formData.set(key, value);
  }
  return formData;
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

  it("creates thread then original post with URL preview metadata", async () => {
    mocks.rpcMock
      .mockResolvedValueOnce({ data: { id: "thread-1" }, error: null })
      .mockResolvedValueOnce({ error: null });
    mockedFetchUrlPreview.mockResolvedValue({
      url: "https://example.com",
      title: "Titre"
    });

    await createPostAction(
      makeFormData({
        title: "Thread",
        body: "Body",
        source_url: "https://example.com",
        redirect_path: "/"
      })
    );

    expect(mocks.rpcMock).toHaveBeenNthCalledWith(1, "create_post_topic", expect.any(Object));
    expect(mocks.rpcMock).toHaveBeenNthCalledWith(2, "create_post_item", {
      p_post_id: "thread-1",
      p_type: "article",
      p_title: "Thread",
      p_content: "Body",
      p_metadata: {
        is_original_post: true,
        source_url: "https://example.com",
        link_preview: {
          url: "https://example.com",
          title: "Titre"
        },
        post_mode: "post"
      }
    });
    expect(mocks.redirectMock).toHaveBeenCalledWith("/");
  });

  it("keeps raw URL when metadata fetch fails", async () => {
    mocks.rpcMock
      .mockResolvedValueOnce({ data: { id: "thread-2" }, error: null })
      .mockResolvedValueOnce({ error: null });
    mockedFetchUrlPreview.mockResolvedValue(null);

    await createPostAction(
      makeFormData({
        title: "Thread 2",
        body: "Body 2",
        source_url: "https://no-preview.example",
        redirect_path: "/"
      })
    );

    expect(mocks.rpcMock).toHaveBeenNthCalledWith(2, "create_post_item", {
      p_post_id: "thread-2",
      p_type: "article",
      p_title: "Thread 2",
      p_content: "Body 2",
      p_metadata: {
        is_original_post: true,
        source_url: "https://no-preview.example",
        link_preview: null,
        post_mode: "post"
      }
    });
    expect(mocks.redirectMock).toHaveBeenCalledWith("/");
  });

  it("creates poll payload when poll mode is enabled", async () => {
    mocks.rpcMock
      .mockResolvedValueOnce({ data: { id: "thread-3" }, error: null })
      .mockResolvedValueOnce({ data: { id: "post-item-3" }, error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });
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

    expect(mocks.rpcMock).toHaveBeenNthCalledWith(1, "create_post_topic", expect.any(Object));
    expect(mocks.rpcMock).toHaveBeenNthCalledWith(2, "create_post_item", {
      p_post_id: "thread-3",
      p_type: "article",
      p_title: "Budget 2026",
      p_content: "Contexte politique",
      p_metadata: {
        is_original_post: true,
        source_url: null,
        link_preview: null,
        post_mode: "poll"
      }
    });
    expect(mocks.rpcMock).toHaveBeenNthCalledWith(
      3,
      "create_post_poll",
      expect.objectContaining({
        p_post_item_id: "post-item-3",
        p_question: "Quelle priorite?",
        p_options: ["Sante", "Education", "Securite"]
      })
    );
    expect(mocks.rpcMock).toHaveBeenNthCalledWith(4, "rpc_update_thread_post", expect.any(Object));
  });
});





