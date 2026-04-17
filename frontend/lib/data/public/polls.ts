import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PostPollSummaryView } from "@/lib/types/views";
import { normalizePostPollSummary } from "@/lib/polls/summary";

export async function getPollSummariesByPostItemIds(
  postItemIds: string[]
): Promise<Map<string, PostPollSummaryView>> {
  if (!postItemIds.length) {
    return new Map();
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("v_post_poll_summary")
    .select("*")
    .in("post_item_id", postItemIds);

  if (error) throw error;

  const map = new Map<string, PostPollSummaryView>();
  for (const row of data ?? []) {
    const normalized = normalizePostPollSummary(row as Record<string, unknown>);
    if (normalized) {
      map.set(normalized.post_item_id, normalized);
    }
  }
  return map;
}
