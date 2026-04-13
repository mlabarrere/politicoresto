import type {
  HomeFeedTopicView,
  PredictionQuestionRow,
  PostRow,
  SpaceRow,
  TopicCardPayload,
  TopicPredictionAggregateView,
  TopicRow,
  TopicSummaryView
} from "@/lib/types/views";

type EditorialSubthemeRow = {
  slug: string;
  name: string;
  themes: {
    slug: string;
    name: string;
  } | null;
};

type EditorialPredictionRow = {
  id: number;
  question: string;
  prediction_type: string;
  resolution_criteria: string;
  resolution_source_url: string;
  closes_at: string;
};

type EditorialPromptRow = {
  id: number;
  prompt: string;
  prompt_type: string;
  tone: string;
};

type EditorialTopicRow = {
  id: number;
  subtheme_id: number;
  slug: string;
  title: string;
  summary: string;
  topic_type: string;
  geographic_scope: string;
  territory_name: string | null;
  country_code: string | null;
  region_name: string | null;
  city_name: string | null;
  status: string;
  salience_score: number;
  concreteness_score: number;
  controversy_score: number;
  editorial_priority: number;
  starts_at: string | null;
  ends_at: string | null;
  is_time_sensitive: boolean;
  is_prediction_enabled: boolean;
  source_confidence: number;
  created_at: string;
  subthemes: EditorialSubthemeRow | null;
  prediction_questions_editorial?: EditorialPredictionRow[] | null;
  discussion_prompts?: EditorialPromptRow[] | null;
};

type EditorialThemeRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  priority_rank: number;
  is_active: boolean;
  created_at: string;
};

const editorialSelect = `
  id,
  subtheme_id,
  slug,
  title,
  summary,
  topic_type,
  geographic_scope,
  territory_name,
  country_code,
  region_name,
  city_name,
  status,
  salience_score,
  concreteness_score,
  controversy_score,
  editorial_priority,
  starts_at,
  ends_at,
  is_time_sensitive,
  is_prediction_enabled,
  source_confidence,
  created_at,
  subthemes (
    slug,
    name,
    themes (
      slug,
      name
    )
  ),
  prediction_questions_editorial (
    id,
    question,
    prediction_type,
    resolution_criteria,
    resolution_source_url,
    closes_at
  ),
  discussion_prompts (
    id,
    prompt,
    prompt_type,
    tone
  )
`;

export function getEditorialTopicSelect() {
  return editorialSelect;
}

function toLifecycle(status: string) {
  if (status === "expected") return "pending_resolution";
  if (status === "archived") return "archived";
  return "open";
}

function toFeedReason(topic: EditorialTopicRow) {
  if (topic.is_prediction_enabled) {
    return {
      code: "pending_resolution",
      label: "Remonte car une question de prediction est ouverte et resolvable"
    };
  }

  if (topic.geographic_scope !== "national") {
    return {
      code: "territory_relevant",
      label: `Remonte car le sujet est ancre ${topic.territory_name ? `a ${topic.territory_name}` : "dans un territoire"}`
    };
  }

  return {
    code: "high_activity",
    label: "Remonte car le sujet est prioritaire dans le debat public"
  };
}

function toTimeLabel(topic: EditorialTopicRow) {
  if (!topic.ends_at) return "Suivi en continu";

  return `Suivi jusqu'au ${new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(topic.ends_at))}`;
}

function toQuestion(topic: EditorialTopicRow) {
  return topic.prediction_questions_editorial?.[0]?.question ?? `Faut-il prioriser ce sujet: ${topic.title} ?`;
}

function toCardPayload(topic: EditorialTopicRow): TopicCardPayload {
  const theme = topic.subthemes?.themes;
  const feedReason = toFeedReason(topic);
  const prompt = topic.discussion_prompts?.[0] ?? null;

  return {
    topic_id: String(topic.id),
    topic_slug: topic.slug,
    topic_title: topic.title,
    topic_description: topic.summary,
    derived_lifecycle_state: toLifecycle(topic.status),
    topic_status: topic.status,
    visibility: "public",
    is_sensitive: false,
    space_id: theme?.slug ?? null,
    space_slug: theme?.slug ?? null,
    space_name: theme?.name ?? null,
    primary_taxonomy_slug: topic.subthemes?.slug ?? null,
    primary_taxonomy_label: topic.subthemes?.name ?? null,
    primary_territory_id: topic.territory_name ?? null,
    primary_territory_slug: topic.territory_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? null,
    primary_territory_name: topic.territory_name,
    primary_territory_level: topic.geographic_scope,
    prediction_type: topic.is_prediction_enabled ? "prediction_market" : null,
    prediction_question_title: toQuestion(topic),
    aggregate_payload: {
      primary_value: topic.editorial_priority,
      primary_label: "Priorite editoriale",
      secondary_value: topic.source_confidence,
      secondary_label: "Confiance source",
      unit_label: null,
      submission_count: topic.is_prediction_enabled ? 1 : 0,
      distribution_hint: null
    },
    metrics_payload: {
      active_prediction_count: topic.is_prediction_enabled ? 1 : 0,
      visible_post_count: topic.discussion_prompts?.length ?? 0,
      time_label: toTimeLabel(topic)
    },
    discussion_payload: {
      excerpt_type: prompt?.prompt_type ?? "discussion",
      excerpt_title: prompt ? "Question de discussion" : null,
      excerpt_text: prompt?.prompt ?? null,
      excerpt_created_at: topic.created_at
    },
    card_payload: null,
    resolution_payload: {
      resolution_status: null,
      resolved_label: null,
      resolved_at: null,
      resolution_note: topic.prediction_questions_editorial?.[0]?.resolution_criteria ?? null,
      source_label: null,
      source_url: topic.prediction_questions_editorial?.[0]?.resolution_source_url ?? null
    },
    feed_reason_code: feedReason.code,
    feed_reason_label: feedReason.label,
    editorial_feed_score: topic.editorial_priority
  };
}

