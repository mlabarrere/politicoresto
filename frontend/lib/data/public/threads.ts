import type { ThreadDetailScreenData } from "@/lib/types/screens";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toThreadRow } from "./canonical";

export async function getThreadDetail(slug: string): Promise<ThreadDetailScreenData | null> {
  const supabase = await createServerSupabaseClient();

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
      throw rawPostsError;
    }

    for (const row of rawPosts ?? []) {
      metadataById.set(String(row.id), (row.metadata as Record<string, unknown> | null) ?? null);
    }
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
    threadPosts: ((threadPosts ?? []).map((post) => ({
      ...post,
      metadata: metadataById.get(String(post.id)) ?? null
    })) as ThreadDetailScreenData["threadPosts"]),
    comments: comments ?? []
  };
}
