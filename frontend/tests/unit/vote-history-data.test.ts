import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { getVoteHistoryEditorData } from '@/lib/data/authenticated/vote-history';

type QueryResult = { data: unknown; error: unknown };

function makeClient(opts: {
  elections: QueryResult;
  results: QueryResult;
  votes: QueryResult;
}) {
  const electionQuery = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (r: QueryResult) => void) =>
      Promise.resolve(opts.elections).then(resolve),
  };
  const resultQuery = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (r: QueryResult) => void) =>
      Promise.resolve(opts.results).then(resolve),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === 'election') return electionQuery;
      if (table === 'election_result') return resultQuery;
      throw new Error(`unexpected table: ${table}`);
    }),
    rpc: vi.fn((name: string) => {
      if (name === 'rpc_list_vote_history_detailed')
        return Promise.resolve(opts.votes);
      throw new Error(`unexpected rpc: ${name}`);
    }),
  };
}

describe('getVoteHistoryEditorData', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns status=ready with merged elections + results + votes', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({
        elections: {
          data: [
            {
              id: 'e1',
              slug: 'pres-2022-t1',
              type: 'presidentielle',
              year: 2022,
              round: 1,
              held_on: '2022-04-10',
              label: 'Pres 2022 T1',
            },
          ],
          error: null,
        },
        results: {
          data: [
            {
              id: 'r1',
              election_id: 'e1',
              rank: 1,
              candidate_name: 'A',
              list_label: null,
              party_slug: 'renaissance',
              nuance: 'ENS',
              pct_exprimes: 27.85,
            },
          ],
          error: null,
        },
        votes: { data: [], error: null },
      }),
    );

    const out = await getVoteHistoryEditorData();
    expect(out.status).toBe('ready');
    expect(out.elections).toHaveLength(1);
    expect(out.elections[0]?.results).toHaveLength(1);
    expect(out.votesByElectionId).toEqual({});
  });

  it("maps a user's vote into votesByElectionId by election_id", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({
        elections: {
          data: [
            {
              id: 'e1',
              slug: 'pres-2022-t1',
              type: 'presidentielle',
              year: 2022,
              round: 1,
              held_on: '2022-04-10',
              label: 'L',
            },
          ],
          error: null,
        },
        results: { data: [], error: null },
        votes: {
          data: [
            {
              id: 'v1',
              election_id: 'e1',
              election_slug: 'pres-2022-t1',
              election_label: 'L',
              election_result_id: 'r1',
              choice_kind: 'vote',
              declared_at: null,
              candidate_name: 'A',
              list_label: null,
              party_slug: 'renaissance',
            },
          ],
          error: null,
        },
      }),
    );

    const out = await getVoteHistoryEditorData();
    expect(out.status).toBe('ready');
    expect(out.votesByElectionId.e1?.choice_kind).toBe('vote');
  });

  it('reports unavailable when election table is missing (capability missing)', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({
        elections: {
          data: null,
          error: { message: 'schema cache miss', code: 'PGRST202' },
        },
        results: { data: [], error: null },
        votes: { data: [], error: null },
      }),
    );

    const out = await getVoteHistoryEditorData();
    expect(out.status).toBe('unavailable');
    expect(out.elections).toEqual([]);
  });

  it('reports error on generic election query failure', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({
        elections: { data: null, error: { message: 'boom', code: 'OTHER' } },
        results: { data: [], error: null },
        votes: { data: [], error: null },
      }),
    );

    const out = await getVoteHistoryEditorData();
    expect(out.status).toBe('error');
  });

  it('still returns elections when the votes RPC fails (soft-fail)', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({
        elections: {
          data: [
            {
              id: 'e1',
              slug: 's',
              type: 'presidentielle',
              year: 2022,
              round: 1,
              held_on: '2022-04-10',
              label: 'L',
            },
          ],
          error: null,
        },
        results: { data: [], error: null },
        votes: { data: null, error: { message: 'rpc down', code: 'OTHER' } },
      }),
    );

    const out = await getVoteHistoryEditorData();
    expect(out.status).toBe('ready');
    expect(out.elections).toHaveLength(1);
    expect(out.votesByElectionId).toEqual({});
  });
});
