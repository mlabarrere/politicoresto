import type { HomeScreenData, LoadState } from "@/lib/types/screens";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toHomeFeedTopic, toSpaceRow } from "./canonical";
import { getGlobalLeaderboard } from "./leaderboards";

export async function getHomeScreenData(): Promise<LoadState<HomeScreenData>> {
  const supabase = await createServerSupabaseClient();

  const [{ data: feedRows, error }, { data: spaceRows, error: spacesError }, leaderboardResult] =
    await Promise.all([
      supabase
        .from("v_feed_global")
        .select("*")
        .order("thread_score", { ascending: false })
        .order("latest_thread_post_at", { ascending: false, nullsFirst: false })
        .order("editorial_feed_rank", { ascending: true })
        .limit(18),
      supabase
        .from("space")
        .select("id, slug, name, description, space_type, space_status, visibility, created_at, space_role")
        .in("space_role", ["global", "party", "bloc"])
        .neq("space_status", "removed")
        .order("space_role", { ascending: true })
        .order("name", { ascending: true })
        .limit(6),
      getGlobalLeaderboard(6)
    ]);

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

  return {
    data: {
      feed,
      watchlist,
      featuredSpaces: (spaceRows ?? []).map((space) => toSpaceRow(space as Record<string, unknown>)),
      leaderboard: leaderboardResult
    },
    error: [error?.message, spacesError?.message].filter(Boolean).join(" | ") || null
  };
}
