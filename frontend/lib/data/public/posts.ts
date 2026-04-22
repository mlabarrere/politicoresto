import type { PostDetailScreenData } from "@/lib/types/screens";
import { REACTION_TYPE_TO_SIDE } from "@/lib/reactions";
import { getAuthUserId } from "@/lib/supabase/auth-user";
import { emptyQueryResult } from "@/lib/supabase/query-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toThreadRow } from "./canonical";
import { getPollSummariesByPostItemIds } from "./polls";

async function fetchTopicDetail({
  supabase,
  slug
}: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  slug: string;
}) {
  return await supabase
    .from("v_thread_detail")
    .select("id, slug, title, description, topic_status, effective_visibility, open_at, close_at, created_at, space_id")
    .eq("slug", slug)
    .maybeSingle();
}

async function fetchPostRows({
  supabase,
  topicId
}: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  topicId: string;
}) {
  const result = await supabase
    .from("v_thread_posts")
    .select(
      "id, thread_id, type, title, content, created_by, username, display_name, created_at, updated_at, status, gauche_count, droite_count, weighted_votes, comment_count"
    )
    .eq("thread_id", topicId)
    .order("created_at", { ascending: true });

  if (result.error) throw result.error;
  return result.data ?? [];
}

async function fetchCommentRows({
  supabase,
  topicId
}: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  topicId: string;
}) {
  const result = await supabase
    .from("v_post_comments")
    .select("id, thread_id, thread_post_id, parent_post_id, depth, author_user_id, username, display_name, title, body_markdown, created_at, updated_at, post_status, gauche_count, droite_count, comment_score")
    .eq("thread_id", topicId)
    .order("created_at", { ascending: true });

  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function getPostDetail(
  slug: string,
  currentUserId?: string | null
): Promise<PostDetailScreenData | null> {
  const supabase = await createServerSupabaseClient();

  // Resolve user identity and topic detail in parallel — neither depends on the other
  const [{ data: topic, error }, resolvedCurrentUserId] = await Promise.all([
    fetchTopicDetail({ supabase, slug }),
    currentUserId ?? getAuthUserId(supabase)
  ]);

  if (error) throw error;
  if (!topic) return null;

  const topicId = String(topic.id);
  const [postsResult, commentsResult] = await Promise.all([
    fetchPostRows({
      supabase,
      topicId
    }),
    fetchCommentRows({
      supabase,
      topicId
    })
  ]);

  const posts = postsResult as unknown as PostDetailScreenData["posts"];
  const comments = commentsResult as unknown as PostDetailScreenData["comments"];
  const postIds = posts.map((post) => String(post.id ?? "")).filter((id) => id.length > 0);

  const postsWithMetadata = posts.map((post) => ({
    ...post,
    post_id: String((post as { thread_id?: string | null }).thread_id ?? ""),
    metadata: null,
    poll_summary: null
  })) as PostDetailScreenData["posts"];

  const pollByPostItemId = await getPollSummariesByPostItemIds(
    postsWithMetadata.map((post) => post.id),
    { supabase }
  );
  for (const post of postsWithMetadata) {
    post.poll_summary = pollByPostItemId.get(post.id) ?? null;
  }

  const commentsList = comments.map((comment) => ({
    ...comment,
    post_id: String(comment.thread_id ?? ""),
    post_item_id: comment.thread_post_id ?? null
  }));

  if (!resolvedCurrentUserId) {
    return {
      post: toThreadRow(
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
      ),
      posts: postsWithMetadata,
      comments: commentsList
    };
  }

  const commentIds = commentsList.map((comment) => comment.id);
  interface ReactionRow { target_id: string; reaction_type: string }

  const [postReactions, commentReactions] = await Promise.all([
    postIds.length
      ? supabase
          .from("reaction")
          .select("target_id, reaction_type")
          .eq("target_type", "thread_post")
          .eq("user_id", resolvedCurrentUserId)
          .in("target_id", postIds)
      : emptyQueryResult<ReactionRow>(),
    commentIds.length
      ? supabase
          .from("reaction")
          .select("target_id, reaction_type")
          .eq("target_type", "comment")
          .eq("user_id", resolvedCurrentUserId)
          .in("target_id", commentIds)
      : emptyQueryResult<ReactionRow>()
  ]);

  if (postReactions.error) throw postReactions.error;
  if (commentReactions.error) throw commentReactions.error;

  const postReactionById = new Map<string, "gauche" | "droite">(
    (postReactions.data ?? []).map((row) => [
      String(row.target_id),
      REACTION_TYPE_TO_SIDE[row.reaction_type as "upvote" | "downvote"]
    ])
  );

  const commentReactionById = new Map<string, "gauche" | "droite">(
    (commentReactions.data ?? []).map((row) => [
      String(row.target_id),
      REACTION_TYPE_TO_SIDE[row.reaction_type as "upvote" | "downvote"]
    ])
  );

  return {
    post: toThreadRow(
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
    ),
    posts: postsWithMetadata.map((post) => ({
      ...post,
      user_reaction_side: postReactionById.get(post.id) ?? null
    })),
    comments: commentsList.map((comment) => ({
      ...comment,
      user_reaction_side: commentReactionById.get(comment.id) ?? null
    }))
  };
}
