# Bug-hunt checklist — specific failure modes that actually happened

Read this when you think a feature is done. If none of these apply, it probably is. Each item links to the exact test that would catch it so you can model new tests on the pattern.

## 1. "DB write succeeds but UI shows an error"

The canonical PoliticoResto bug. Root cause: `redirect()` inside a try/catch block. Next's `redirect()` throws `NEXT_REDIRECT` by design; if it's caught, the action falls through to the catch's error-redirect while the DB row persists.

- **Reproduce**: move the trailing `redirect(successPath)` above the `}` that closes `try`. Run the happy-path E2E. You'll see URL `/<page>?error=publish_failed` while the row exists.
- **Pattern to grep**: `redirect(` inside a `try {}`.
- **Test that catches it**: [tests/e2e/post-creation.spec.ts](../../../frontend/tests/e2e/post-creation.spec.ts) — asserts `not.toHaveURL(/error=publish_failed/)` AND `not.toHaveURL(/post\/new/)` after submit.

## 2. "Theatrical tests hide backend breakage"

A unit test that mocks Supabase proves the shape of the RPC call, not that the RPC works. When the RPC's SQL is buggy (wrong column name, missing cascade, stale view), the mocked test stays green.

- **Grep**: `vi.mock('@supabase/ssr'` or `vi.mock('@/lib/supabase/server'`.
- **Fix**: move the test to `tests/integration/` and hit real Supabase via `adminClient()` / `userClient()`.

## 3. "Privacy leak via cross-user access"

RLS policies are only as good as the test that tries to defeat them.

- **Pattern to test**: create two ephemeral users, have user B try to SELECT / UPDATE / DELETE user A's rows via both direct table and via any RPC. Verify all four paths.
- **Reference suite**: [tests/integration/voting-history.int.test.ts](../../../frontend/tests/integration/voting-history.int.test.ts) — 6 tests prefixed `PRIVACY:` that attempt the boundary from every angle.

## 4. "Rate limit trips when you didn't expect it"

The `rpc_create_post_full` RPC enforces 8 posts / 24 hours per user. Cross-suite state pollution makes this fail in mysterious ways.

- **Pattern**: if your integration test creates posts outside `createTestPost()`, wipe first with the retry loop (see [tests/fixtures/supabase-admin.ts](../../../frontend/tests/fixtures/supabase-admin.ts) `createTestPost` implementation).

## 5. "UI looks right but there's no backing data mutation"

A button exists, a form submits, the redirect happens, but the DB wasn't actually updated. Assert on **ground truth** via `adminClient()` in your E2E, not just on UI state.

- **Reference**: [tests/e2e/voting-history.spec.ts](../../../frontend/tests/e2e/voting-history.spec.ts) — after every UI action, reads back the row via admin to confirm it's really there.

## 6. "Form field value doesn't satisfy validator"

The onboarding/profile forms have `defaultValue={profile.username}`. If the profile row's username doesn't match the validator (e.g. has a hyphen), any submit (even if the user didn't touch the field) will fail at `validateUsername`. This one bit during account-settings E2E development.

- **Pattern**: ephemeral-user handles must satisfy `/^[a-z0-9_]{3,24}$/`. Use `_` not `-`.

## 7. "Feature works in isolation, fails under full suite"

Usually one of:
- Rate limit: see #4.
- Cross-suite DB state: use per-suite ephemeral users (see `createEphemeralUser`), not the seed user's shared profile.
- `next dev` flake under load: the E2E webServer now defaults to `next build && next start`. If running with `E2E_USE_DEV=1` and seeing `ERR_CONNECTION_RESET`, switch off dev mode.

## 8. "Optimistic UI drifts from server truth"

Client-side state updates (e.g. vote counts, comment tree) can diverge from the DB if the server response shape changes. Every E2E that exercises a mutation should reload the page at least once and re-assert — proves the server-rendered state matches what the optimistic update showed.

## 9. Spec said X, reality is Y

Not every "done" feature matches the product spec. Document explicit `SPEC GAP:` tests that pin the **current** behaviour so a future fix will break the test intentionally. Example: [tests/integration/poll-response.int.test.ts](../../../frontend/tests/integration/poll-response.int.test.ts) — pins that the RPC currently allows re-voting, contradicting the "vote once" spec. When the RPC is fixed, the test will flip and the author sees exactly what changed.

## Before claiming "done"

- [ ] At least one real integration test exercises the RPC / Server Action against local Supabase.
- [ ] At least one E2E asserts on user-visible behaviour after the mutation.
- [ ] Either the E2E OR an integration test verifies DB ground truth (not just UI state).
- [ ] RLS boundary test if the feature is privacy-sensitive.
- [ ] `npm run verify && npm run test:integration && npm run test:e2e` all green on a clean DB.
