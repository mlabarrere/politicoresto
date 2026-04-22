import { test } from '@playwright/test';

test.describe('User Story 7 — poll response', () => {
  // Needs a known poll in the seed — `seed/polls_demo.sql` is disabled
  // (references a dropped RPC, see CLAUDE.md Known deviations). Once
  // that seed is rewritten against the consolidated post/poll RPCs
  // from migration 20260420240000, this test can be promoted from
  // fixme.
  //
  // Backend coverage: unit test at
  // tests/unit/poll-vote-route.test.ts covers /api/polls/vote end to
  // end against a mock Supabase client, including duplicate-response
  // guards.

  test.fixme('happy path: authed user votes in a known poll, tally updates', async () => {
    // TODO (after polls_demo seed rewrite):
    //   - signInAsSeedUser
    //   - goto known poll post
    //   - click option
    //   - assert UI tally updates
    //   - assert post_poll_response row for (user, poll, option)
  });

  test.fixme('duplicate vote is rejected per product rules', async () => {
    // TODO: vote once, vote again on a different option → assert the
    // server either replaces or rejects per product policy.
  });
});
