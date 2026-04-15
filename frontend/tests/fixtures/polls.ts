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

export const believablePollScenarios = {
  budget2026: buildPollSummary(),
  immigrationRetention: buildPollSummary({
    post_item_id: "post-item-immigration",
    post_slug: "immigration-retention-administrative",
    post_title: "Retention administrative: faut-il allonger la duree maximale?",
    question: "Faut-il allonger la retention administrative en cas de menace grave ?",
    representativity_score: 44.3,
    sample_size: 27,
    effective_sample_size: 18.1
  }),
  pensionsSuspension: buildPollSummary({
    post_item_id: "post-item-pensions",
    post_slug: "suspension-reforme-retraites",
    post_title: "Faut-il suspendre la reforme des retraites ?",
    question: "Soutenez-vous une suspension immediate de la reforme des retraites ?",
    representativity_score: 33.2,
    sample_size: 16,
    effective_sample_size: 9.9
  }),
  educationCuts: buildPollSummary({
    post_item_id: "post-item-education",
    post_slug: "education-suppressions-postes-enseignants",
    post_title: "Suppressions de postes enseignants: acceptable en 2026?",
    question: "Les suppressions de postes enseignants sont-elles acceptables en 2026 ?",
    representativity_score: 58.6,
    sample_size: 73,
    effective_sample_size: 55.7
  }),
  rnCredibility: buildPollSummary({
    post_item_id: "post-item-rn-economie",
    post_slug: "rn-credibilite-economique-2027",
    post_title: "Le RN est-il credible economiquement avant 2027 ?",
    question: "Le RN est-il credible sur le budget et la dette avant 2027 ?",
    representativity_score: 69.4,
    sample_size: 181,
    effective_sample_size: 142.2
  })
};
