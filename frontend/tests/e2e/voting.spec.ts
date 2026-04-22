import { test } from '@playwright/test';

test.describe('User Story 5 — left/right voting (reactions)', () => {
  // The reaction API (`/api/reactions` POST) and the thread-post UI
  // controls exist, but E2E needs a known target thread_post row to
  // click. Same seed-extension constraint as sub-comments.
  //
  // Backend coverage: supabase/tests/03_rls.sql asserts the RLS
  // contract on `reaction` writes. Unit coverage:
  // tests/unit/reactions-route.test.ts covers the route handler end
  // to end with a mock Supabase client.

  test.fixme('happy path: authed user casts a left vote, then toggles to right', async () => {
    // TODO:
    //   - signInAsSeedUser
    //   - goto known post
    //   - click "Gauche" → assert UI state + toast/log
    //   - click "Droite" → assert toggled, only one row in public.reaction
    //     for this (user, thread_post_id)
  });

  test.fixme('failure path: anonymous vote redirects to login (or opens sheet)', async () => {
    // TODO: anonymous click on a vote button opens the auth-required
    // sheet (see components/auth/auth-required-sheet.tsx).
  });
});
