import type { LoadState, MeDashboardScreenData } from "@/lib/types/screens";
import type { MyReputationSummaryView, PrivateVoteHistoryView } from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getMeDashboardData(): Promise<LoadState<MeDashboardScreenData>> {
  const supabase = await createServerSupabaseClient();

  const [reputationResult, privateHistoryResult] = await Promise.all([
    supabase.from("v_my_reputation_summary").select("*").maybeSingle(),
    supabase.rpc("rpc_list_private_vote_history")
  ]);

  const errors = [reputationResult.error, privateHistoryResult.error]
    .filter(Boolean)
    .map((error) => error?.message);

  return {
    data: {
      reputation: (reputationResult.data ?? null) as MyReputationSummaryView | null,
      privateHistory: ((privateHistoryResult.data ?? []) as PrivateVoteHistoryView[]).slice(0, 10)
    },
    error: errors.length ? errors.join(" | ") : null
  };
}

export async function getMyPrivateHistory() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("rpc_list_private_vote_history");

  return {
    data: (data ?? []) as PrivateVoteHistoryView[],
    error: error?.message ?? null
  };
}

export async function getMyReputationSummary() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("v_my_reputation_summary").select("*").maybeSingle();

  return {
    data: (data ?? null) as MyReputationSummaryView | null,
    error: error?.message ?? null
  };
}
