import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ElectionResultRow = {
  id: string;
  rank: number | null;
  candidate_name: string | null;
  list_label: string | null;
  party_slug: string | null;
  nuance: string | null;
  pct_exprimes: number | null;
};

export type ElectionRow = {
  id: string;
  slug: string;
  type: 'presidentielle' | 'legislatives' | 'europeennes';
  year: number;
  round: number | null;
  held_on: string;
  label: string;
  results: ElectionResultRow[];
};

export type UserVoteRow = {
  id: string;
  election_id: string;
  election_slug: string;
  election_label: string;
  election_result_id: string | null;
  choice_kind:
    | 'vote'
    | 'blanc'
    | 'nul'
    | 'abstention'
    | 'non_inscrit'
    | 'ne_se_prononce_pas';
  declared_at: string | null;
  candidate_name: string | null;
  list_label: string | null;
  party_slug: string | null;
};

export type VoteHistoryEditorData = {
  elections: ElectionRow[];
  votesByElectionId: Record<string, UserVoteRow>;
  status: 'ready' | 'unavailable' | 'error';
  message: string | null;
};

function isCapabilityMissing(
  error: { message?: string; code?: string } | null | undefined,
) {
  if (!error) return false;
  const msg = String(error.message ?? '').toLowerCase();
  const code = String(error.code ?? '').toLowerCase();
  return (
    msg.includes('schema cache') ||
    msg.includes('could not find') ||
    msg.includes('undefined table') ||
    msg.includes('undefined function') ||
    code === '42p01' ||
    code === '42883' ||
    code === 'pgrst202' ||
    code === 'pgrst204'
  );
}

export async function getVoteHistoryEditorData(): Promise<VoteHistoryEditorData> {
  const supabase = await createServerSupabaseClient();

  console.info('[vote-history][editor] load start');

  const [electionResult, resultRows, votesResult] = await Promise.all([
    supabase
      .from('election')
      .select('id, slug, type, year, round, held_on, label')
      .order('held_on', { ascending: false })
      .order('round', { ascending: false, nullsFirst: false }),
    supabase
      .from('election_result')
      .select(
        'id, election_id, rank, candidate_name, list_label, party_slug, nuance, pct_exprimes',
      )
      .order('rank', { ascending: true, nullsFirst: false }),
    supabase.rpc('rpc_list_vote_history_detailed'),
  ]);

  if (electionResult.error) {
    console.error('[vote-history][editor] election query failed', {
      message: electionResult.error.message,
      code: electionResult.error.code,
    });
    if (isCapabilityMissing(electionResult.error)) {
      return {
        elections: [],
        votesByElectionId: {},
        status: 'unavailable',
        message: 'Historique electoral non deploye sur cet environnement.',
      };
    }
    return {
      elections: [],
      votesByElectionId: {},
      status: 'error',
      message: 'Impossible de charger les scrutins.',
    };
  }

  if (resultRows.error) {
    console.error('[vote-history][editor] result query failed', {
      message: resultRows.error.message,
      code: resultRows.error.code,
    });
    if (isCapabilityMissing(resultRows.error)) {
      return {
        elections: [],
        votesByElectionId: {},
        status: 'unavailable',
        message: 'Resultats electoraux indisponibles.',
      };
    }
    return {
      elections: [],
      votesByElectionId: {},
      status: 'error',
      message: 'Impossible de charger les resultats.',
    };
  }

  const resultsByElection = new Map<string, ElectionResultRow[]>();
  for (const r of (resultRows.data ?? []) as Array<
    ElectionResultRow & { election_id: string }
  >) {
    const list = resultsByElection.get(r.election_id) ?? [];
    list.push({
      id: r.id,
      rank: r.rank,
      candidate_name: r.candidate_name,
      list_label: r.list_label,
      party_slug: r.party_slug,
      nuance: r.nuance,
      pct_exprimes: r.pct_exprimes,
    });
    resultsByElection.set(r.election_id, list);
  }

  const elections: ElectionRow[] = (
    (electionResult.data ?? []) as ElectionRow[]
  ).map((e) => ({
    ...e,
    results: resultsByElection.get(e.id) ?? [],
  }));

  const votesByElectionId: Record<string, UserVoteRow> = {};
  if (!votesResult.error) {
    for (const v of (votesResult.data ?? []) as UserVoteRow[]) {
      votesByElectionId[v.election_id] = v;
    }
  } else {
    console.warn('[vote-history][editor] votes RPC failed', {
      message: votesResult.error.message,
      code: votesResult.error.code,
    });
  }

  console.info('[vote-history][editor] load OK', {
    electionsCount: elections.length,
    votesCount: Object.keys(votesByElectionId).length,
  });

  return { elections, votesByElectionId, status: 'ready', message: null };
}
