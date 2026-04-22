# Fixtures reference

All test fixtures live in [tests/fixtures/supabase-admin.ts](../../../frontend/tests/fixtures/supabase-admin.ts) (integration + E2E) and [tests/e2e/helpers/auth.ts](../../../frontend/tests/e2e/helpers/auth.ts) (E2E-only).

## Integration (Vitest node)

### `adminClient(): SupabaseClient`
Service-role client. RLS-bypassing. Use for:
- Wiping state in `beforeEach` / `afterEach`.
- Reading ground truth after a mutation.
- Creating pre-conditions that a real user couldn't (e.g. setting `profile_status` directly).

**Never** use `adminClient` to simulate what a real user would do — the whole point of integration tests is that they go through RLS.

### `userClient(email: string): Promise<SupabaseClient>`
Anon-key client with an authenticated session for the given `email`. Under the hood: admin generates a magic link, a Node `@supabase/ssr` server client redeems it via `verifyOtp`. No password anywhere. The returned client enforces RLS as that user.

### `createEphemeralUser(handle: string): Promise<{email, userId}>`
Creates a new `auth.users` row + `app_profile` row. The handle becomes the username **and** is prefixed into the email — so it must satisfy `/^[a-z0-9_]{3,24}$/`. Hyphens fail.

Caller owns cleanup:
```ts
await admin.auth.admin.deleteUser(user.userId);
```

### `createTestPost(title: string): Promise<{slug, threadId, postItemId}>`
Creates a text post as the seed user via `rpc_create_post_full`. **Auto-wipes seed-user's prior posts with a retry loop** so the 8/24h rate limit never trips.

Caller owns cleanup:
```ts
await admin.from('thread_post').delete().eq('id', post.postItemId);
await admin.from('topic').delete().eq('id', post.threadId);
```

### `createTestPoll(opts): Promise<{slug, threadId, postItemId, optionIds}>`
Same as `createTestPost` but in poll mode. `opts` = `{title, question, optionLabels: readonly string[], deadlineHoursFromNow?: number}`. Auto-wipes; same cleanup.

### `getLocalSupabase(): {apiUrl, publishableKey, serviceRoleKey, dbUrl}`
Raw env pulled from `supabase status -o env`. Cached after first call. Use when you need a raw anon client (e.g. to prove an anonymous actor is rejected).

## E2E (Playwright)

### `signInAsSeedUser(page: Page): Promise<void>`
Loads the shared seed-user storage state file (written once per Playwright run by `global-setup.ts`). The seed user has:
- `email: test@example.com`
- `userId: 00000000-0000-0000-0000-000000000001`
- No username set in the seed — most tests don't care because they don't pass through `/auth/callback/route.ts` (where the onboarding redirect lives).

### `signInAsUser(page: Page, email: string): Promise<void>`
Admin-generates a magic link for the given user, redeems via `verifyOtp` with an in-memory cookie jar, transplants cookies onto the Playwright context. Use for:
- Onboarding tests (seed user is irrelevant — they never hit the callback)
- Destructive account-settings tests (must not touch seed user, other suites depend on it)
- Multi-user scenarios (one `signInAsSeedUser`, one `signInAsUser(ephemeral.email)`)

## SEED_USER constant

```ts
export const SEED_USER = {
  email: 'test@example.com',
  userId: '00000000-0000-0000-0000-000000000001',
} as const;
```

Fixed IDs so tests can assert against them without resolving.
