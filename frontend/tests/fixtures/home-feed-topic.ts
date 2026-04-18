import type { HomeFeedTopicView } from "@/lib/types/views";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[K]>
    : T[K];
};

export function buildHomeFeedTopic(
  overrides: DeepPartial<HomeFeedTopicView> = {}
): HomeFeedTopicView {
  const base: HomeFeedTopicView = {
    topic_id: "topic-1",
    topic_slug: "budget-ecole-priorite-terrain",
    topic_title: "Le budget local doit prioriser l'ecole publique",
    topic_description: "Des habitants defendent une hausse des moyens dans les classes surcharges.",
    topic_status: "open",
    derived_lifecycle_state: "open",
    visibility: "public",
    is_sensitive: false,
    space_id: null,
    space_slug: null,
    space_name: null,
    primary_taxonomy_slug: "lfi",
    primary_taxonomy_label: "Gauche radicale a gauche",
    discussion_payload: {
      excerpt_type: "thread",
      excerpt_title: "Le budget local doit prioriser l'ecole publique",
      excerpt_text: "Plusieurs parents demandent des engagements budgetaires immediats.",
      excerpt_created_at: "2026-04-01T07:35:00Z"
    },
    resolution_payload: {
      resolution_status: null,
      resolved_label: null,
      resolved_at: null,
      resolution_note: null,
      source_label: null,
      source_url: null
    },
    last_activity_at: "2026-04-01T07:35:00Z",
    open_at: "2026-03-22T08:00:00Z",
    close_at: "2026-04-21T18:00:00Z",
    resolve_deadline_at: null,
    resolved_at: null,
    visible_post_count: 4,
    activity_score_raw: 0.8,
    freshness_score_raw: 0.95,
    participation_score_raw: 0.7,
    resolution_proximity_score_raw: 0,
    editorial_priority_score_raw: 0,
    shift_score_raw: 0,
    editorial_feed_score: 0.61,
    feed_reason_code: "high_activity",
    feed_reason_label: "Remonte car l'activite se concentre ici",
    editorial_feed_rank: 1,
    topic_card_payload: {
      topic_id: "topic-1",
      topic_slug: "budget-ecole-priorite-terrain",
      topic_title: "Le budget local doit prioriser l'ecole publique",
      topic_description: "Des habitants defendent une hausse des moyens dans les classes surcharges.",
      derived_lifecycle_state: "open",
      topic_status: "open",
      visibility: "public",
      is_sensitive: false,
      space_id: null,
      space_slug: null,
      space_name: null,
      primary_taxonomy_slug: "lfi",
      primary_taxonomy_label: "Gauche radicale a gauche",
      discussion_payload: {
        excerpt_type: "thread",
        excerpt_title: "Le budget local doit prioriser l'ecole publique",
        excerpt_text: "Plusieurs parents demandent des engagements budgetaires immediats.",
        excerpt_created_at: "2026-04-01T07:35:00Z"
      },
      resolution_payload: {
        resolution_status: null,
        resolved_label: null,
        resolved_at: null,
        resolution_note: null,
        source_label: null,
        source_url: null
      },
      feed_reason_code: "high_activity",
      feed_reason_label: "Remonte car l'activite se concentre ici",
      editorial_feed_score: 0.61
    }
  };

  return {
    ...base,
    ...overrides,
    discussion_payload: {
      ...base.discussion_payload,
      ...(overrides.discussion_payload ?? {})
    },
    resolution_payload: {
      ...base.resolution_payload,
      ...(overrides.resolution_payload ?? {})
    },
    topic_card_payload: {
      ...base.topic_card_payload,
      ...(overrides.topic_card_payload ?? {}),
      discussion_payload: {
        ...base.topic_card_payload.discussion_payload,
        ...(overrides.topic_card_payload?.discussion_payload ?? {})
      },
      resolution_payload: {
        ...base.topic_card_payload.resolution_payload,
        ...(overrides.topic_card_payload?.resolution_payload ?? {})
      }
    }
  };
}
