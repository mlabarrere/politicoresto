import type {
  HomeFeedTopicView,
  PostRow,
  PredictionQuestionRow,
  SpaceRow,
  ThreadPredictionAggregateView,
  ThreadRow,
  ThreadSummaryView,
  TopicAggregatePayload,
  TopicCardPayload,
  TopicDiscussionPayload,
  TopicMetricsPayload,
  TopicPredictionAggregateView,
  TopicResolutionPayload,
  TopicRow,
  TopicSummaryView
} from "@/lib/types/views";

type JsonRecord = Record<string, unknown>;

type FeedRow = JsonRecord &
  Partial<HomeFeedTopicView> & {
    latest_thread_post_at?: string | null;
    thread_score?: number | null;
    entity_id?: string | null;
    entity_slug?: string | null;
    entity_name?: string | null;
    space_role?: string | null;
    thread_post_count?: number | null;
    topic_card_payload?: JsonRecord | null;
  };

type ThreadDetailRow = JsonRecord & {
  id: string;
  space_id?: string | null;
  slug: string;
  title: string;
  description?: string | null;
  topic_status: string;
  effective_visibility: string;
  primary_territory_id?: string | null;
  open_at: string;
  close_at: string;
  created_at: string;
  entity_id?: string | null;
  entity_slug?: string | null;
  entity_name?: string | null;
  space_slug?: string | null;
  space_name?: string | null;
  space_role?: string | null;
  visible_post_count?: number | null;
  active_prediction_count?: number | null;
  submission_count?: number | null;
  prediction_type?: string | null;
  thread_post_count?: number | null;
  article_post_count?: number | null;
  poll_post_count?: number | null;
  market_post_count?: number | null;
  latest_thread_post_at?: string | null;
  thread_score?: number | null;
  feed_reason_code?: string | null;
  feed_reason_label?: string | null;
};

type ThreadPostRow = JsonRecord & {
  id: string;
  thread_id: string;
  type: string;
  title?: string | null;
  content?: string | null;
  created_at: string;
};

