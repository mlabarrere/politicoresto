import type { HomeScreenData, LoadState, SubjectView } from "@/lib/types/screens";
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
      "topic_id, topic_slug, topic_title, topic_description, topic_status, derived_lifecycle_state, visibility, is_sensitive, space_id, space_slug, space_name, primary_taxonomy_slug, primary_taxonomy_label, discussion_payload, resolution_payload, last_activity_at, open_at, close_at, resolve_deadline_at, resolved_at, visible_post_count, activity_score_raw, freshness_score_raw, participation_score_raw, resolution_proximity_score_raw, editorial_priority_score_raw, shift_score_raw, editorial_feed_score, feed_reason_code, feed_reason_label, editorial_feed_rank, topic_card_payload, latest_thread_post_at, thread_score"
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

  // Fetch subjects per post item
  const feedPostItemIds = feedWithPoll
    .map((item) => item.feed_post_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const subjectsByPostItemId = new Map<string, { slug: string; name: string; emoji: string | null }[]>();
  if (feedPostItemIds.length > 0) {
    const subjectsResult = await supabase
      .from("thread_post_subject")
      .select("thread_post_id, subject(slug, name, emoji)")
      .in("thread_post_id", feedPostItemIds);

    for (const row of subjectsResult.data ?? []) {
      const r = row as unknown as { thread_post_id?: string; subject?: { slug: string; name: string; emoji: string | null } | null };
      const postId = String(r.thread_post_id ?? "");
      const subject = r.subject;
      if (!postId || !subject) continue;
      const existing = subjectsByPostItemId.get(postId) ?? [];
      existing.push(subject);
      subjectsByPostItemId.set(postId, existing);
    }
  }

  // Fetch party_tags per post item
  const partyTagsByPostItemId = new Map<string, string[]>();
  if (feedPostItemIds.length > 0) {
    const partyResult = await supabase
      .from("thread_post")
      .select("id, party_tags")
      .in("id", feedPostItemIds);

    for (const row of partyResult.data ?? []) {
      const id = String((row as { id?: string }).id ?? "");
      const tags = (row as { party_tags?: string[] }).party_tags;
      if (id && Array.isArray(tags) && tags.length > 0) {
        partyTagsByPostItemId.set(id, tags);
      }
    }
  }

  const feedWithSubjects = feedWithPoll.map((item) => ({
    ...item,
    feed_subjects: typeof item.feed_post_id === "string" ? (subjectsByPostItemId.get(item.feed_post_id) ?? null) : null,
    feed_party_tags: typeof item.feed_post_id === "string" ? (partyTagsByPostItemId.get(item.feed_post_id) ?? null) : null
  }));

  // Fetch all active subjects for filter bar
  const allSubjectsResult = await supabase
    .from("subject")
    .select("id, slug, name, emoji, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  const allSubjects: SubjectView[] = (allSubjectsResult.data ?? []).map((row) => ({
    id: String((row as { id?: string }).id ?? ""),
    slug: String((row as { slug?: string }).slug ?? ""),
    name: String((row as { name?: string }).name ?? ""),
    emoji: ((row as { emoji?: string | null }).emoji) ?? null,
    sort_order: Number((row as { sort_order?: number }).sort_order ?? 0)
  }));

  return {
    data: {
      feed: feedWithSubjects,
      subjects: allSubjects
    },
    error: safeError
  };
}
