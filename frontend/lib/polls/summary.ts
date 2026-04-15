import type {
  PostPollOptionSummary,
  PostPollResultPoint,
  PostPollSummaryView
} from "@/lib/types/views";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeOption(value: unknown): PostPollOptionSummary | null {
  if (!isRecord(value)) return null;

  const option_id = asString(value.option_id);
  const label = asString(value.label);
  const sort_order = asNumber(value.sort_order, 0);

  if (!option_id || !label) return null;

  return { option_id, label, sort_order };
}

function normalizePoint(value: unknown): PostPollResultPoint | null {
  if (!isRecord(value)) return null;

  const option_id = asString(value.option_id);
  const option_label = asString(value.option_label);
  const sort_order = asNumber(value.sort_order, 0);
  const share = asNumber(value.share, 0);

  if (!option_id || !option_label) return null;

  const response_count = value.response_count !== undefined ? asNumber(value.response_count, 0) : undefined;
  const weighted_count = value.weighted_count !== undefined ? asNumber(value.weighted_count, 0) : undefined;

  return {
    option_id,
    option_label,
    sort_order,
    response_count,
    weighted_count,
    share
  };
}

export function normalizePostPollSummary(
  row: Record<string, unknown> | null
): PostPollSummaryView | null {
  if (!row) return null;

  const post_item_id = asString(row.post_item_id);
  const post_id = asString(row.post_id);
  const post_slug = asString(row.post_slug);
  const post_title = asString(row.post_title);
  const question = asString(row.question);
  const deadline_at = asString(row.deadline_at);

  if (!post_item_id || !question) return null;

  const options = Array.isArray(row.options)
    ? row.options.map(normalizeOption).filter((value): value is PostPollOptionSummary => value !== null)
    : [];
  const raw_results = Array.isArray(row.raw_results)
    ? row.raw_results.map(normalizePoint).filter((value): value is PostPollResultPoint => value !== null)
    : [];
  const corrected_results = Array.isArray(row.corrected_results)
    ? row.corrected_results.map(normalizePoint).filter((value): value is PostPollResultPoint => value !== null)
    : [];

  return {
    post_item_id,
    post_id,
    post_slug,
    post_title,
    question,
    deadline_at,
    poll_status: row.poll_status === "closed" ? "closed" : "open",
    sample_size: asNumber(row.sample_size, 0),
    effective_sample_size: asNumber(row.effective_sample_size, 0),
    representativity_score: asNumber(row.representativity_score, 0),
    coverage_score: asNumber(row.coverage_score, 0),
    distance_score: asNumber(row.distance_score, 0),
    stability_score: asNumber(row.stability_score, 0),
    anti_brigading_score: asNumber(row.anti_brigading_score, 0),
    raw_results,
    corrected_results,
    options,
    selected_option_id: typeof row.selected_option_id === "string" ? row.selected_option_id : null
  };
}
