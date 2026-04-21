import { NextResponse } from 'next/server';

import { normalizePostPollSummary } from '@/lib/polls/summary';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const POLL_VOTE_ERROR = 'Poll vote failed';

type VotePayload = {
  postItemId: string;
  optionId: string;
};

function isVotePayload(value: unknown): value is VotePayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<VotePayload>;
  return (
    typeof payload.postItemId === 'string' &&
    payload.postItemId.trim().length > 0 &&
    typeof payload.optionId === 'string' &&
    payload.optionId.trim().length > 0
  );
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!isVotePayload(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Le RPC retourne directement SETOF v_post_poll_summary : un seul
  // round-trip réseau au lieu de deux (upsert puis refetch).
  const { data: rpcRows, error: voteError } = await supabase.rpc(
    'submit_post_poll_vote',
    {
      p_post_item_id: body.postItemId,
      p_option_id: body.optionId,
    },
  );

  if (voteError) {
    console.error('[polls][vote] rpc failed', {
      message: voteError.message,
      code: voteError.code,
    });
    return NextResponse.json({ error: POLL_VOTE_ERROR }, { status: 400 });
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  if (!row) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }

  const poll = normalizePostPollSummary(row as Record<string, unknown>);
  if (!poll) {
    return NextResponse.json(
      { error: 'Poll payload invalid' },
      { status: 500 },
    );
  }

  return NextResponse.json({ poll });
}
