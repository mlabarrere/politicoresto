import { createServerSupabaseClient } from "@/lib/supabase/server";

const POSTS_PER_DAY_LIMIT = 8;
const COMMENTS_PER_DAY_LIMIT = 40;

function dayStartIso() {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function canCreatePostToday(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
) {
  const { count, error } = await supabase
    .from("thread_post")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte("created_at", dayStartIso());

  if (error) {
    return { allowed: false, reason: "rate_limit_check_failed" as const };
  }

  return { allowed: Number(count ?? 0) < POSTS_PER_DAY_LIMIT, reason: "ok" as const };
}

export async function canCreateCommentToday(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
) {
  const { count, error } = await supabase
    .from("post")
    .select("id", { count: "exact", head: true })
    .eq("author_user_id", userId)
    .not("thread_post_id", "is", null)
    .gte("created_at", dayStartIso());

  if (error) {
    return { allowed: false, reason: "rate_limit_check_failed" as const };
  }

  return { allowed: Number(count ?? 0) < COMMENTS_PER_DAY_LIMIT, reason: "ok" as const };
}

export const RATE_LIMIT_MESSAGES = {
  post: `Limite journalière atteinte (${POSTS_PER_DAY_LIMIT} posts).`,
  comment: `Limite journalière atteinte (${COMMENTS_PER_DAY_LIMIT} commentaires).`
} as const;
