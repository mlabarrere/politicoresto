/**
 * Integration — guard against legacy `prediction_*` schema returning.
 *
 * The Pronostics feature replaces the abandoned `prediction_*` model
 * with `prono_*`. Lot 0 dropped every legacy table, RPC, and trigger
 * function. This test fails loudly if a future migration recreates one
 * by name.
 *
 * Strategy: ask PostgREST for the legacy object. PostgREST returns a
 * stable error code when the relation/function does not exist; any
 * other response means the object is back.
 */
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { adminClient } from '../fixtures/supabase-admin';

const LEGACY_TABLES = [
  'prediction_question',
  'prediction_option',
  'prediction_submission',
  'prediction_submission_history',
  'prediction_score_event',
  'prediction_questions_editorial',
] as const;

const LEGACY_FUNCTIONS = [
  'compute_prediction_normalized_score',
  'rpc_create_topic_with_prediction',
] as const;

// The legacy objects are intentionally absent from generated types.
// Cast through `unknown` to widen the table/function name accepted by
// the supabase-js client just for these negative assertions.
type LooseClient = SupabaseClient & {
  from: (rel: string) => ReturnType<SupabaseClient['from']>;
  rpc: (fn: string) => ReturnType<SupabaseClient['rpc']>;
};

function isMissingError(error: PostgrestError | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === 'PGRST202' ||
    code === '42P01' ||
    message.includes('does not exist') ||
    message.includes('could not find')
  );
}

describe('legacy prediction_* schema is gone', () => {
  it.each(LEGACY_TABLES)('table %s no longer exists', async (table) => {
    const admin = adminClient() as unknown as LooseClient;
    const { error } = await admin.from(table).select('*').limit(1);
    expect(error).not.toBeNull();
    expect(isMissingError(error)).toBe(true);
  });

  it.each(LEGACY_FUNCTIONS)('rpc %s no longer exists', async (fn) => {
    const admin = adminClient() as unknown as LooseClient;
    const { error } = await admin.rpc(fn);
    expect(error).not.toBeNull();
    expect(isMissingError(error)).toBe(true);
  });
});
