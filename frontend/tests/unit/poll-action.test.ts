import { beforeEach, describe, expect, it, vi } from "vitest";

import { votePollAction } from "@/lib/actions/polls";

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

function makeFormData(entries: Array<[string, string]>) {
  const formData = new FormData();

  for (const [key, value] of entries) {
    formData.append(key, value);
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

describe("poll action", () => {
  it("routes poll answers through the vote_poll rpc call path", async () => {
    mocks.rpcMock.mockResolvedValue({ error: null });

    await votePollAction(
      makeFormData([
        ["poll_id", "poll-1"],
        ["redirect_path", "/thread/thread-1"],
        ["question:q1", "option:o2"],
        ["question:q2", "4"]
      ])
    );

    expect(mocks.rpcMock).toHaveBeenCalledWith("vote_poll", {
      p_poll_id: "poll-1",
      p_answers: [
        { poll_question_id: "q1", selected_option_id: "o2" },
        { poll_question_id: "q2", ordinal_value: 4 }
      ]
    });
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/thread/thread-1");
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("rejects empty poll submissions before hitting rpc", async () => {
    await expect(
      votePollAction(
        makeFormData([
          ["poll_id", "poll-1"],
          ["redirect_path", "/thread/thread-1"]
        ])
      )
    ).rejects.toThrow("Answer required");

    expect(mocks.rpcMock).not.toHaveBeenCalled();
  });
});
