import { beforeEach, describe, expect, it, vi } from "vitest";

import { upsertVoteHistoryAction } from "@/lib/actions/vault";
import {
  VOTE_HISTORY_SCOPE_GROUPS,
  resolveVoteHistoryScopeKey
} from "@/lib/constants/vote-history-scopes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn()
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

describe("vault settings", () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
  });

  it("exposes the national election scope groups", () => {
    expect(VOTE_HISTORY_SCOPE_GROUPS).toEqual([
      { kind: "presidential", label: "Presidentielle", years: [2007, 2012, 2017, 2022] },
      { kind: "legislative", label: "Legislatives", years: [2007, 2012, 2017, 2022, 2024] },
      { kind: "european", label: "Europeennes", years: [2009, 2014, 2019, 2024] }
    ]);

    expect(resolveVoteHistoryScopeKey("presidential:2022")).toEqual({
      election_scope_kind: "presidential",
      election_scope_year: 2022,
      election_scope_key: "presidential:2022",
      election_scope_label: "Presidentielle 2022"
    });
  });

  it("serializes the selected vote scope into the existing RPC payload", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mockedCreateServerSupabaseClient.mockResolvedValue({ rpc } as never);

    await upsertVoteHistoryAction(
      makeFormData({
        vote_history_scope: "legislative:2024",
        participation_status: "voted",
        declared_option_label: "Abstention",
        declared_candidate_name: "Candidat teste",
        location_label: "Paris",
        polling_station_label: "Bureau 12",
        vote_context: "source=manual",
        redirect_path: "/me/settings"
      })
    );

    expect(rpc).toHaveBeenCalledWith("rpc_upsert_private_vote_record", {
      p_vote_record_id: null,
      p_election_term_id: null,
      p_territory_id: null,
      p_vote_round: null,
      p_declared_option_label: "Abstention",
      p_declared_party_term_id: null,
      p_declared_candidate_name: "Candidat teste",
      p_location_label: "Paris",
      p_polling_station_label: "Bureau 12",
      p_vote_context: {
        election_scope_kind: "legislative",
        election_scope_year: 2024,
        election_scope_key: "legislative:2024",
        election_scope_label: "Legislatives 2024",
        participation_status: "voted",
        vote_context: "source=manual"
      }
    });
  });
});
