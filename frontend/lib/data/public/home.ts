import type { HomeScreenData, LoadState } from "@/lib/types/screens";
import { matchesPoliticalBloc } from "@/lib/data/political-taxonomy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toHomeFeedTopic } from "./canonical";

export async function getHomeScreenData(blocSlug?: string | null): Promise<LoadState<HomeScreenData>> {
  const supabase = await createServerSupabaseClient();

  const { data: feedRows, error } = await supabase
    .from("v_feed_global")
    .select("*")
    .order("thread_score", { ascending: false })
    .order("latest_thread_post_at", { ascending: false, nullsFirst: false })
    .order("editorial_feed_rank", { ascending: true })
    .limit(24);

  const feed = (feedRows ?? [])
    .filter((row) => matchesPoliticalBloc(row as Record<string, unknown>, blocSlug ?? null))
    .map((row, index) => toHomeFeedTopic(row as Record<string, unknown>, index + 1));

  return {
    data: {
      feed,
      selectedBloc: blocSlug ?? null
    },
    error: error?.message ?? null
  };
}
