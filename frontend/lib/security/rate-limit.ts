import { createServerSupabaseClient } from "@/lib/supabase/server";

// Post rate limit : déplacé dans la RPC rpc_create_post_full (check côté DB,
// errcode P0001, message "Daily post limit reached"). L'app ne le duplique plus.
const COMMENTS_PER_DAY_LIMIT = 40;

function dayStartIso() {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
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
  comment: `Limite journalière atteinte (${COMMENTS_PER_DAY_LIMIT} commentaires).`
} as const;
