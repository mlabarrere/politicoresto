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

type SectionStatus = {
  state: "ready" | "unavailable" | "error";
  message: string | null;
};

type AccountSectionStatuses = {
  profile: SectionStatus;
  drafts: SectionStatus;
  posts: SectionStatus;
  comments: SectionStatus;
  security: SectionStatus;
};

type BackendError = {
  message?: string;
  code?: string;
};

export type AccountWorkspaceData = {
  userId: string;
  email: string;
  profile: AppProfileRow | null;
  visibility: VisibilityRow | null;
  privateProfile: PrivateProfileRow | null;
  drafts: DraftRow[];
  publications: PostHistoryRow[];
  comments: Array<CommentHistoryRow & { parentTitle: string | null }>;
  sectionStatus: AccountSectionStatuses;
};

function readyStatus(): SectionStatus {
  return { state: "ready", message: null };
}

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

function statusFromError(error: BackendError | null | undefined): SectionStatus {
  if (!error) return readyStatus();
  if (isCapabilityMissing(error)) {
    return {
      state: "unavailable",
      message: "Indisponible temporairement."
    };
  }

  return {
    state: "error",
    message: "Indisponible temporairement. Reessayez dans quelques instants."
  };
}

function mergeStatus(current: SectionStatus, next: SectionStatus): SectionStatus {
  const rank = { ready: 0, unavailable: 1, error: 2 } as const;
  return rank[next.state] > rank[current.state] ? next : current;
}

async function fetchPublicationRows(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
) {
  const thread = await supabase
    .from("v_thread_posts")
    .select("id, thread_id, type, title, status, created_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  return {
    rows:
      (thread.data ?? []).map((row) => {
        const typed = row as {
          id: string;
          thread_id: string;
          type: string;
          title: string | null;
          status: string;
          created_at: string;
        };
        return {
          id: typed.id,
          post_id: typed.thread_id,
          type: typed.type,
          title: typed.title,
          status: typed.status,
          entity_slug: null,
          entity_name: null,
          created_at: typed.created_at
        } satisfies PostHistoryRow;
      }) ?? [],
    error: thread.error
  };
}

export async function getAccountWorkspaceData(): Promise<AccountWorkspaceData> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message ?? "Authentication required");
  }

  const sectionStatus: AccountSectionStatuses = {
    profile: readyStatus(),
    drafts: readyStatus(),
    posts: readyStatus(),
    comments: readyStatus(),
    security: readyStatus()
  };

  const [profileResult, visibilityResult, privateProfileResult, draftResult, postResult, commentResult] =
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
      supabase
        .from("thread_post")
        .select("id, thread_id, type, title, status, updated_at")
        .eq("created_by", user.id)
        .eq("status", "draft")
        .order("updated_at", { ascending: false }),
      fetchPublicationRows(supabase, user.id),
      supabase
        .from("v_post_comments")
        .select("id, thread_post_id, body_markdown, title, post_status, created_at")
        .eq("author_user_id", user.id)
        .order("created_at", { ascending: false })
    ]);

  sectionStatus.profile = mergeStatus(sectionStatus.profile, statusFromError(profileResult.error));
  sectionStatus.profile = mergeStatus(sectionStatus.profile, statusFromError(privateProfileResult.error));
  sectionStatus.profile = mergeStatus(sectionStatus.profile, statusFromError(visibilityResult.error));
  sectionStatus.drafts = mergeStatus(sectionStatus.drafts, statusFromError(draftResult.error));
  sectionStatus.posts = mergeStatus(sectionStatus.posts, statusFromError(postResult.error));
  sectionStatus.comments = mergeStatus(sectionStatus.comments, statusFromError(commentResult.error));

  const comments = (commentResult.data ?? []) as CommentHistoryRow[];
  const parentPostIds = Array.from(
    new Set(comments.map((comment) => comment.thread_post_id).filter((value): value is string => Boolean(value)))
  );

  const parentTitleById = new Map<string, string | null>();
  if (parentPostIds.length && sectionStatus.posts.state === "ready") {
    const parentResult = await supabase
      .from("v_thread_posts")
      .select("id, title")
      .in("id", parentPostIds);

    if (!parentResult.error) {
      for (const row of parentResult.data ?? []) {
        const typed = row as { id: string; title: string | null };
        parentTitleById.set(typed.id, typed.title);
      }
    }
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: profileResult.error ? null : ((profileResult.data ?? null) as AppProfileRow | null),
    visibility: visibilityResult.error ? null : ((visibilityResult.data ?? null) as VisibilityRow | null),
    privateProfile: privateProfileResult.error ? null : ((privateProfileResult.data ?? null) as PrivateProfileRow | null),
    drafts: draftResult.error ? [] : ((draftResult.data ?? []) as DraftRow[]),
    publications: postResult.error ? [] : ((postResult.rows ?? []) as PostHistoryRow[]),
    comments: comments.map((comment) => ({
      ...comment,
      parentTitle: comment.thread_post_id ? parentTitleById.get(comment.thread_post_id) ?? null : null
    })),
    sectionStatus
  };
}
