import { beforeEach, describe, expect, it, vi } from "vitest";

import { createThreadAction } from "@/lib/actions/threads";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchUrlPreview } from "@/lib/utils/url-preview";

const mocks = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  rpcMock: vi.fn(),
  fetchUrlPreviewMock: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePathMock
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

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createThreadAction", () => {
  beforeEach(() => {
    mocks.revalidatePathMock.mockReset();
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

    await createThreadAction(
      makeFormData({
        title: "Thread",
        body: "Body",
        source_url: "https://example.com",
        redirect_path: "/"
      })
    );

    expect(mocks.rpcMock).toHaveBeenNthCalledWith(1, "create_thread", expect.any(Object));
    expect(mocks.rpcMock).toHaveBeenNthCalledWith(2, "create_post", {
      p_thread_id: "thread-1",
      p_type: "article",
      p_title: "Thread",
      p_content: "Body",
      p_metadata: {
        is_original_post: true,
        source_url: "https://example.com",
        link_preview: {
          url: "https://example.com",
          title: "Titre"
        }
      }
    });
  });

  it("keeps raw URL when metadata fetch fails", async () => {
    mocks.rpcMock
      .mockResolvedValueOnce({ data: { id: "thread-2" }, error: null })
      .mockResolvedValueOnce({ error: null });
    mockedFetchUrlPreview.mockResolvedValue(null);

    await createThreadAction(
      makeFormData({
        title: "Thread 2",
        body: "Body 2",
        source_url: "https://no-preview.example",
        redirect_path: "/"
      })
    );

    expect(mocks.rpcMock).toHaveBeenNthCalledWith(2, "create_post", {
      p_thread_id: "thread-2",
      p_type: "article",
      p_title: "Thread 2",
      p_content: "Body 2",
      p_metadata: {
        is_original_post: true,
        source_url: "https://no-preview.example",
        link_preview: null
      }
    });
  });
});
