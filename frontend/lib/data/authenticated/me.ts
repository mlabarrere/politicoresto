import type { LoadState, MeDashboardScreenData } from "@/lib/types/screens";
import type {
  MyCardInventoryView,
  MyPredictionHistoryView,
  MyReputationSummaryView
} from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getMeDashboardData(): Promise<LoadState<MeDashboardScreenData>> {
  const supabase = await createServerSupabaseClient();

  const [reputationResult, cardsResult, predictionsResult] = await Promise.all([
    supabase.from("v_my_reputation_summary").select("*").maybeSingle(),
    supabase
      .from("v_my_card_inventory")
      .select("*")
      .order("last_granted_at", { ascending: false }),
    supabase
      .from("v_my_prediction_history")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(10)
  ]);

  const errors = [reputationResult.error, cardsResult.error, predictionsResult.error]
    .filter(Boolean)
    .map((error) => error?.message);

  return {
    data: {
      reputation: (reputationResult.data ?? null) as MyReputationSummaryView | null,
      cards: (cardsResult.data ?? []) as MyCardInventoryView[],
      predictions: (predictionsResult.data ?? []) as MyPredictionHistoryView[]
    },
    error: errors.length ? errors.join(" | ") : null
  };
}

export async function getMyPredictionHistory() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("v_my_prediction_history")
    .select("*")
    .order("recorded_at", { ascending: false });

  return {
    data: (data ?? []) as MyPredictionHistoryView[],
    error: error?.message ?? null
  };
}

export async function getMyCardInventory() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("v_my_card_inventory")
    .select("*")
    .order("last_granted_at", { ascending: false });

  return {
    data: (data ?? []) as MyCardInventoryView[],
    error: error?.message ?? null
  };
}

export async function getMyReputationSummary() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("v_my_reputation_summary")
    .select("*")
    .maybeSingle();

  return {
    data: (data ?? null) as MyReputationSummaryView | null,
    error: error?.message ?? null
  };
}
