import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PostPollSummaryView } from "@/lib/types/views";
import { normalizePostPollSummary } from "@/lib/polls/summary";

export async function getPollSummariesByPostItemIds(
  postItemIds: string[],
  options?: {
    supabase?: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  }
): Promise<Map<string, PostPollSummaryView>> {
  if (!postItemIds.length) {
    return new Map();
  }

  const supabase = options?.supabase ?? (await createServerSupabaseClient());
  const { data, error } = await supabase
    .from("v_post_poll_summary")
    .select(
      "post_item_id, post_id, post_slug, post_title, question, deadline_at, poll_status, sample_size, effective_sample_size, representativity_score, coverage_score, distance_score, stability_score, anti_brigading_score, raw_results, corrected_results, options, selected_option_id, confidence_score, confidence_band, confidence_components, corrected_ci95, computed_with_ref_as_of"
    )
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
