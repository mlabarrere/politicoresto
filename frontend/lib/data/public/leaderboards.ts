import type { LeaderboardEntryView } from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getGlobalLeaderboard(limit = 6) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("v_global_leaderboard")
    .select("*")
    .order("global_rank", { ascending: true })
    .limit(limit);

  if (error) {
    if ((error as { code?: string }).code === "PGRST205") {
      return [];
    }
    throw error;
  }

  return (data ?? []) as LeaderboardEntryView[];
}

export async function getEntityLeaderboard(entityId: string, limit = 6) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("v_entity_leaderboard")
    .select("*")
    .eq("entity_id", entityId)
    .order("local_rank", { ascending: true })
    .limit(limit);

  if (error) {
    if ((error as { code?: string }).code === "PGRST205") {
      return [];
    }
    throw error;
  }

  return (data ?? []) as LeaderboardEntryView[];
}
