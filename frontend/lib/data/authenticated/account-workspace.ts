import { createServerSupabaseClient } from "@/lib/supabase/server";

type AppProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  profile_status: string;
  is_public_profile_enabled: boolean;
  created_at: string;
};

type VisibilityRow = {
  display_name_visibility: string;
  bio_visibility: string;
  vote_history_visibility: string;
};

type PrivateProfileRow = {
  political_interest_level: number | null;
  notes_private: string | null;
  profile_payload: Record<string, unknown> | null;
};

type VoteHistoryRow = {
  id: string;
  vote_round: number | null;
  declared_option_label: string | null;
  declared_candidate_name: string | null;
  declared_at: string | null;
  created_at: string;
};

type DraftRow = {
  id: string;
  thread_id: string;
  type: string;
  title: string | null;
  status: string;
  updated_at: string;
};

type PostHistoryRow = {
  id: string;
  post_id: string;
  type: string;
  title: string | null;
  status: string;
  entity_slug: string | null;
  entity_name: string | null;
  created_at: string;
};

type CommentHistoryRow = {
  id: string;
  thread_post_id: string | null;
  body_markdown: string;
  title: string | null;
  post_status: string;
  created_at: string;
};

export type AccountWorkspaceData = {
  userId: string;
  email: string;
  profile: AppProfileRow | null;
  visibility: VisibilityRow | null;
  privateProfile: PrivateProfileRow | null;
  voteHistory: VoteHistoryRow[];
  drafts: DraftRow[];
  publications: PostHistoryRow[];
  comments: Array<CommentHistoryRow & { parentTitle: string | null }>;
  errors: string[];
};

export async function getAccountWorkspaceData(): Promise<AccountWorkspaceData> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message ?? "Authentication required");
  }

  const errors: string[] = [];

  const [profileResult, visibilityResult, privateProfileResult, voteResult, draftResult, postResult, commentResult] =
    await Promise.all([
      supabase
        .from("app_profile")
        .select("user_id, username, display_name, bio, avatar_url, profile_status, is_public_profile_enabled, created_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_visibility_settings")
        .select("display_name_visibility, bio_visibility, vote_history_visibility")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.rpc("rpc_get_private_political_profile"),
      supabase.rpc("rpc_list_private_vote_history"),
      supabase
        .from("thread_post")
        .select("id, thread_id, type, title, status, updated_at")
        .eq("created_by", user.id)
        .eq("status", "draft")
        .order("updated_at", { ascending: false }),
      supabase
        .from("v_posts")
        .select("id, post_id, type, title, status, entity_slug, entity_name, created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("v_post_comments")
        .select("id, thread_post_id, body_markdown, title, post_status, created_at")
        .eq("author_user_id", user.id)
        .order("created_at", { ascending: false })
    ]);

  if (profileResult.error) errors.push(`Profil: ${profileResult.error.message}`);
  if (visibilityResult.error) errors.push(`Visibilite: ${visibilityResult.error.message}`);
  if (privateProfileResult.error) errors.push(`Profil prive: ${privateProfileResult.error.message}`);
  if (voteResult.error) errors.push(`Votes prives: ${voteResult.error.message}`);
  if (draftResult.error) errors.push(`Brouillons: ${draftResult.error.message}`);
  if (postResult.error) errors.push(`Publications: ${postResult.error.message}`);
  if (commentResult.error) errors.push(`Commentaires: ${commentResult.error.message}`);

  const comments = (commentResult.data ?? []) as CommentHistoryRow[];
  const parentPostIds = Array.from(
    new Set(comments.map((comment) => comment.thread_post_id).filter((value): value is string => Boolean(value)))
  );

  const parentTitleById = new Map<string, string | null>();
  if (parentPostIds.length) {
    const parentResult = await supabase
      .from("v_posts")
      .select("id, title")
      .in("id", parentPostIds);

    if (parentResult.error) {
      errors.push(`Parents commentaires: ${parentResult.error.message}`);
    } else {
      for (const row of parentResult.data ?? []) {
        const typed = row as { id: string; title: string | null };
        parentTitleById.set(typed.id, typed.title);
      }
    }
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: (profileResult.data ?? null) as AppProfileRow | null,
    visibility: (visibilityResult.data ?? null) as VisibilityRow | null,
    privateProfile: (privateProfileResult.data ?? null) as PrivateProfileRow | null,
    voteHistory: (voteResult.data ?? []) as VoteHistoryRow[],
    drafts: (draftResult.data ?? []) as DraftRow[],
    publications: (postResult.data ?? []) as PostHistoryRow[],
    comments: comments.map((comment) => ({
      ...comment,
      parentTitle: comment.thread_post_id ? parentTitleById.get(comment.thread_post_id) ?? null : null
    })),
    errors
  };
}
