'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createLogger, logError } from '@/lib/logger';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const log = createLogger('pronos');

const VALIDATION_ERRORS = new Set([
  'Titre requis',
  'Question requise',
  'Au moins deux options requises',
  'Pas plus de huit options',
  'Au moins deux options distinctes requises',
]);

const MAX_OPTIONS = 8;

function validationKey(message: string): string | null {
  for (const v of VALIDATION_ERRORS) if (message.startsWith(v)) return v;
  return null;
}

/**
 * `requestPronoAction` — submit a pronostic request. Lands the topic in
 * `pending_review`; a moderator decides next.
 */
export async function requestPronoAction(formData: FormData): Promise<void> {
  let redirectTarget: string | null = null;
  try {
    const title = String(formData.get('title') ?? '').trim();
    const questionText = String(formData.get('prono_question') ?? '').trim();
    const allowMultiple =
      String(formData.get('prono_allow_multiple') ?? 'false') === 'true';
    const options = formData
      .getAll('prono_options')
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0)
      .slice(0, MAX_OPTIONS);

    if (!title) throw new Error('Titre requis');
    if (!questionText) throw new Error('Question requise');
    if (options.length < 2) throw new Error('Au moins deux options requises');

    const supabase = await createServerSupabaseClient();
    const t0 = performance.now();
    const { data, error } = await supabase.rpc('rpc_request_prono', {
      p_title: title,
      p_question_text: questionText,
      p_options: options,
      p_allow_multiple: allowMultiple,
    });
    const rpcMs = Math.round(performance.now() - t0);

    if (error) {
      const message = error.message ?? '';
      const matched = validationKey(message);
      if (matched) {
        throw new Error(matched);
      }
      log.error(
        {
          event: 'pronos.request.rpc_failed',
          message,
          code: error.code,
          rpc_ms: rpcMs,
        },
        'request prono rpc failed',
      );
      throw new Error('Soumission impossible.');
    }

    const topicId = typeof data === 'string' ? data : null;
    if (!topicId) throw new Error('Soumission impossible.');

    const { data: topicRow } = await supabase
      .from('topic')
      .select('slug')
      .eq('id', topicId)
      .single();
    const slug = topicRow?.slug ? String(topicRow.slug) : null;
    if (!slug) throw new Error('Soumission impossible.');

    log.info(
      {
        event: 'pronos.request.ok',
        topic_id: topicId,
        rpc_ms: rpcMs,
      },
      'prono request created',
    );

    revalidatePath('/');
    redirectTarget = `/post/${slug}`;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Soumission impossible.';
    const matched = validationKey(message);
    if (matched) {
      throw new Error(matched);
    }
    logError(log, error, { event: 'pronos.request.failed', message });
    redirect(
      `/post/new?error=${encodeURIComponent('prono_request_failed')}` as never,
    );
  }
  if (redirectTarget) redirect(redirectTarget as never);
}

/**
 * `publishPronoAction` — moderator approves a pending request.
 * Expects `topic_id` in the form data.
 */
export async function publishPronoAction(formData: FormData): Promise<void> {
  const topicId = String(formData.get('topic_id') ?? '').trim();
  if (!topicId) throw new Error('Topic manquant');

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc('rpc_publish_prono', {
      p_topic_id: topicId,
    });
    if (error) {
      log.error(
        {
          event: 'pronos.publish.rpc_failed',
          topic_id: topicId,
          message: error.message,
          code: error.code,
        },
        'publish prono rpc failed',
      );
      throw new Error('Publication impossible.');
    }
    log.info(
      { event: 'pronos.publish.ok', topic_id: topicId },
      'prono published',
    );
    revalidatePath('/admin/pronos');
    revalidatePath('/');
  } catch (error) {
    logError(log, error, { event: 'pronos.publish.failed', topic_id: topicId });
    throw error;
  }
}

/**
 * `resolvePronoAction` — moderator resolves (or voids) a prono.
 *
 * Form fields:
 *   - question_id (required)
 *   - resolution_kind (required, 'resolved' | 'voided')
 *   - winning_option_ids[] (required when resolved)
 *   - betting_cutoff_at (optional ISO datetime; default now())
 *   - resolution_note (optional)
 *   - void_reason (required when voided)
 *   - topic_slug (for redirect)
 */
