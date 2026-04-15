import type { PostDetailScreenData } from "@/lib/types/screens";
import { REACTION_TYPE_TO_SIDE } from "@/lib/reactions";
import { getCurrentUser } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toThreadRow } from "./canonical";

export async function getPostDetail(
  slug: string,
  currentUserId?: string | null
): Promise<PostDetailScreenData | null> {
  const supabase = await createServerSupabaseClient();
  const resolvedCurrentUserId =
    currentUserId !== undefined ? currentUserId : (await getCurrentUser(supabase))?.id ?? null;

  const { data: topic, error } = await supabase
    .from("v_post_detail")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!topic) return null;

  const [{ data: posts, error: postsError }, { data: comments, error: commentsError }] =
    await Promise.all([
      supabase
        .from("v_posts")
        .select("id, post_id, type, title, content, created_by, username, display_name, created_at, updated_at, status, gauche_count, droite_count, weighted_votes, comment_count")
        .eq("post_id", topic.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("v_post_comments")
        .select("*")
        .eq("post_id", topic.id)
        .order("created_at", { ascending: true })
    ]);

  if (postsError) throw postsError;
  if (commentsError) throw commentsError;

  const postIds = (posts ?? []).map((post) => post.id);
  const metadataById = new Map<string, Record<string, unknown> | null>();

  if (postIds.length > 0) {
    const { data: rawPosts, error: rawPostsError } = await supabase
      .from("post")
      .select("id, metadata")
      .in("id", postIds);

    if (rawPostsError) {
      const code = String((rawPostsError as { code?: string }).code ?? "");
      const message = String((rawPostsError as { message?: string }).message ?? "").toLowerCase();
      const isOptionalMetadataFailure =
        code === "42501" ||
        code === "42p01" ||
        message.includes("permission") ||
        message.includes("not found");

      if (!isOptionalMetadataFailure) throw rawPostsError;
    } else {
      for (const row of rawPosts ?? []) {
        metadataById.set(String(row.id), (row.metadata as Record<string, unknown> | null) ?? null);
      }
    }
  }

  const postsWithMetadata = (posts ?? []).map((post) => ({
    ...post,
    post_id: String((post as { post_id?: string | null }).post_id ?? (post as { thread_id?: string | null }).thread_id ?? ""),
    metadata: metadataById.get(String(post.id)) ?? null
  })) as PostDetailScreenData["posts"];

  const commentsList = (comments ?? []).map((comment) => ({
    ...comment,
    post_id: String((comment as { post_id?: string | null }).post_id ?? (comment as { thread_id?: string | null }).thread_id ?? ""),
    post_item_id: ((comment as { post_item_id?: string | null }).post_item_id ?? (comment as { thread_post_id?: string | null }).thread_post_id ?? null)
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
  const [postReactions, commentReactions] = await Promise.all([
    postIds.length
      ? supabase
          .from("reaction")
          .select("target_id, reaction_type")
          .eq("target_type", "post")
          .eq("user_id", resolvedCurrentUserId)
          .in("target_id", postIds)
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