export function toHomeFeedTopic(topic: EditorialTopicRow, rank: number): HomeFeedTopicView {
  const payload = toCardPayload(topic);

  return {
    ...payload,
    aggregate_payload: payload.aggregate_payload,
    metrics_payload: payload.metrics_payload,
    discussion_payload: payload.discussion_payload,
    card_payload: null,
    resolution_payload: payload.resolution_payload,
    last_activity_at: topic.created_at,
    open_at: topic.starts_at,
    close_at: topic.ends_at,
    resolve_deadline_at: topic.ends_at,
    resolved_at: null,
    visible_post_count: topic.discussion_prompts?.length ?? 0,
    active_prediction_count: topic.is_prediction_enabled ? 1 : 0,
    activity_score_raw: topic.salience_score,
    freshness_score_raw: topic.concreteness_score,
    participation_score_raw: topic.is_prediction_enabled ? 1 : 0,
    territorial_relevance_score_raw: topic.geographic_scope === "national" ? 0 : 1,
    resolution_proximity_score_raw: topic.is_time_sensitive ? 1 : 0,
    editorial_priority_score_raw: topic.editorial_priority,
    shift_score_raw: topic.controversy_score,
    editorial_feed_rank: rank,
    topic_card_payload: payload
  };
}

export function toTopicSummary(topic: EditorialTopicRow): TopicSummaryView {
  return {
    id: String(topic.id),
    space_id: topic.subthemes?.themes?.slug ?? null,
    slug: topic.slug,
    title: topic.title,
    description: topic.summary,
    topic_status: topic.status,
    effective_visibility: "public",
    primary_territory_id: topic.territory_name,
    open_at: topic.starts_at ?? topic.created_at,
    close_at: topic.ends_at ?? topic.created_at,
    created_at: topic.created_at,
    visible_post_count: topic.discussion_prompts?.length ?? 0,
    active_prediction_count: topic.is_prediction_enabled ? 1 : 0
  };
}

export function toTopicAggregate(topic: EditorialTopicRow): TopicPredictionAggregateView | null {
  if (!topic.is_prediction_enabled) return null;

  return {
    topic_id: String(topic.id),
    prediction_type: "prediction_market",
    submission_count: 0,
    numeric_average: null,
    numeric_median: null,
    binary_yes_ratio: null
  };
}

export function toTopicRow(topic: EditorialTopicRow): TopicRow {
  return {
    id: String(topic.id),
    space_id: topic.subthemes?.themes?.slug ?? null,
    slug: topic.slug,
    title: topic.title,
    description: topic.summary,
    topic_status: topic.status,
    visibility: "public",
    open_at: topic.starts_at ?? topic.created_at,
    close_at: topic.ends_at ?? topic.created_at,
    created_at: topic.created_at
  };
}

export function toPredictionQuestion(topic: EditorialTopicRow): PredictionQuestionRow | null {
  const question = topic.prediction_questions_editorial?.[0];
  if (!question) return null;

  return {
    topic_id: String(topic.id),
    prediction_type: question.prediction_type,
    title: question.question,
    unit_label: null,
    allow_submission_update: false
  };
}

export function toPosts(topic: EditorialTopicRow): PostRow[] {
  return (topic.discussion_prompts ?? []).map((prompt) => ({
    id: `editorial-prompt-${prompt.id}`,
    topic_id: String(topic.id),
    space_id: topic.subthemes?.themes?.slug ?? null,
    post_type: prompt.prompt_type,
    post_status: "visible",
    title: "Question de discussion",
    body_markdown: prompt.prompt,
    created_at: topic.created_at
  }));
}

export function toSpace(theme: EditorialThemeRow): SpaceRow {
  return {
    id: String(theme.id),
    slug: theme.slug,
    name: theme.name,
    description: theme.description,
    space_type: "theme",
    space_status: theme.is_active ? "active" : "archived",
    visibility: "public",
    created_at: theme.created_at
  };
}

export type { EditorialThemeRow, EditorialTopicRow };
