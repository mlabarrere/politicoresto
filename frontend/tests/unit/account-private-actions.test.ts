import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  rpcMock: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));

import { upsertPrivateProfileAction, clearPrivateProfileAction } from "@/lib/actions/account";

function makeFormData(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    fd.set(k, v);
  }
  return fd;
}

function makeClient(rpcError: unknown = null) {
  return {
    rpc: mocks.rpcMock.mockResolvedValue({ error: rpcError, data: null })
  };
}

describe("upsertPrivateProfileAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls rpc and redirects on success", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient(null));
    const fd = makeFormData({
      political_interest_level: "3",
      notes_private: "mes notes",
      redirect_path: "/me"
    });
    await upsertPrivateProfileAction(fd);
    expect(mocks.rpcMock).toHaveBeenCalledWith(
      "rpc_upsert_private_political_profile",
      expect.objectContaining({ p_political_interest_level: 3 })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/me");
    expect(mocks.redirect).toHaveBeenCalledWith("/me");
  });

  it("does not include interest level when empty", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient(null));
    const fd = makeFormData({ political_interest_level: "" });
    await upsertPrivateProfileAction(fd);
    const payload = mocks.rpcMock.mock.calls[0]![1];
    expect(payload.p_political_interest_level).toBeUndefined();
  });

  it("throws when rpc fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient({ message: "err", code: "500" }));
    const fd = makeFormData({ political_interest_level: "2" });
    await expect(upsertPrivateProfileAction(fd)).rejects.toThrow("Enregistrement impossible");
  });

  it("handles non-finite interest level gracefully", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient(null));
    const fd = makeFormData({ political_interest_level: "not-a-number" });
    await upsertPrivateProfileAction(fd);
    const payload = mocks.rpcMock.mock.calls[0]![1];
    // NaN is not finite, so it should not be included
    expect(payload.p_political_interest_level).toBeUndefined();
  });
});

describe("clearPrivateProfileAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls rpc_delete and redirects on success", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient(null));
    const fd = makeFormData({ redirect_path: "/me" });
    await clearPrivateProfileAction(fd);
    expect(mocks.rpcMock).toHaveBeenCalledWith("rpc_delete_private_political_profile");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/me");
    expect(mocks.redirect).toHaveBeenCalledWith("/me");
  });

  it("throws when rpc fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient({ message: "err", code: "500" }));
    const fd = makeFormData({});
    await expect(clearPrivateProfileAction(fd)).rejects.toThrow("Operation impossible pour le moment.");
  });
});