export async function resolvePronoAction(formData: FormData): Promise<void> {
  const questionId = String(formData.get('question_id') ?? '').trim();
  const kind = String(formData.get('resolution_kind') ?? '').trim();
  const winningIds = formData
    .getAll('winning_option_ids')
    .map((v) => String(v ?? '').trim())
    .filter((v) => v.length > 0);
  const cutoffRaw = String(formData.get('betting_cutoff_at') ?? '').trim();
  const note = String(formData.get('resolution_note') ?? '').trim() || null;
  const voidReason = String(formData.get('void_reason') ?? '').trim() || null;
  const topicSlug = String(formData.get('topic_slug') ?? '').trim();

  if (!questionId) throw new Error('Pronostic invalide');
  if (kind !== 'resolved' && kind !== 'voided') {
    throw new Error('Type de résolution invalide');
  }
  if (kind === 'resolved' && winningIds.length === 0) {
    throw new Error('Sélectionnez au moins une option gagnante');
  }
  if (kind === 'voided' && !voidReason) {
    throw new Error("Indiquez la raison de l'annulation");
  }

  // datetime-local inputs send "YYYY-MM-DDTHH:MM" without timezone.
  // Treat them as local time and convert to UTC ISO. An empty value
  // means default = now(), which the RPC handles natively.
  let cutoffIso: string | null = null;
  if (cutoffRaw) {
    const parsed = new Date(cutoffRaw);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Horodatage de fermeture invalide');
    }
    cutoffIso = parsed.toISOString();
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc('rpc_resolve_prono', {
      p_question_id: questionId,
      p_resolution_kind: kind,
      p_winning_option_ids: kind === 'resolved' ? winningIds : null,
      p_betting_cutoff_at: cutoffIso,
      p_resolution_note: note,
      p_void_reason: kind === 'voided' ? voidReason : null,
    });
    if (error) {
      log.error(
        {
          event: 'pronos.resolve.rpc_failed',
          question_id: questionId,
          kind,
          message: error.message,
          code: error.code,
        },
        'resolve prono rpc failed',
      );
      throw new Error('Résolution refusée.');
    }
    log.info(
      {
        event: 'pronos.resolve.ok',
        question_id: questionId,
        kind,
        winners: winningIds.length,
      },
      'prono resolved',
    );
    if (topicSlug) revalidatePath(`/post/${topicSlug}`);
    revalidatePath('/admin/pronos');
    revalidatePath('/pronos');
    revalidatePath('/pronos/leaderboard');
  } catch (error) {
    logError(log, error, {
      event: 'pronos.resolve.failed',
      question_id: questionId,
    });
    throw error;
  }
}

/**
 * `placeBetAction` — auth user places (or updates) a bet on an option.
 * Reads `question_id`, `option_id`, `topic_slug` from the form data so
 * the server action can revalidate the right slug after success.
 */
export async function placeBetAction(formData: FormData): Promise<void> {
  const questionId = String(formData.get('question_id') ?? '').trim();
  const optionId = String(formData.get('option_id') ?? '').trim();
  const topicSlug = String(formData.get('topic_slug') ?? '').trim();
  if (!questionId || !optionId) throw new Error('Pronostic invalide');
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc('rpc_place_bet', {
      p_question_id: questionId,
      p_option_id: optionId,
    });
    if (error) {
      log.error(
        {
          event: 'pronos.bet.rpc_failed',
          question_id: questionId,
          message: error.message,
          code: error.code,
        },
        'place bet rpc failed',
      );
      throw new Error('Pari refusé.');
    }
    log.info(
      {
        event: 'pronos.bet.placed',
        question_id: questionId,
        option_id: optionId,
      },
      'bet placed',
    );
    if (topicSlug) revalidatePath(`/post/${topicSlug}`);
    revalidatePath('/pronos');
    revalidatePath('/');
  } catch (error) {
    logError(log, error, {
      event: 'pronos.bet.failed',
      question_id: questionId,
    });
    throw error;
  }
}

/**
 * `removeBetAction` — auth user retires their bet on an option.
 */
export async function removeBetAction(formData: FormData): Promise<void> {
  const questionId = String(formData.get('question_id') ?? '').trim();
  const optionId = String(formData.get('option_id') ?? '').trim();
  const topicSlug = String(formData.get('topic_slug') ?? '').trim();
  if (!questionId || !optionId) throw new Error('Pronostic invalide');
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc('rpc_remove_bet', {
      p_question_id: questionId,
      p_option_id: optionId,
    });
    if (error) {
      log.error(
        {
          event: 'pronos.bet.remove_rpc_failed',
          question_id: questionId,
          message: error.message,
          code: error.code,
        },
        'remove bet rpc failed',
      );
      throw new Error('Retrait impossible.');
    }
    log.info(
      {
        event: 'pronos.bet.removed',
        question_id: questionId,
        option_id: optionId,
      },
      'bet removed',
    );
    if (topicSlug) revalidatePath(`/post/${topicSlug}`);
    revalidatePath('/pronos');
  } catch (error) {
    logError(log, error, {
      event: 'pronos.bet.remove_failed',
      question_id: questionId,
    });
    throw error;
  }
}

/**
 * `rejectPronoAction` — moderator rejects a pending request with a reason.
 */
export async function rejectPronoAction(formData: FormData): Promise<void> {
  const topicId = String(formData.get('topic_id') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  if (!topicId) throw new Error('Topic manquant');
  if (!reason) throw new Error('Raison requise');

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc('rpc_reject_prono', {
      p_topic_id: topicId,
      p_reason: reason,
    });
    if (error) {
      log.error(
        {
          event: 'pronos.reject.rpc_failed',
          topic_id: topicId,
          message: error.message,
          code: error.code,
        },
        'reject prono rpc failed',
      );
      throw new Error('Refus impossible.');
    }
    log.info(
      { event: 'pronos.reject.ok', topic_id: topicId },
      'prono rejected',
    );
    revalidatePath('/admin/pronos');
  } catch (error) {
    logError(log, error, { event: 'pronos.reject.failed', topic_id: topicId });
    throw error;
  }
}
