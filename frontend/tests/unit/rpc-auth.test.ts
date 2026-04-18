import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));

import { signOutAction } from "@/lib/data/rpc/auth";

describe("signOutAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.signOut.mockResolvedValue({});
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { signOut: mocks.signOut }
    });
  });

  it("calls supabase signOut", async () => {
    await signOutAction();
    expect(mocks.signOut).toHaveBeenCalled();
  });

  it("redirects to / after sign out", async () => {
    await signOutAction();
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });
});
