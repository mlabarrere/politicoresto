import { test } from '@playwright/test';

test.describe('User Story 4 — sub-comments (nested replies)', () => {
  // Nested replies require a pre-existing comment in the seed. The
  // current seed (`supabase/seed/forum_minimal_seed.sql`) doesn't
  // create comments — only political_entity rows. An end-to-end spec
  // that's deterministic across runs needs the seed extended with at
  // least one post + one top-level comment the test can reply to.
  //
  // Tracked as E2E follow-up. The functional path is covered by
  // backend SQL tests in supabase/tests/; this spec is a placeholder
  // so the user-story → spec-file mapping stays 1:1.
  test.fixme('happy path: reply to an existing comment renders as nested, persists', async () => {
    // TODO: extend seed with a known post + comment, then:
    //   - signInAsSeedUser
    //   - goto post
    //   - click "Répondre" on known comment
    //   - submit reply text
    //   - assert new node is rendered under the parent comment
    //   - assert DB row with parent_comment_id set
  });

  test.fixme('failure path: anonymous user cannot reply', async () => {
    // TODO: visit the same post unauthenticated, assert reply
    // controls are either hidden or disabled, and any direct POST
    // to the comments route is 401.
  });
});