type LegacyPostRow = JsonRecord & {
  id: string;
  topic_id: string | null;
  space_id: string | null;
  post_type: string;
  post_status: string;
  title?: string | null;
  body_markdown: string;
  created_at: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string | null = null) {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asAggregatePayload(value: unknown): TopicAggregatePayload {
  const payload = isRecord(value) ? value : {};
  const primaryValue =
    typeof payload.primary_value === "string" || typeof payload.primary_value === "number"
      ? payload.primary_value
      : null;
  const secondaryValue =
    typeof payload.secondary_value === "string" || typeof payload.secondary_value === "number"
      ? payload.secondary_value
      : null;

  return {
    primary_value: primaryValue,
    primary_label: asString(payload.primary_label),
    secondary_value: secondaryValue,
    secondary_label: asString(payload.secondary_label),
    unit_label: asString(payload.unit_label),
    submission_count: asNumber(payload.submission_count),
    distribution_hint: asString(payload.distribution_hint)
  };
}

function asMetricsPayload(value: unknown, fallback: Partial<TopicMetricsPayload> = {}): TopicMetricsPayload {
  const payload = isRecord(value) ? value : {};

  return {
    active_prediction_count: asNumber(
      payload.active_prediction_count ?? fallback.active_prediction_count,
      0
    ),
    visible_post_count: asNumber(payload.visible_post_count ?? fallback.visible_post_count, 0),
    time_label: asString(payload.time_label ?? fallback.time_label)
  };
}

function asDiscussionPayload(
  value: unknown,
  fallback: Partial<TopicDiscussionPayload> = {}
): TopicDiscussionPayload {
  const payload = isRecord(value) ? value : {};

  return {
    excerpt_type: asString(payload.excerpt_type ?? fallback.excerpt_type),
    excerpt_title: asString(payload.excerpt_title ?? fallback.excerpt_title),
    excerpt_text: asString(payload.excerpt_text ?? fallback.excerpt_text),
    excerpt_created_at: asString(payload.excerpt_created_at ?? fallback.excerpt_created_at)
  };
}

function asResolutionPayload(
  value: unknown,
  fallback: Partial<TopicResolutionPayload> = {}
): TopicResolutionPayload {
  const payload = isRecord(value) ? value : {};

  return {
    resolution_status: asString(payload.resolution_status ?? fallback.resolution_status),
    resolved_label: asString(payload.resolved_label ?? fallback.resolved_label),
    resolved_at: asString(payload.resolved_at ?? fallback.resolved_at),
    resolution_note: asString(payload.resolution_note ?? fallback.resolution_note),
    source_label: asString(payload.source_label ?? fallback.source_label),
    source_url: asString(payload.source_url ?? fallback.source_url)
  };
}

function inferTimeLabel(row: FeedRow | ThreadDetailRow) {
  const closeAt = asString(row.close_at);
  if (!closeAt) {
    return null;
  }

  return `Cloture le ${closeAt.slice(0, 10)}`;
}

function inferLifecycle(row: FeedRow | ThreadDetailRow) {
  if ("derived_lifecycle_state" in row && typeof row.derived_lifecycle_state === "string") {
    return row.derived_lifecycle_state;
  }

  if (row.topic_status === "resolved") {
    return "resolved";
  }

  if (row.topic_status === "archived") {
    return "archived";
  }

  if (row.topic_status === "locked") {
    return "locked";
  }

  return "open";
}

export function toHomeFeedTopic(row: FeedRow, rank: number): HomeFeedTopicView {
  const nested: JsonRecord = isRecord(row.topic_card_payload) ? row.topic_card_payload : {};
  const aggregatePayload = asAggregatePayload(row.aggregate_payload ?? nested.aggregate_payload);
  const metricsPayload = asMetricsPayload(row.metrics_payload ?? nested.metrics_payload, {
    active_prediction_count:
      asNumber(row.active_prediction_count) || asNumber(row.thread_post_count),
    visible_post_count: asNumber(row.visible_post_count) || asNumber(row.thread_post_count),
    time_label: inferTimeLabel(row)
  });
  const discussionPayload = asDiscussionPayload(
    row.discussion_payload ?? nested.discussion_payload,
    {
      excerpt_text: asString(row.topic_description),
      excerpt_title: asString(row.topic_title),
      excerpt_created_at: asString(row.latest_thread_post_at ?? row.last_activity_at ?? row.created_at)
    }
  );
  const resolutionPayload = asResolutionPayload(
    row.resolution_payload ?? nested.resolution_payload
  );
  const rawCardPayload = isRecord(row.card_payload)
    ? row.card_payload
    : isRecord(nested.card_payload)
      ? nested.card_payload
      : null;
  const cardPayload = rawCardPayload
    ? {
        primary_card_slug: asString(rawCardPayload.primary_card_slug, "featured-observer")!,
        primary_card_label: asString(rawCardPayload.primary_card_label, "Carte visible")!,
        primary_card_rarity: asString(rawCardPayload.primary_card_rarity, "common")!,
        additional_count: asNumber(rawCardPayload.additional_count, 0)
      }
    : null;

  const payload: TopicCardPayload = {
    topic_id: asString(row.topic_id ?? nested.topic_id, "")!,
    topic_slug: asString(row.topic_slug ?? nested.topic_slug, "")!,
    topic_title: asString(row.topic_title ?? nested.topic_title, "")!,
    topic_description: asString(row.topic_description ?? nested.topic_description),
    derived_lifecycle_state: inferLifecycle(row),
    topic_status: asString(row.topic_status ?? nested.topic_status, "open")!,
    visibility: asString(row.visibility ?? nested.visibility, "public")!,
    is_sensitive: asBoolean(row.is_sensitive ?? nested.is_sensitive, false),
    space_id: asString(row.space_id ?? nested.space_id),
    space_slug: asString(row.space_slug ?? nested.space_slug),
    space_name: asString(row.space_name ?? nested.space_name),
    primary_taxonomy_slug: asString(row.primary_taxonomy_slug ?? nested.primary_taxonomy_slug),
    primary_taxonomy_label: asString(row.primary_taxonomy_label ?? nested.primary_taxonomy_label),
    primary_territory_id: asString(row.primary_territory_id ?? nested.primary_territory_id),
    primary_territory_slug: asString(row.primary_territory_slug ?? nested.primary_territory_slug),
    primary_territory_name: asString(row.primary_territory_name ?? nested.primary_territory_name),
    primary_territory_level: asString(row.primary_territory_level ?? nested.primary_territory_level),
    prediction_type: asString(row.prediction_type ?? nested.prediction_type),
    prediction_question_title: asString(
      row.prediction_question_title ?? nested.prediction_question_title ?? row.topic_title
    ),
    aggregate_payload: aggregatePayload,
    metrics_payload: metricsPayload,
    discussion_payload: discussionPayload,
    card_payload: cardPayload,
    resolution_payload: resolutionPayload,
    feed_reason_code: asString(row.feed_reason_code ?? nested.feed_reason_code, "high_activity")!,
    feed_reason_label: asString(
      row.feed_reason_label ?? nested.feed_reason_label,
      "Remonte car la conversation reste active."
    )!,
    editorial_feed_score: asNumber(row.thread_score ?? row.editorial_feed_score)
  };

  return {
    ...payload,
    aggregate_payload: aggregatePayload,
    metrics_payload: metricsPayload,
    discussion_payload: discussionPayload,
    card_payload: cardPayload,
    resolution_payload: resolutionPayload,
    last_activity_at: asString(row.last_activity_at ?? row.latest_thread_post_at ?? row.created_at),
    open_at: asString(row.open_at),
    close_at: asString(row.close_at),
    resolve_deadline_at: asString(row.resolve_deadline_at),
    resolved_at: asString(row.resolved_at),
    visible_post_count: asNumber(row.visible_post_count ?? row.thread_post_count),
    active_prediction_count: asNumber(row.active_prediction_count),
    activity_score_raw: asNumber(row.activity_score_raw, 0),
    freshness_score_raw: asNumber(row.freshness_score_raw, 0),
    participation_score_raw: asNumber(row.participation_score_raw, 0),
    territorial_relevance_score_raw: asNumber(row.territorial_relevance_score_raw, 0),
    resolution_proximity_score_raw: asNumber(row.resolution_proximity_score_raw, 0),
    editorial_priority_score_raw: asNumber(row.editorial_priority_score_raw, 0),
    shift_score_raw: asNumber(row.shift_score_raw, 0),
    editorial_feed_score: asNumber(row.thread_score ?? row.editorial_feed_score, 0),
    feed_reason_code: payload.feed_reason_code,
    feed_reason_label: payload.feed_reason_label,
    editorial_feed_rank: asNumber(row.editorial_feed_rank, rank),
    topic_card_payload: payload
  };
}

export function toTopicSummary(row: ThreadDetailRow): TopicSummaryView {
  return {
    id: row.id,
    space_id: row.space_id ?? null,
    slug: row.slug,
    title: row.title,
    description: row.description ?? null,
    topic_status: row.topic_status,
    effective_visibility: row.effective_visibility,
    primary_territory_id: row.primary_territory_id ?? null,
    open_at: row.open_at,
    close_at: row.close_at,
    created_at: row.created_at,
    visible_post_count: asNumber(row.visible_post_count ?? row.thread_post_count),
    active_prediction_count: asNumber(row.active_prediction_count)
  };
}

export function toTopicAggregate(
  row: JsonRecord & { id: string; prediction_type?: string | null; submission_count?: number | null }
): TopicPredictionAggregateView | null {
  if (!row.prediction_type) {
    return null;
  }

  return {
    topic_id: row.id,
    prediction_type: row.prediction_type,
    submission_count: asNumber(row.submission_count),
    numeric_average: null,
    numeric_median: null,
    binary_yes_ratio: null
  };
}

export function toTopicRow(
  row: JsonRecord & {
    id: string;
    slug: string;
    title: string;
    topic_status: string;
    effective_visibility: string;
    open_at: string;
    close_at: string;
    created_at: string;
    space_id?: string | null;
    description?: string | null;
  }
): TopicRow {
  return {
    id: row.id,
    space_id: row.space_id ?? null,
    slug: row.slug,
    title: row.title,
    description: row.description ?? null,
    topic_status: row.topic_status,
    visibility: row.effective_visibility,
    open_at: row.open_at,
    close_at: row.close_at,
    created_at: row.created_at
  };
}

export function toThreadFeedItem(row: FeedRow, rank: number): HomeFeedTopicView {
  return toHomeFeedTopic(row, rank);
}

export function toThreadSummary(row: ThreadDetailRow): ThreadSummaryView {
  return toTopicSummary(row);
}

export function toThreadAggregate(
  row: JsonRecord & { id: string; prediction_type?: string | null; submission_count?: number | null }
): ThreadPredictionAggregateView | null {
  return toTopicAggregate(row);
}

export function toThreadRow(
  row: JsonRecord & {
    id: string;
    slug: string;
    title: string;
    topic_status: string;
    effective_visibility: string;
    open_at: string;
    close_at: string;
    created_at: string;
    space_id?: string | null;
    description?: string | null;
  }
): ThreadRow {
  return toTopicRow(row);
}

export function toPredictionQuestion(row: JsonRecord | null): PredictionQuestionRow | null {
  if (!row) {
    return null;
  }

  return {
    topic_id: asString(row.topic_id, "")!,
    prediction_type: asString(row.prediction_type, "binary")!,
    title: asString(row.title, "")!,
    unit_label: asString(row.unit_label),
    allow_submission_update: asBoolean(row.allow_submission_update, true)
  };
}

export function toThreadPost(row: ThreadPostRow): PostRow {
  return {
    id: row.id,
    topic_id: row.thread_id,
    space_id: null,
    post_type: row.type,
    post_status: "visible",
    title: row.title ?? null,
    body_markdown: row.content ?? "",
    created_at: row.created_at
  };
}

export function toLegacyPost(row: LegacyPostRow): PostRow {
  return {
    id: row.id,
    topic_id: row.topic_id,
    space_id: row.space_id,
    post_type: row.post_type,
    post_status: row.post_status,
    title: row.title ?? null,
    body_markdown: row.body_markdown,
    created_at: row.created_at
  };
}

export function toSpaceRow(row: JsonRecord): SpaceRow {
  return {
    id: asString(row.id, "")!,
    slug: asString(row.slug, "")!,
    name: asString(row.name, "")!,
    description: asString(row.description) ?? null,
    space_type: asString(row.space_role ?? row.space_type, "editorial")!,
    space_status: asString(row.space_status, "active")!,
    visibility: asString(row.visibility, "public")!,
    created_at: asString(row.created_at, new Date().toISOString())!
  };
}
