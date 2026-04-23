import type { PostFeedItemView } from "@/lib/types/views";
import type { HomeScreenData, LoadState, SubjectView } from "@/lib/types/screens";
import { createLogger, logError } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth-user";
import { emptyQueryResult } from "@/lib/supabase/query-utils";
import { REACTION_TYPE_TO_SIDE } from "@/lib/reactions";
import { toHomeFeedTopic } from "./canonical";
import { getPollSummariesByPostItemIds } from "./polls";

const log = createLogger("data.home");

export const FEED_PAGE_SIZE = 20;

export interface FeedCursor {
  // Ordering is: thread_score desc, latest_thread_post_at desc, editorial_feed_rank asc.
  // We page on the latter two (thread_score is a derived view column that
  // doesn't mutate frequently within a feed window) plus topic_id for tie
  // breaking.
  latest_thread_post_at: string | null;
  editorial_feed_rank: number | null;
  topic_id: string;
}

export interface FeedBatch {
  items: PostFeedItemView[];
  nextCursor: FeedCursor | null;
}

export function encodeCursor(c: FeedCursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): FeedCursor | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<FeedCursor>;
    if (typeof parsed.topic_id !== "string") return null;
    return {
      latest_thread_post_at: parsed.latest_thread_post_at ?? null,
      editorial_feed_rank:
        typeof parsed.editorial_feed_rank === "number"
          ? parsed.editorial_feed_rank
          : null,
      topic_id: parsed.topic_id,
    };
  } catch {
    return null;
  }
}

