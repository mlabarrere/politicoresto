import type { HomeScreenData, LoadState } from "@/lib/types/screens";
import { matchesPoliticalBloc } from "@/lib/data/political-taxonomy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth-user";
import { REACTION_TYPE_TO_SIDE } from "@/lib/reactions";
import { toHomeFeedTopic } from "./canonical";
import { getPollSummariesByPostItemIds } from "./polls";

type BackendError = {
  message?: string;
  code?: string;
};

function isCapabilityMissing(error: BackendError | null | undefined) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  const code = String(error.code ?? "").toLowerCase();
  return (
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("undefined table") ||
    message.includes("undefined function") ||
    code === "42p01" ||
    code === "42883" ||
    code === "pgrst202" ||
    code === "pgrst204"
  );
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toTimestamp(value: unknown) {
  if (typeof value !== "string") return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortFeedRows(rows: Record<string, unknown>[]) {
  return [...rows].sort((a, b) => {
    const scoreDiff =
      toNumber(b.post_score) - toNumber(a.post_score) ||
      toNumber(b.editorial_feed_score) - toNumber(a.editorial_feed_score) ||
      toNumber(b.thread_score) - toNumber(a.thread_score);
    if (scoreDiff !== 0) return scoreDiff;

    const freshnessDiff =
      toTimestamp(b.latest_post_at) - toTimestamp(a.latest_post_at) ||
      toTimestamp(b.last_activity_at) - toTimestamp(a.last_activity_at) ||
      toTimestamp(b.latest_thread_post_at) - toTimestamp(a.latest_thread_post_at) ||
      toTimestamp(b.created_at) - toTimestamp(a.created_at);
    if (freshnessDiff !== 0) return freshnessDiff;

    return toNumber(a.editorial_feed_rank, Number.MAX_SAFE_INTEGER) - toNumber(b.editorial_feed_rank, Number.MAX_SAFE_INTEGER);
  });
}

export async function getHomeScreenData(
  blocSlug?: string | null,
  currentUserId?: string | null
): Promise<LoadState<HomeScreenData>> {
  const supabase = await createServerSupabaseClient();

  const primaryFeed = await supabase
    .from("v_feed_global_post")
    .select("*")
    .order("post_score", { ascending: false })
    .order("latest_post_at", { ascending: false, nullsFirst: false })
    .order("editorial_feed_rank", { ascending: true })
    .limit(24);

  let feedRows = (primaryFeed.data ?? []) as Record<string, unknown>[];
  let feedError: BackendError | null = primaryFeed.error;

  if (feedError && isCapabilityMissing(feedError)) {
    const fallbackFeed = await supabase.from("v_feed_global").select("*").limit(48);
    feedRows = sortFeedRows((fallbackFeed.data ?? []) as Record<string, unknown>[]).slice(0, 24);
    feedError = fallbackFeed.error;
  }

  const safeError = feedError && !isCapabilityMissing(feedError) ? String(feedError.message ?? "Feed indisponible.") : null;

  const feed = (feedRows ?? [])
    .filter((row) => matchesPoliticalBloc(row as Record<string, unknown>, blocSlug ?? null))
    .map((row, index) => toHomeFeedTopic(row as Record<string, unknown>, index + 1));

  const postRootIds = feed.map((item) => item.topic_id).filter(Boolean);
  const postByRootId = new Map<
    string,
    {
      id: string;
      content: string | null;
      gauche_count: number | null;
      droite_count: number | null;
      comment_count: number | null;
      created_at: string;
    }
  >();

  if (postRootIds.length > 0) {
    const { data: posts } = await supabase
      .from("v_posts")
      .select("id, post_id, content, gauche_count, droite_count, comment_count, created_at")
      .in("post_id", postRootIds)
      .order("created_at", { ascending: true });

    for (const post of posts ?? []) {
      const key = String(post.post_id);
      if (!postByRootId.has(key)) {
        postByRootId.set(key, {
          id: String(post.id),
          content: (post.content as string | null) ?? null,
          gauche_count: (post.gauche_count as number | null) ?? 0,
          droite_count: (post.droite_count as number | null) ?? 0,
          comment_count: (post.comment_count as number | null) ?? 0,
          created_at: String(post.created_at)
        });
      }
    }
  }

  const resolvedCurrentUserId =
    currentUserId !== undefined ? currentUserId : (await getCurrentUser(supabase))?.id ?? null;

  const reactionByTarget = new Map<string, "gauche" | "droite">();
  const postIds = Array.from(postByRootId.values()).map((post) => post.id);

  if (resolvedCurrentUserId && postIds.length > 0) {
    const { data: ownReactions } = await supabase
      .from("reaction")
      .select("target_id, reaction_type")
      .eq("target_type", "post")
      .eq("user_id", resolvedCurrentUserId)
      .in("target_id", postIds);

    for (const reaction of ownReactions ?? []) {
      const reactionType = reaction.reaction_type as "upvote" | "downvote";
      reactionByTarget.set(String(reaction.target_id), REACTION_TYPE_TO_SIDE[reactionType]);
    }
  }

  const enrichedFeed = feed.map((item) => {
    const post = postByRootId.get(item.topic_id);
    if (!post) return item;

    return {
      ...item,
      feed_post_id: post.id,
      feed_post_content: post.content,
      feed_gauche_count: post.gauche_count,
      feed_droite_count: post.droite_count,
      feed_comment_count: post.comment_count,
      feed_user_reaction_side: reactionByTarget.get(post.id) ?? null
    };
  });

  const pollByPostItemId = await getPollSummariesByPostItemIds(
    enrichedFeed
      .map((item) => item.feed_post_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  );

  const feedWithPoll = enrichedFeed.map((item) => ({
    ...item,
    feed_poll_summary:
      typeof item.feed_post_id === "string" ? (pollByPostItemId.get(item.feed_post_id) ?? null) : null
  }));

  return {
    data: {
      feed: feedWithPoll,
      selectedBloc: blocSlug ?? null
    },
    error: safeError
  };
}


