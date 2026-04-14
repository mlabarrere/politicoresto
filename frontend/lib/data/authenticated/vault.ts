import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  formatVoteHistoryScopeLabel,
  VOTE_HISTORY_SCOPE_GROUPS,
  VOTE_PARTICIPATION_OPTIONS
} from "@/lib/constants/vote-history-scopes";

export type PrivateProfileRow = {
  user_id: string;
  political_interest_level: number | null;
  notes_private: string | null;
  profile_payload: Record<string, unknown> | null;
  updated_at: string;
};

export type VoteHistoryRow = {
  id: string;
  election_term_id: string | null;
  territory_id: string | null;
  vote_round: number | null;
  declared_option_label: string;
  declared_candidate_name: string | null;
  location_label: string | null;
  polling_station_label: string | null;
  vote_context: Record<string, unknown> | null;
  election_scope_label: string | null;
  participation_status_label: string | null;
  declared_at: string;
};

export type ConsentRow = {
  id: string;
  consent_type: string;
  consent_status: string;
  policy_version: string;
  captured_at: string;
  source: string;
};

export async function getVaultSettingsData() {
  const supabase = await createServerSupabaseClient();

  const [profileResult, historyResult, consentResult] = await Promise.all([
    supabase.rpc("rpc_get_private_political_profile"),
    supabase.rpc("rpc_list_private_vote_history"),
    supabase.rpc("rpc_list_sensitive_consents")
  ]);

  const errors = [profileResult.error, historyResult.error, consentResult.error]
    .filter(Boolean)
    .map((item) => item?.message)
    .filter(Boolean);

  return {
    profile: (profileResult.data ?? null) as PrivateProfileRow | null,
    voteHistory: ((historyResult.data ?? []) as Array<Omit<VoteHistoryRow, "election_scope_label">>).map(
      (row) => ({
        ...row,
        election_scope_label: formatVoteHistoryScopeLabel(row.vote_context),
        participation_status_label:
          VOTE_PARTICIPATION_OPTIONS.find(
            (item) => item.value === row.vote_context?.participation_status
          )?.label ?? null
      })
    ),
    consents: (consentResult.data ?? []) as ConsentRow[],
    voteHistoryScopes: VOTE_HISTORY_SCOPE_GROUPS,
    error: errors.length ? errors.join(" | ") : null
  };
}
