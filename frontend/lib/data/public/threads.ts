import type { ThreadDetailScreenData } from "@/lib/types/screens";
import { REACTION_TYPE_TO_SIDE } from "@/lib/reactions";
import { getCurrentUser } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toThreadRow } from "./canonical";

export async function getThreadDetail(
  slug: string,
  currentUserId?: string | null
): Promise<ThreadDetailScreenData | null> {
  const supabase = await createServerSupabaseClient();
  const resolvedCurrentUserId =
    currentUserId !== undefined ? currentUserId : (await getCurrentUser(supabase))?.id ?? null;

  const { data: topic, error } = await supabase
    .from("v_thread_detail")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!topic) {
    return null;
  }

  const [{ data: threadPosts, error: threadPostsError }, { data: comments, error: commentsError }] =
    await Promise.all([
      supabase
        .from("v_thread_posts")
        .select("id, thread_id, type, title, content, created_by, username, display_name, created_at, updated_at, status, gauche_count, droite_count, weighted_votes, comment_count")
        .eq("thread_id", topic.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("v_post_comments")
        .select("*")
        .eq("thread_id", topic.id)
        .order("created_at", { ascending: true })
    ]);

  if (threadPostsError) {
    throw threadPostsError;
  }

  if (commentsError) {
    throw commentsError;
  }

  const threadPostIds = (threadPosts ?? []).map((post) => post.id);
  const metadataById = new Map<string, Record<string, unknown> | null>();

  if (threadPostIds.length > 0) {
    const { data: rawPosts, error: rawPostsError } = await supabase
      .from("thread_post")
      .select("id, metadata")
      .in("id", threadPostIds);

    if (rawPostsError) {
      const code = String((rawPostsError as { code?: string }).code ?? "");
      const message = String((rawPostsError as { message?: string }).message ?? "").toLowerCase();
      const isOptionalMetadataFailure =
        code === "42501" ||
        code === "42p01" ||
        message.includes("permission") ||
        message.includes("not found");

      if (!isOptionalMetadataFailure) {
        throw rawPostsError;
      }
    } else {
      for (const row of rawPosts ?? []) {
        metadataById.set(String(row.id), (row.metadata as Record<string, unknown> | null) ?? null);
      }
    }
  }

  const threadPostsWithMetadata = ((threadPosts ?? []).map((post) => ({
    ...post,
    metadata: metadataById.get(String(post.id)) ?? null
  })) as ThreadDetailScreenData["threadPosts"]);
  const commentsList = comments ?? [];

  if (resolvedCurrentUserId) {
    const commentIds = commentsList.map((comment) => comment.id);
    const [threadPostReactions, commentReactions] = await Promise.all([
      threadPostIds.length
        ? supabase
            .from("reaction")
            .select("target_id, reaction_type")
            .eq("target_type", "thread_post")
            .eq("user_id", resolvedCurrentUserId)
            .in("target_id", threadPostIds)
        : Promise.resolve({ data: [], error: null }),
      commentIds.length
        ? supabase
            .from("reaction")
            .select("target_id, reaction_type")
            .eq("target_type", "comment")
            .eq("user_id", resolvedCurrentUserId)
            .in("target_id", commentIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (threadPostReactions.error) {
      throw threadPostReactions.error;
    }

    if (commentReactions.error) {
      throw commentReactions.error;
    }

    const threadReactionById = new Map<string, "gauche" | "droite">(
      (threadPostReactions.data ?? []).map((row) => [
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
      thread: toThreadRow(
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
      threadPosts: threadPostsWithMetadata.map((post) => ({
        ...post,
        user_reaction_side: threadReactionById.get(post.id) ?? null
      })),
      comments: commentsList.map((comment) => ({
        ...comment,
        user_reaction_side: commentReactionById.get(comment.id) ?? null
      }))
    };
  }

  return {
    thread: toThreadRow(
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
    threadPosts: threadPostsWithMetadata,
    comments: commentsList
  };
}
