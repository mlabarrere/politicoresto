import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCommentAction } from "@/lib/actions/comments";
import { createThreadPostAction } from "@/lib/actions/threads";
import { reactAction } from "@/lib/actions/reactions";

const mocks = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  rpcMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePathMock
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClientMock
}));

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

beforeEach(() => {
  mocks.revalidatePathMock.mockReset();
  mocks.rpcMock.mockReset();
  mocks.createServerSupabaseClientMock.mockReset();

  mocks.createServerSupabaseClientMock.mockResolvedValue({
    rpc: mocks.rpcMock
  } as never);
});

describe("mutation actions", () => {
  it("blocks unauthenticated post creation through the rpc boundary", async () => {
    mocks.rpcMock.mockResolvedValue({
      error: { message: "Unauthorized" }
    });

    await expect(
      createThreadPostAction(
        makeFormData({
          thread_id: "thread-1",
          type: "article",
          title: "Titre",
          content: "Contenu",
          redirect_path: "/thread/thread-1"
        })
      )
    ).rejects.toThrow("Unauthorized");

    expect(mocks.rpcMock).toHaveBeenCalledWith("create_post", {
      p_thread_id: "thread-1",
      p_type: "article",
      p_title: "Titre",
      p_content: "Contenu",
      p_metadata: {}
    });
  });

  it("allows an authenticated owner to create a post", async () => {
    mocks.rpcMock.mockResolvedValue({ error: null });

    await createThreadPostAction(
      makeFormData({
        thread_id: "thread-2",
        type: "article",
        title: "Post valide",
        content: "Sortie propre",
        redirect_path: "/thread/thread-2"
      })
    );

    expect(mocks.rpcMock).toHaveBeenCalledWith("create_post", {
      p_thread_id: "thread-2",
      p_type: "article",
      p_title: "Post valide",
      p_content: "Sortie propre",
      p_metadata: {}
    });
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/thread/thread-2");
  });

  it("surfaces forbidden mutations when the rpc denies access to someone else content", async () => {
    mocks.rpcMock.mockResolvedValue({
      error: { message: "Forbidden" }
    });

    await expect(
      createCommentAction(
        makeFormData({
          thread_post_id: "thread-post-1",
          body: "Commentaire interdit",
          redirect_path: "/thread/thread-1"
        })
      )
    ).rejects.toThrow("Forbidden");

    expect(mocks.rpcMock).toHaveBeenCalledWith("create_comment", {
      p_thread_post_id: "thread-post-1",
      p_parent_post_id: null,
      p_body_markdown: "Commentaire interdit"
    });
  });

  it("routes reaction mutations through the rpc call path", async () => {
    mocks.rpcMock.mockResolvedValue({ error: null });

    await reactAction(
      makeFormData({
        target_type: "thread_post",
        target_id: "thread-post-1",
        reaction_side: "gauche",
        redirect_path: "/thread/thread-1"
      })
    );

    expect(mocks.rpcMock).toHaveBeenCalledWith("react_post", {
      p_target_type: "thread_post",
      p_target_id: "thread-post-1",
      p_reaction_type: "upvote"
    });
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/thread/thread-1");
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("maps droite reaction to downvote", async () => {
    mocks.rpcMock.mockResolvedValue({ error: null });

    await reactAction(
      makeFormData({
        target_type: "comment",
        target_id: "comment-1",
        reaction_side: "droite",
        redirect_path: "/thread/thread-1"
      })
    );

    expect(mocks.rpcMock).toHaveBeenCalledWith("react_post", {
      p_target_type: "comment",
      p_target_id: "comment-1",
      p_reaction_type: "downvote"
    });
  });

  it("rejects unknown political reaction side", async () => {
    await expect(
      reactAction(
        makeFormData({
          target_type: "thread_post",
          target_id: "thread-post-1",
          reaction_side: "center",
          redirect_path: "/thread/thread-1"
        })
      )
    ).rejects.toThrow("Reaction side invalid");

    expect(mocks.rpcMock).not.toHaveBeenCalled();
  });
});
