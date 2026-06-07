import { NextResponse } from 'next/server';

// Frozen for the forum-only release (Tranche 1): poll voting ships in
// Tranche 2. The original handler (submit_post_poll_vote RPC) is preserved in
// git history and restored when polls are unfrozen.
export function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
