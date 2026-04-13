import type { HomeScreenData, LoadState } from "@/lib/types/screens";
import type { HomeFeedTopicView } from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEditorialTopicSelect, toHomeFeedTopic, type EditorialTopicRow } from "./editorial";

export async function getHomeScreenData(): Promise<LoadState<HomeScreenData>> {
  const supabase = await createServerSupabaseClient();

  const { data: feedRows, error } = await supabase
    .from("topics_editorial")
    .select(getEditorialTopicSelect())
    .order("editorial_priority", { ascending: false })
    .order("concreteness_score", { ascending: false })
    .limit(12);

  const feed = ((feedRows ?? []) as unknown as EditorialTopicRow[]).map((topic, index) =>
    toHomeFeedTopic(topic, index + 1)
  );
  const watchlist = feed
    .filter((topic) =>
      topic.feed_reason_code === "pending_resolution" ||
      topic.feed_reason_code === "recently_resolved" ||
      topic.feed_reason_code === "closing_soon"
    )
    .slice(0, 4);
  const cards: HomeFeedTopicView[] = [];
  const territories = feed
    .filter((topic) => topic.primary_territory_name)
    .filter(
      (topic, index, collection) =>
        collection.findIndex(
          (candidate) => candidate.primary_territory_slug === topic.primary_territory_slug
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
