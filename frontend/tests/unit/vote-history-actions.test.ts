import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  revalidatePath: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

import { deleteVoteHistoryAction, upsertVoteHistoryAction } from "@/lib/actions/vote-history";

function authedClient(rpcResult: { data?: unknown; error?: unknown }) {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null })
    },
    rpc: vi.fn(async () => rpcResult)
  };
}

function anonClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: { message: "no session" } })
    },
    rpc: vi.fn()
  };
}

describe("upsertVoteHistoryAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects when election_slug is empty", async () => {
    await expect(
      upsertVoteHistoryAction({
        election_slug: "",
        election_result_id: null,
        choice_kind: "blanc"
      })
    ).rejects.toThrow(/Scrutin requis/);
  });

  it("rejects an invalid choice_kind", async () => {
    await expect(
      upsertVoteHistoryAction({
        election_slug: "pres-2022-t1",
        election_result_id: null,
        // @ts-expect-error — validation tested at runtime
        choice_kind: "mauvais"
      })
    ).rejects.toThrow(/Type de choix invalide/);
  });

  it("rejects vote without election_result_id", async () => {
    await expect(
      upsertVoteHistoryAction({
        election_slug: "pres-2022-t1",
        election_result_id: null,
        choice_kind: "vote"
      })
    ).rejects.toThrow(/Choix de candidat requis/);
  });

  it("rejects when user is not authenticated", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(anonClient());
    await expect(
      upsertVoteHistoryAction({
        election_slug: "pres-2022-t1",
        election_result_id: "r-1",
        choice_kind: "vote"
      })
    ).rejects.toThrow(/Authentication required/);
  });

  it("calls rpc_upsert_vote_history with correct args and revalidates /me on success", async () => {
    const client = authedClient({ data: "uuid-1", error: null });
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    await upsertVoteHistoryAction({
      election_slug: "pres-2022-t1",
      election_result_id: "r-1",
      choice_kind: "vote"
    });

    expect(client.rpc).toHaveBeenCalledWith(
      "rpc_upsert_vote_history",
      expect.objectContaining({
        p_election_slug: "pres-2022-t1",
        p_election_result_id: "r-1",
        p_choice_kind: "vote"
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/me");
  });

  it("nulls election_result_id when choice is an abstention kind", async () => {
    const client = authedClient({ data: "uuid-1", error: null });
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    await upsertVoteHistoryAction({
      election_slug: "pres-2022-t1",
      election_result_id: "r-1",
      choice_kind: "blanc"
    });

    expect(client.rpc).toHaveBeenCalledWith(
      "rpc_upsert_vote_history",
      expect.objectContaining({
        p_election_result_id: null,
        p_choice_kind: "blanc"
      })
    );
  });

  it("surfaces a generic error when the RPC fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      authedClient({ data: null, error: { message: "db down", code: "42000" } })
    );

    await expect(
      upsertVoteHistoryAction({
        election_slug: "pres-2022-t1",
        election_result_id: "r-1",
        choice_kind: "vote"
      })
    ).rejects.toThrow(/Enregistrement impossible/);
  });
});

describe("deleteVoteHistoryAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects when slug is empty", async () => {
    await expect(deleteVoteHistoryAction("")).rejects.toThrow(/Scrutin requis/);
  });

  it("rejects when user is not authenticated", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(anonClient());
    await expect(deleteVoteHistoryAction("pres-2022-t1")).rejects.toThrow(
      /Authentication required/
    );
  });

  it("calls rpc_delete_vote_history with the slug and revalidates /me", async () => {
    const client = authedClient({ data: true, error: null });
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    await deleteVoteHistoryAction("pres-2022-t1");

    expect(client.rpc).toHaveBeenCalledWith("rpc_delete_vote_history", {
      p_election_slug: "pres-2022-t1"
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/me");
  });

  it("surfaces a generic error when the RPC fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      authedClient({ data: null, error: { message: "db down" } })
    );
    await expect(deleteVoteHistoryAction("pres-2022-t1")).rejects.toThrow(
      /Suppression impossible/
    );
  });
});
