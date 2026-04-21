import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  createServerSupabaseClient: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));

import { requireSession } from "@/lib/guards/require-session";

function makeClient(userId: string | null) {
  return {
    auth: {
      getClaims: async () => ({
        data: { claims: userId ? { sub: userId } : null },
        error: null
      })
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
    const [url] = mocks.redirect.mock.calls[0]!;
    expect(url).toContain(encodeURIComponent("/dashboard"));
  });

  it("returns supabase client and userId when authenticated", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient("user-123"));
    const result = await requireSession();
    expect(result.userId).toBe("user-123");
    expect(result.supabase).toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("uses /me as default next path", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient(null));
    await requireSession();
    const [url] = mocks.redirect.mock.calls[0]!;
    expect(url).toContain(encodeURIComponent("/me"));
  });
});
