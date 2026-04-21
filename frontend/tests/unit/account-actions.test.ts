import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  authGetUser: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));

import {
  upsertAccountIdentityAction,
  deactivateAccountAction,
  deleteAccountAction
} from "@/lib/actions/account";

function makeFormData(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    fd.set(k, v);
  }
  return fd;
}

function makeSupabaseMock({
  userId = "user-abc",
  authError = null,
  updateError = null,
  duplicateData = null,
  duplicateError = null
}: {
  userId?: string;
  authError?: unknown;
  updateError?: unknown;
  duplicateData?: unknown;
  duplicateError?: unknown;
} = {}) {
  const eqMock = vi.fn().mockResolvedValue({ error: updateError, data: null });
  const neqMock = vi.fn().mockReturnValue({ maybeSingle: async () => ({ data: duplicateData, error: duplicateError }) });
  const selectMock = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ neq: neqMock }) });
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

  return {
    auth: {
      getClaims: async () => ({
        data: { claims: authError ? null : { sub: userId } },
        error: authError
      }),
      signOut: mocks.signOut
    },
    from: vi.fn(() => ({
      select: selectMock,
      update: updateMock
    })),
    rpc: mocks.rpcMock
  };
}

describe("upsertAccountIdentityAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when display_name is empty", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeSupabaseMock());
    const fd = makeFormData({ username: "validuser", display_name: "" });
    await expect(upsertAccountIdentityAction(fd)).rejects.toThrow("Le nom public est obligatoire.");
  });

  it("throws when username is invalid", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeSupabaseMock());
    const fd = makeFormData({ username: "ab", display_name: "Jean" });
    await expect(upsertAccountIdentityAction(fd)).rejects.toThrow();
  });

  it("throws when username is already taken", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeSupabaseMock({ duplicateData: { user_id: "other-user" } })
    );
    const fd = makeFormData({ username: "citoyen_taken", display_name: "Jean" });
    await expect(upsertAccountIdentityAction(fd)).rejects.toThrow("Ce username est deja pris.");
  });

  it("throws on auth error", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeSupabaseMock({ authError: new Error("auth failed") })
    );
    const fd = makeFormData({ username: "citoyen_ok", display_name: "Jean" });
    await expect(upsertAccountIdentityAction(fd)).rejects.toThrow("Authentication required");
  });

  it("calls revalidatePath and redirect on success", async () => {
    const client = makeSupabaseMock();
    // Make the update chain resolve properly
    client.from = vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: async () => ({ data: null, error: null })
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    }));
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    const fd = makeFormData({
      username: "citoyen_valid",
      display_name: "Jean Dupont",
      redirect_path: "/me"
    });
    await upsertAccountIdentityAction(fd);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/me");
    expect(mocks.redirect).toHaveBeenCalledWith("/me");
  });

  it("throws on database update error", async () => {
    const client = makeSupabaseMock({ updateError: { message: "DB error", code: "500" } });
    client.from = vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: async () => ({ data: null, error: null })
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "DB error", code: "500" } })
      })
    }));
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    const fd = makeFormData({ username: "citoyen_valid", display_name: "Jean" });
    await expect(upsertAccountIdentityAction(fd)).rejects.toThrow("Enregistrement impossible");
  });
});

describe("deactivateAccountAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when confirmation text is wrong", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeSupabaseMock());
    const fd = makeFormData({ confirm_deactivate: "wrong" });
    await expect(deactivateAccountAction(fd)).rejects.toThrow("Confirmez en saisissant DESACTIVER.");
  });

  it("throws on auth error", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeSupabaseMock({ authError: new Error("auth") })
    );
    const fd = makeFormData({ confirm_deactivate: "DESACTIVER" });
    await expect(deactivateAccountAction(fd)).rejects.toThrow("Authentication required");
  });

  it("deactivates account and redirects on valid confirmation", async () => {
    const client = makeSupabaseMock();
    client.from = vi.fn(() => ({
      select: vi.fn(),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    }));
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    const fd = makeFormData({ confirm_deactivate: "DESACTIVER", redirect_path: "/me" });
    await deactivateAccountAction(fd);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/me");
    expect(mocks.redirect).toHaveBeenCalledWith("/me?section=security");
  });
});

describe("deleteAccountAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when confirmation text is wrong", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeSupabaseMock());
    const fd = makeFormData({ confirm_delete: "NOPE" });
    await expect(deleteAccountAction(fd)).rejects.toThrow("Confirmez en saisissant SUPPRIMER.");
  });

  it("throws on auth error", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeSupabaseMock({ authError: new Error("auth") })
    );
    const fd = makeFormData({ confirm_delete: "SUPPRIMER" });
    await expect(deleteAccountAction(fd)).rejects.toThrow("Authentication required");
  });

  it("deletes account, signs out, and redirects", async () => {
    mocks.signOut.mockResolvedValue({});
    const client = makeSupabaseMock();
    client.from = vi.fn(() => ({
      select: vi.fn(),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    }));
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    const fd = makeFormData({ confirm_delete: "SUPPRIMER" });
    await deleteAccountAction(fd);
    expect(mocks.signOut).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("throws on update error", async () => {
    const client = makeSupabaseMock();
    client.from = vi.fn(() => ({
      select: vi.fn(),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "fail", code: "500" } })
      })
    }));
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    const fd = makeFormData({ confirm_delete: "SUPPRIMER" });
    await expect(deleteAccountAction(fd)).rejects.toThrow("Operation impossible pour le moment.");
  });
});
