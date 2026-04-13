import type { HomeScreenData, LoadState } from "@/lib/types/screens";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toHomeFeedTopic } from "./canonical";

export async function getHomeScreenData(): Promise<LoadState<HomeScreenData>> {
  const supabase = await createServerSupabaseClient();

  const { data: feedRows, error } = await supabase
    .from("v_feed_global")
    .select("*")
    .order("thread_score", { ascending: false })
    .order("latest_thread_post_at", { ascending: false, nullsFirst: false })
    .order("editorial_feed_rank", { ascending: true })
    .limit(12);

  const feed = (feedRows ?? []).map((row, index) =>
    toHomeFeedTopic(row as Record<string, unknown>, index + 1)
  );
  const watchlist = feed
    .filter((topic) =>
      topic.feed_reason_code === "pending_resolution" ||
      topic.feed_reason_code === "recently_resolved" ||
      topic.feed_reason_code === "closing_soon"
    )
    .slice(0, 4);
  const cards = feed.filter((topic) => topic.card_payload || topic.topic_card_payload.card_payload).slice(0, 4);
  const territories = feed
    .filter((topic) => topic.space_slug)
    .filter(
      (topic, index, collection) =>
        collection.findIndex(
          (candidate) => candidate.space_slug === topic.space_slug
        ) === index
    )
    .slice(0, 5);

  return {
    data: {
      feed,
      watchlist,
      cards,
      territories
    },
    error: error?.message ?? null
  };
}
