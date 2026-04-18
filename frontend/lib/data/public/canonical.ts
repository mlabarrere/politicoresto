import type {
  HomeFeedTopicView,
  PostRow,
  SpaceRow,
  PostRowView,
  PostSummaryView,
  TopicCardPayload,
  TopicDiscussionPayload,
  TopicResolutionPayload,
  TopicRow,
  TopicSummaryView
} from "@/lib/types/views";
import { type JsonRecord, isRecord, asNumber, asString, asBoolean } from "@/lib/utils/type-coerce";

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
  thread_post_count?: number | null;
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

function inferLifecycle(row: FeedRow | ThreadDetailRow): string {
  if ("derived_lifecycle_state" in row && typeof row.derived_lifecycle_state === "string") {
    return row.derived_lifecycle_state;
  }
  if (row.topic_status === "resolved") return "resolved";
  if (row.topic_status === "archived") return "archived";
  if (row.topic_status === "locked") return "locked";
  return "open";
}

export function inferTopicTimeLabel(closeAt: string | null | undefined): string | null {
  if (!closeAt) return null;
  return `Cloture le ${closeAt.slice(0, 10)}`;
}

export function toHomeFeedTopic(row: FeedRow, rank: number): HomeFeedTopicView {
  const nested: JsonRecord = isRecord(row.topic_card_payload) ? row.topic_card_payload : {};

  const discussionPayload = asDiscussionPayload(
    row.discussion_payload ?? nested.discussion_payload,
    {
      excerpt_text: asString(row.topic_description),
      excerpt_title: asString(row.topic_title),
      excerpt_created_at: asString(row.latest_thread_post_at ?? row.last_activity_at ?? row.created_at)
    }
  );
  const resolutionPayload = asResolutionPayload(row.resolution_payload ?? nested.resolution_payload);

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
    discussion_payload: discussionPayload,
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
    discussion_payload: discussionPayload,
    resolution_payload: resolutionPayload,
    last_activity_at: asString(row.last_activity_at ?? row.latest_thread_post_at ?? row.created_at),
    open_at: asString(row.open_at),
    close_at: asString(row.close_at),
    resolve_deadline_at: asString(row.resolve_deadline_at),
    resolved_at: asString(row.resolved_at),
    visible_post_count: asNumber(row.visible_post_count ?? row.thread_post_count),
    activity_score_raw: asNumber(row.activity_score_raw, 0),
    freshness_score_raw: asNumber(row.freshness_score_raw, 0),
    participation_score_raw: asNumber(row.participation_score_raw, 0),
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
    open_at: row.open_at,
    close_at: row.close_at,
    created_at: row.created_at,
    visible_post_count: asNumber(row.visible_post_count ?? row.thread_post_count)
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

export function toThreadSummary(row: ThreadDetailRow): PostSummaryView {
  return toTopicSummary(row);
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
): PostRowView {
  return toTopicRow(row);
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
