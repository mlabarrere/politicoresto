import type { LoadState, SpaceDetailScreenData, SpacesScreenData } from "@/lib/types/screens";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toHomeFeedTopic, toSpaceRow, toTopicSummary } from "./canonical";
import { getEntityLeaderboard } from "./leaderboards";

export async function getSpacesScreenData(): Promise<LoadState<SpacesScreenData>> {
  const supabase = await createServerSupabaseClient();

  const [spacesResult, topicsResult] = await Promise.all([
    supabase
      .from("space")
      .select("id, slug, name, description, space_type, space_status, visibility, created_at, space_role, primary_entity_id")
      .in("space_role", ["global", "party", "bloc"])
      .neq("space_status", "removed")
      .order("space_role", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("v_feed_global")
      .select("*")
      .order("thread_score", { ascending: false })
      .order("latest_thread_post_at", { ascending: false, nullsFirst: false })
      .limit(8)
  ]);

  const errors = [spacesResult.error, topicsResult.error]
    .filter(Boolean)
    .map((error) => error?.message);

  return {
    data: {
      spaces: (spacesResult.data ?? []).map((space) => toSpaceRow(space as Record<string, unknown>)),
      highlightedTopics: (topicsResult.data ?? []).map((topic, index) =>
        toTopicSummary({
          ...(topic as Record<string, unknown>),
          id: String((topic as Record<string, unknown>).topic_id),
          slug: String((topic as Record<string, unknown>).topic_slug),
          title: String((topic as Record<string, unknown>).topic_title),
          description: ((topic as Record<string, unknown>).topic_description as string | null) ?? null,
          topic_status: String((topic as Record<string, unknown>).topic_status),
          effective_visibility: String((topic as Record<string, unknown>).visibility ?? "public"),
          open_at: String((topic as Record<string, unknown>).open_at),
          close_at: String((topic as Record<string, unknown>).close_at),
          created_at: String((topic as Record<string, unknown>).created_at)
        })
      )
    },
    error: errors.length ? errors.join(" | ") : null
  };
}

export async function getSpaceDetail(slug: string): Promise<SpaceDetailScreenData | null> {
  const supabase = await createServerSupabaseClient();

  const { data: space, error } = await supabase
    .from("space")
    .select("id, slug, name, description, space_type, space_status, visibility, created_at, space_role, primary_entity_id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!space) {
    return null;
  }

  const spaceRow = toSpaceRow(space as Record<string, unknown>);

  const topicsPromise =
    typeof space.primary_entity_id === "string" && space.primary_entity_id
      ? supabase
          .from("v_feed_entity")
          .select("*")
          .eq("entity_id", space.primary_entity_id)
          .order("thread_score", { ascending: false })
          .order("latest_thread_post_at", { ascending: false, nullsFirst: false })
      : supabase
          .from("v_thread_detail")
          .select("*")
          .eq("space_slug", slug)
          .order("thread_score", { ascending: false })
          .order("latest_thread_post_at", { ascending: false, nullsFirst: false });

  const [{ data: topics, error: topicsError }, leaderboard] = await Promise.all([
    topicsPromise,
    typeof space.primary_entity_id === "string" && space.primary_entity_id
      ? getEntityLeaderboard(space.primary_entity_id, 6)
      : Promise.resolve([])
  ]);

  if (topicsError) {
    throw topicsError;
  }

  const mappedTopics =
    typeof space.primary_entity_id === "string" && space.primary_entity_id
      ? (topics ?? []).map((topic) =>
          toTopicSummary({
            ...(topic as Record<string, unknown>),
            id: String((topic as Record<string, unknown>).topic_id),
            slug: String((topic as Record<string, unknown>).topic_slug),
            title: String((topic as Record<string, unknown>).topic_title),
            description: ((topic as Record<string, unknown>).topic_description as string | null) ?? null,
            topic_status: String((topic as Record<string, unknown>).topic_status),
            effective_visibility: String((topic as Record<string, unknown>).visibility ?? "public"),
            open_at: String((topic as Record<string, unknown>).open_at),
            close_at: String((topic as Record<string, unknown>).close_at),
            created_at: String((topic as Record<string, unknown>).created_at)
          })
        )
      : (topics ?? []).map((topic) =>
          toTopicSummary(
            topic as Record<string, unknown> & {
              id: string;
              slug: string;
              title: string;
              topic_status: string;
              effective_visibility: string;
              open_at: string;
              close_at: string;
              created_at: string;
            }
          )
        );

  return {
    space: spaceRow,
    topics: mappedTopics,
    feed: (topics ?? []).map((item, index) =>
      "topic_id" in (item as Record<string, unknown>)
        ? toHomeFeedTopic(item as Record<string, unknown>, index + 1)
        : toHomeFeedTopic(
            {
              ...(item as Record<string, unknown>),
              topic_id: String((item as Record<string, unknown>).id),
              topic_slug: String((item as Record<string, unknown>).slug),
              topic_title: String((item as Record<string, unknown>).title),
              topic_description: ((item as Record<string, unknown>).description as string | null) ?? null,
              visibility: String((item as Record<string, unknown>).effective_visibility ?? "public"),
              thread_score: Number((item as Record<string, unknown>).thread_score ?? 0),
              editorial_feed_rank: index + 1
            },
            index + 1
          )
    ),
    leaderboard
  };
}
