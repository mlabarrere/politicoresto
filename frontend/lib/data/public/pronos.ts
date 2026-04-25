import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface PronoOptionView {
  id: string;
  label: string;
  sort_order: number;
  is_catchall: boolean;
  is_active: boolean;
  is_late: boolean;
  added_at: string;
  bet_count: number;
  share: number;
  odds: number | null;
}

export interface PronoSummaryView {
  question_id: string;
  topic_id: string;
  topic_slug: string;
  title: string;
  topic_status: string;
  question_text: string;
  allow_multiple: boolean;
  requested_by_user_id: string;
  requested_by_username: string | null;
  requested_by_display_name: string | null;
  options: PronoOptionView[];
  total_bets: number;
  betting_cutoff_at: string | null;
  resolution_kind: 'resolved' | 'voided' | null;
  winning_option_ids: string[] | null;
  void_reason: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  current_user_bets: string[];
  created_at: string;
}

function asOption(value: unknown): PronoOptionView | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.label !== 'string') return null;
  return {
    id: v.id,
    label: v.label,
    sort_order: Number(v.sort_order ?? 0),
    is_catchall: Boolean(v.is_catchall),
    is_active: v.is_active !== false,
    is_late: Boolean(v.is_late),
    added_at: typeof v.added_at === 'string' ? v.added_at : '',
    bet_count: Number(v.bet_count ?? 0),
    share: Number(v.share ?? 0),
    odds: v.odds === null || v.odds === undefined ? null : Number(v.odds),
  };
}

function normalize(row: Record<string, unknown> | null): PronoSummaryView | null {
  if (!row) return null;
  const questionId = typeof row.question_id === 'string' ? row.question_id : null;
  const topicId = typeof row.topic_id === 'string' ? row.topic_id : null;
  if (!questionId || !topicId) return null;
  const rawOptions = Array.isArray(row.options) ? row.options : [];
  const options = rawOptions
    .map((o) => asOption(o))
    .filter((o): o is PronoOptionView => o !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
  return {
    question_id: questionId,
    topic_id: topicId,
    topic_slug: String(row.topic_slug ?? ''),
    title: String(row.title ?? ''),
    topic_status: String(row.topic_status ?? 'open'),
    question_text: String(row.question_text ?? ''),
    allow_multiple: Boolean(row.allow_multiple),
    requested_by_user_id: String(row.requested_by_user_id ?? ''),
    requested_by_username:
      typeof row.requested_by_username === 'string'
        ? row.requested_by_username
        : null,
    requested_by_display_name:
      typeof row.requested_by_display_name === 'string'
        ? row.requested_by_display_name
        : null,
    options,
    total_bets: Number(row.total_bets ?? 0),
    betting_cutoff_at:
      typeof row.betting_cutoff_at === 'string' ? row.betting_cutoff_at : null,
    resolution_kind:
      row.resolution_kind === 'resolved' || row.resolution_kind === 'voided'
        ? row.resolution_kind
        : null,
    winning_option_ids: Array.isArray(row.winning_option_ids)
      ? row.winning_option_ids.map((v) => String(v))
      : null,
    void_reason: typeof row.void_reason === 'string' ? row.void_reason : null,
    resolution_note:
      typeof row.resolution_note === 'string' ? row.resolution_note : null,
    resolved_at: typeof row.resolved_at === 'string' ? row.resolved_at : null,
    current_user_bets: Array.isArray(row.current_user_bets)
      ? row.current_user_bets.map((v) => String(v))
      : [],
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
  };
}

export async function getPronoSummaryByTopicId(
  topicId: string,
  options: { supabase?: SupabaseClient } = {},
): Promise<PronoSummaryView | null> {
  const supabase = options.supabase ?? (await createServerSupabaseClient());
  const { data, error } = await supabase
    .from('v_prono_summary')
    .select('*')
    .eq('topic_id', topicId)
    .maybeSingle();
  if (error) return null;
  return normalize(data as Record<string, unknown> | null);
}

export async function getPronoSummariesByTopicIds(
  topicIds: readonly string[],
  options: { supabase?: SupabaseClient } = {},
): Promise<Map<string, PronoSummaryView>> {
  const map = new Map<string, PronoSummaryView>();
  if (topicIds.length === 0) return map;
  const supabase = options.supabase ?? (await createServerSupabaseClient());
  const { data, error } = await supabase
    .from('v_prono_summary')
    .select('*')
    .in('topic_id', topicIds);
  if (error || !data) return map;
  for (const row of data) {
    const summary = normalize(row as Record<string, unknown>);
    if (summary) map.set(summary.topic_id, summary);
  }
  return map;
}

export async function getOpenPronos(
  options: { supabase?: SupabaseClient; limit?: number } = {},
): Promise<PronoSummaryView[]> {
  const supabase = options.supabase ?? (await createServerSupabaseClient());
  const limit = options.limit ?? 50;
  const { data, error } = await supabase
    .from('v_prono_summary')
    .select('*')
    .eq('topic_status', 'open')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data
    .map((row) => normalize(row as Record<string, unknown>))
    .filter((s): s is PronoSummaryView => s !== null);
}
