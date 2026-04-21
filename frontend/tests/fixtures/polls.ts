import type { PostPollSummaryView } from "@/lib/types/views";

const basePoll: PostPollSummaryView = {
  post_item_id: "post-item-budget-2026",
  post_id: "post-budget-2026",
  post_slug: "budget-2026-priorites",
  post_title: "Budget 2026: quelles priorites de depense publique?",
  question: "Quelle priorite budgetaire doit passer en premier en 2026 ?",
  deadline_at: "2026-04-20T12:00:00.000Z",
  poll_status: "open",
  sample_size: 42,
  effective_sample_size: 31.4,
  representativity_score: 52.1,
  coverage_score: 61.2,
  distance_score: 47.3,
  stability_score: 38.8,
  anti_brigading_score: 63,
  raw_results: [
    { option_id: "o1", option_label: "Sante", sort_order: 0, response_count: 15, share: 35.7 },
    { option_id: "o2", option_label: "Securite", sort_order: 1, response_count: 12, share: 28.6 },
    { option_id: "o3", option_label: "Education", sort_order: 2, response_count: 10, share: 23.8 },
    { option_id: "o4", option_label: "Reduction deficit", sort_order: 3, response_count: 5, share: 11.9 }
  ],
  corrected_results: [
    { option_id: "o1", option_label: "Sante", sort_order: 0, weighted_count: 12.8, share: 30.4 },
    { option_id: "o2", option_label: "Securite", sort_order: 1, weighted_count: 11.6, share: 27.5 },
    { option_id: "o3", option_label: "Education", sort_order: 2, weighted_count: 10.5, share: 24.8 },
    { option_id: "o4", option_label: "Reduction deficit", sort_order: 3, weighted_count: 7.3, share: 17.3 }
  ],
  options: [
    { option_id: "o1", label: "Sante", sort_order: 0 },
    { option_id: "o2", label: "Securite", sort_order: 1 },
    { option_id: "o3", label: "Education", sort_order: 2 },
    { option_id: "o4", label: "Reduction deficit", sort_order: 3 }
  ],
  selected_option_id: null
};

export function buildPollSummary(
  override: Partial<PostPollSummaryView> = {}
): PostPollSummaryView {
  return {
    ...basePoll,
    ...override,
    raw_results: override.raw_results ?? basePoll.raw_results,
    corrected_results: override.corrected_results ?? basePoll.corrected_results,
    options: override.options ?? basePoll.options
  };
}

