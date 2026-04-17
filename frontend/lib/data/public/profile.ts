import { createServerSupabaseClient } from "@/lib/supabase/server";

type PublicProfilePost = {
  id: string;
  thread_id: string;
  thread_slug: string;
  title: string | null;
  content: string | null;
  created_at: string;
};

type PublicProfileComment = {
  id: string;
  thread_id: string;
  thread_slug: string;
  body_markdown: string;
  created_at: string;
};

export async function getPublicProfile(username: string) {
  const supabase = await createServerSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("app_profile")
    .select("user_id, username, display_name, bio, created_at")
    .eq("username", username)
    .eq("profile_status", "active")
    .eq("is_public_profile_enabled", true)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) return null;

  const userId = String(profile.user_id);
  const [postsResult, commentsResult] = await Promise.all([
    supabase
      .from("v_thread_posts")
      .select("id, thread_id, title, content, created_at")
      .eq("created_by", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("v_post_comments")
      .select("id, thread_id, body_markdown, created_at")
      .eq("author_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  if (postsResult.error) throw postsResult.error;
  if (commentsResult.error) throw commentsResult.error;

  const threadIds = Array.from(
    new Set([
      ...(postsResult.data ?? []).map((row) => String(row.thread_id ?? "")),
      ...(commentsResult.data ?? []).map((row) => String(row.thread_id ?? ""))
    ].filter((value) => value.length > 0))
  );

  const topicSlugById = new Map<string, string>();
  if (threadIds.length > 0) {
    const { data: topics, error: topicsError } = await supabase
      .from("topic")
      .select("id, slug")
      .in("id", threadIds);
    if (topicsError) throw topicsError;
    for (const topic of topics ?? []) {
      topicSlugById.set(String(topic.id), String(topic.slug ?? ""));
    }
  }

  const posts: PublicProfilePost[] = (postsResult.data ?? []).map((row) => ({
    id: String(row.id),
    thread_id: String(row.thread_id),
    thread_slug: topicSlugById.get(String(row.thread_id)) ?? "",
    title: (row.title as string | null) ?? null,
    content: (row.content as string | null) ?? null,
    created_at: String(row.created_at)
  }));

  const comments: PublicProfileComment[] = (commentsResult.data ?? []).map((row) => ({
    id: String(row.id),
    thread_id: String(row.thread_id),
    thread_slug: topicSlugById.get(String(row.thread_id)) ?? "",
    body_markdown: String((row.body_markdown as string | null) ?? ""),
    created_at: String(row.created_at)
  }));

  return {
    profile: {
      user_id: userId,
      username: String(profile.username ?? username),
      display_name: (profile.display_name as string | null) ?? null,
      bio: (profile.bio as string | null) ?? null
    },
    posts,
    comments
  };
}
