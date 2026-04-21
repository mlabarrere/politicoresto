'use server';

import { revalidatePath } from 'next/cache';
import { createLogger } from '@/lib/logger';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const log = createLogger('vote-history');

type ChoiceKind =
  | 'vote'
  | 'blanc'
  | 'nul'
  | 'abstention'
  | 'non_inscrit'
  | 'ne_se_prononce_pas';

const VALID_CHOICES: ReadonlySet<ChoiceKind> = new Set([
  'vote',
  'blanc',
  'nul',
  'abstention',
  'non_inscrit',
  'ne_se_prononce_pas',
]);

export async function upsertVoteHistoryAction(input: {
  election_slug: string;
  election_result_id: string | null;
  choice_kind: ChoiceKind;
}) {
  const electionSlug = input.election_slug.trim();
  const choiceKind = input.choice_kind;

  if (!electionSlug) throw new Error('Scrutin requis.');
  if (!VALID_CHOICES.has(choiceKind))
    throw new Error('Type de choix invalide.');
  if (choiceKind === 'vote' && !input.election_result_id) {
    throw new Error('Choix de candidat requis pour un vote.');
  }

  // Le RPC est security definer et raise errcode 28000 si auth.uid() est null.
  // C'est la seule source de verite — pas de auth.getUser() redondant ici.
  const supabase = await createServerSupabaseClient();

  const t0 = performance.now();
  const { error } = await supabase.rpc('rpc_upsert_vote_history', {
    p_election_slug: electionSlug,
    p_election_result_id:
      choiceKind === 'vote' ? input.election_result_id : null,
    p_choice_kind: choiceKind,
  });
  const rpcMs = Math.round(performance.now() - t0);

  if (error) {
    log.error(
      {
        event: 'vote_history.upsert.rpc_failed',
        message: error.message,
        code: error.code,
        rpc_ms: rpcMs,
      },
      'vote history upsert rpc failed',
    );
    if (error.code === '28000') {
      throw new Error('Authentication required');
    }
    throw new Error('Enregistrement impossible pour le moment.');
  }

  log.info(
    {
      event: 'vote_history.upsert.ok',
      election_slug: electionSlug,
      choice_kind: choiceKind,
      rpc_ms: rpcMs,
    },
    'vote history upserted',
  );
  revalidatePath('/me');
}

export async function deleteVoteHistoryAction(electionSlug: string) {
  const slug = electionSlug.trim();
  if (!slug) throw new Error('Scrutin requis.');

  const supabase = await createServerSupabaseClient();

  const t0 = performance.now();
  const { error } = await supabase.rpc('rpc_delete_vote_history', {
    p_election_slug: slug,
  });
  const rpcMs = Math.round(performance.now() - t0);

  if (error) {
    log.error(
      {
        event: 'vote_history.delete.rpc_failed',
        message: error.message,
        code: error.code,
        rpc_ms: rpcMs,
      },
      'vote history delete rpc failed',
    );
    if (error.code === '28000') {
      throw new Error('Authentication required');
    }
    throw new Error('Suppression impossible pour le moment.');
  }

  log.info(
    {
      event: 'vote_history.delete.ok',
      election_slug: slug,
      rpc_ms: rpcMs,
    },
    'vote history deleted',
  );
  revalidatePath('/me');
}
