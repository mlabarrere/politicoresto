import type { HomeScreenData, LoadState } from "@/lib/types/screens";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth-user";
import { REACTION_TYPE_TO_SIDE } from "@/lib/reactions";
import { toHomeFeedTopic } from "./canonical";
import { getPollSummariesByPostItemIds } from "./polls";

export async function getHomeScreenData(currentUserId?: string | null): Promise<LoadState<HomeScreenData>> {
  const supabase = await createServerSupabaseClient();

  const feedResult = await supabase
    .from("v_feed_global")
    .select(
      "topic_id, topic_slug, topic_title, topic_description, topic_status, derived_lifecycle_state, visibility, is_sensitive, space_id, space_slug, space_name, primary_taxonomy_slug, primary_taxonomy_label, prediction_type, prediction_question_title, aggregate_payload, metrics_payload, discussion_payload, card_payload, resolution_payload, last_activity_at, open_at, close_at, resolve_deadline_at, resolved_at, visible_post_count, active_prediction_count, activity_score_raw, freshness_score_raw, participation_score_raw, resolution_proximity_score_raw, editorial_priority_score_raw, shift_score_raw, editorial_feed_score, feed_reason_code, feed_reason_label, editorial_feed_rank, topic_card_payload, latest_thread_post_at, thread_score"
    )
    .order("thread_score", { ascending: false })
    .order("latest_thread_post_at", { ascending: false, nullsFirst: false })
    .order("editorial_feed_rank", { ascending: true })
    .limit(24);

  const safeError = feedResult.error ? "Feed indisponible pour le moment." : null;
  const feedRows = (feedResult.data ?? []) as Record<string, unknown>[];
  const feed = feedRows.map((row, index) => toHomeFeedTopic(row as Record<string, unknown>, index + 1));

  const postRootIds = feed.map((item) => item.topic_id).filter(Boolean);
  const postByRootId = new Map<
    string,
    {
      id: string;
      content: string | null;
      username: string | null;
      display_name: string | null;
      gauche_count: number | null;
      droite_count: number | null;
      comment_count: number | null;
      created_at: string;
    }
  >();

  if (postRootIds.length > 0) {
    const threadPostsResult = await supabase
      .from("v_thread_posts")
      .select("id, thread_id, type, content, username, display_name, gauche_count, droite_count, comment_count, created_at")
      .in("thread_id", postRootIds)
      .order("created_at", { ascending: true });

    for (const post of threadPostsResult.data ?? []) {
      if (typeof post.type === "string" && post.type !== "article") continue;
      const key = String((post as { thread_id?: string }).thread_id ?? "");
      if (!key || postByRootId.has(key)) continue;

      postByRootId.set(key, {
        id: String(post.id),
        content: (post.content as string | null) ?? null,
        username: (post.username as string | null) ?? null,
        display_name: (post.display_name as string | null) ?? null,
        gauche_count: (post.gauche_count as number | null) ?? 0,
        droite_count: (post.droite_count as number | null) ?? 0,
        comment_count: (post.comment_count as number | null) ?? 0,
        created_at: String(post.created_at)
      });
    }
  }

  const resolvedCurrentUserId =
    currentUserId !== undefined ? currentUserId : (await getCurrentUser(supabase))?.id ?? null;

  const reactionByTarget = new Map<string, "gauche" | "droite">();
  const postIds = Array.from(postByRootId.values()).map((post) => post.id);

  if (resolvedCurrentUserId && postIds.length > 0) {
    const ownReactionsResult = await supabase
      .from("reaction")
      .select("target_id, reaction_type")
      .eq("target_type", "thread_post")
      .eq("user_id", resolvedCurrentUserId)
      .in("target_id", postIds);

    if (!ownReactionsResult.error) {
      for (const reaction of ownReactionsResult.data ?? []) {
        const reactionType = reaction.reaction_type as "upvote" | "downvote";
        reactionByTarget.set(String(reaction.target_id), REACTION_TYPE_TO_SIDE[reactionType]);
      }
    }
  }

  const feedWithOp = feed.filter((item) => postByRootId.has(item.topic_id));

  const enrichedFeed = feedWithOp.map((item) => {
    const post = postByRootId.get(item.topic_id);
    if (!post) return item;

    return {
      ...item,
      feed_post_id: post.id,
      feed_post_content: post.content,
      feed_author_username: post.username,
      feed_author_display_name: post.display_name,
      feed_gauche_count: post.gauche_count,
      feed_droite_count: post.droite_count,
      feed_comment_count: post.comment_count,
      feed_user_reaction_side: reactionByTarget.get(post.id) ?? null
    };
  });

  const pollByPostItemId = await getPollSummariesByPostItemIds(
    enrichedFeed
      .map((item) => item.feed_post_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
    { supabase }
  );

  const feedWithPoll = enrichedFeed.map((item) => ({
    ...item,
    feed_poll_summary:
      typeof item.feed_post_id === "string" ? (pollByPostItemId.get(item.feed_post_id) ?? null) : null
  }));

  return {
    data: {
      feed: feedWithPoll
    },
    error: safeError
  };
}
