import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  getSession: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));

import { requireSession } from "@/lib/guards/require-session";

function makeClient(session: unknown) {
  return {
    auth: {
      getSession: async () => ({ data: { session } })
    }
  };
}

describe("requireSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects to login when no session", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient(null));
    await requireSession("/me");
    expect(mocks.redirect).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login")
    );
  });

  it("includes encoded next path in redirect URL", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient(null));
    await requireSession("/dashboard");
    const [url] = mocks.redirect.mock.calls[0];
    expect(url).toContain(encodeURIComponent("/dashboard"));
  });

  it("returns supabase client and session when authenticated", async () => {
    const session = { user: { id: "user-123" }, access_token: "tok" };
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient(session));
    const result = await requireSession();
    expect(result.session).toEqual(session);
    expect(result.supabase).toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("uses /me as default next path", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient(null));
    await requireSession();
    const [url] = mocks.redirect.mock.calls[0];
    expect(url).toContain(encodeURIComponent("/me"));
  });
});