export async function getHomeScreenData(
  currentUserId?: string | null,
  opts: { cursor?: FeedCursor | null; limit?: number } = {},
): Promise<LoadState<HomeScreenData & { nextCursor: FeedCursor | null }>> {
  const t0 = Date.now();
  log.debug({ event: "home.fetch.start", user_id: currentUserId ?? null }, "getHomeScreenData start");

  const supabase = await createServerSupabaseClient();
  const pageSize = Math.max(1, Math.min(50, opts.limit ?? FEED_PAGE_SIZE));

  // Step 1: feed topics (required first — subsequent queries depend on topic IDs)
  let feedQuery = supabase
    .from("v_feed_global")
    .select(
      "topic_id, topic_slug, topic_title, topic_description, topic_status, derived_lifecycle_state, visibility, is_sensitive, space_id, space_slug, space_name, primary_taxonomy_slug, primary_taxonomy_label, discussion_payload, resolution_payload, last_activity_at, open_at, close_at, resolve_deadline_at, resolved_at, visible_post_count, activity_score_raw, freshness_score_raw, participation_score_raw, resolution_proximity_score_raw, editorial_priority_score_raw, shift_score_raw, editorial_feed_score, feed_reason_code, feed_reason_label, editorial_feed_rank, topic_card_payload, latest_thread_post_at, thread_score"
    )
    .order("thread_score", { ascending: false })
    .order("latest_thread_post_at", { ascending: false, nullsFirst: false })
    .order("editorial_feed_rank", { ascending: true })
    .limit(pageSize + 1); // +1 so we can detect whether another page exists.

  if (opts.cursor?.latest_thread_post_at) {
    // Simple cursor: fetch rows strictly older than the cursor's
    // latest_thread_post_at. Ties at the same timestamp are acceptable
    // collateral (they'll show in the prior batch too, dedup client-side).
    feedQuery = feedQuery.lt(
      "latest_thread_post_at",
      opts.cursor.latest_thread_post_at,
    );
  }

  const feedResult = await feedQuery;

  if (feedResult.error) {
    logError(log, feedResult.error, { event: "home.feed.query_failed", code: feedResult.error.code, message: "v_feed_global query failed" });
  } else {
    log.debug({ event: "home.feed.fetched", rows: feedResult.data?.length ?? 0, duration_ms: Date.now() - t0 }, "v_feed_global fetched");
  }

  const safeError = feedResult.error ? "Feed indisponible pour le moment." : null;
  const rawRows = (feedResult.data ?? []) as Record<string, unknown>[];
  const hasMore = rawRows.length > pageSize;
  const feedRows = hasMore ? rawRows.slice(0, pageSize) : rawRows;
  const feed = feedRows.map((row, index) => toHomeFeedTopic(row, index + 1));
  const lastFeedRaw = hasMore ? feedRows[feedRows.length - 1] : null;
  const nextCursor: FeedCursor | null = lastFeedRaw
    ? {
        latest_thread_post_at:
          (lastFeedRaw.latest_thread_post_at as string | null) ?? null,
        editorial_feed_rank:
          (lastFeedRaw.editorial_feed_rank as number | null) ?? null,
        topic_id: String(lastFeedRaw.topic_id ?? ""),
      }
    : null;

  const postRootIds = feed.map((item) => item.topic_id).filter(Boolean);

  // Step 2: thread posts + user identity in parallel (getCurrentUser has no dependency on feed data)
  const [threadPostsResult, resolvedUserId] = await Promise.all([
    postRootIds.length > 0
      ? supabase
          .from("v_thread_posts")
          .select("id, thread_id, type, content, username, display_name, gauche_count, droite_count, comment_count, created_at")
          .in("thread_id", postRootIds)
          .order("created_at", { ascending: true })
      : emptyQueryResult<Record<string, unknown>>(),
    currentUserId ?? getAuthUserId(supabase)
  ]);

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

  const postIds = Array.from(postByRootId.values()).map((post) => post.id);
  const feedWithOp = feed.filter((item) => postByRootId.has(item.topic_id));

  // pollPostIds === future feed_post_id values: both are post.id from postByRootId,
  // assigned to feed_post_id in enrichedFeed below and used as the poll map key.
  const pollPostIds = feedWithOp
    .map((item) => postByRootId.get(item.topic_id)?.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  interface ReactionRow { target_id: string; reaction_type: string }

  // Step 3: reactions + poll summaries in parallel (both depend on post IDs, independent of each other)
  const [ownReactionsResult, pollByPostItemId] = await Promise.all([
    resolvedUserId && postIds.length > 0
      ? supabase
          .from("reaction")
          .select("target_id, reaction_type")
          .eq("target_type", "thread_post")
          .eq("user_id", resolvedUserId)
          .in("target_id", postIds)
      : emptyQueryResult<ReactionRow>(),
    pollPostIds.length > 0
      ? getPollSummariesByPostItemIds(pollPostIds, { supabase })
      : Promise.resolve(new Map())
  ]);

  const reactionByTarget = new Map<string, "gauche" | "droite">();
  if (!ownReactionsResult.error) {
    for (const reaction of ownReactionsResult.data ?? []) {
      const reactionType = reaction.reaction_type as "upvote" | "downvote";
      reactionByTarget.set(String(reaction.target_id), REACTION_TYPE_TO_SIDE[reactionType]);
    }
  }

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

  // Fetch all active subjects for filter bar — only on initial page
  // (cursor absent). Pagination loads fresh batches, not fresh taxonomy.
  let allSubjects: SubjectView[] = [];
  if (!opts.cursor) {
    const allSubjectsResult = await supabase
      .from("subject")
      .select("id, slug, name, emoji, sort_order")
      .eq("is_active", true)
      .order("sort_order");

    if (allSubjectsResult.error) {
      logError(log, allSubjectsResult.error, { event: "home.subjects.fetch_failed", message: "subjects fetch failed" });
    } else {
      log.debug({ event: "home.subjects.fetched", count: allSubjectsResult.data?.length ?? 0 }, "subjects fetched");
    }

    allSubjects = (allSubjectsResult.data ?? []).map((row) => ({
      id: String((row as { id?: string }).id ?? ""),
      slug: String((row as { slug?: string }).slug ?? ""),
      name: String((row as { name?: string }).name ?? ""),
      emoji: ((row as { emoji?: string | null }).emoji) ?? null,
      sort_order: Number((row as { sort_order?: number }).sort_order ?? 0)
    }));
  }

  log.info(
    {
      event: "home.fetch.done",
      feed_items: feedWithSubjects.length,
      subjects: allSubjects.length,
      duration_ms: Date.now() - t0,
      error: safeError ?? null,
      cursor: opts.cursor ? "present" : "initial",
    },
    "getHomeScreenData done",
  );

  return {
    data: {
      feed: feedWithSubjects,
      subjects: allSubjects,
      nextCursor,
    },
    error: safeError
  };
}
