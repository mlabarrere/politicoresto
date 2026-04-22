---
name: testing
description: How the testing pyramid works in this Next.js 16 + Supabase app and how to add a test at each layer. Use when adding tests for a new feature, fixing a bug (write the regression test first), debugging a failing test, or deciding whether a test is real or theatrical. Covers the four layers (unit, component, integration, E2E), the fixtures, the "no mocking the system under test" rule, and the evidence-before-claims reporting rule.
---

# testing — four layers, zero theatricals

Previous sessions shipped features whose DB writes worked but whose UI was broken. The test suite existed; it just didn't test the things that could break. This skill encodes the rules that make that failure mode structurally impossible.

The definitive rule set is in **CLAUDE.md → "Testing discipline"**. This skill is the operational playbook.

## The four layers and when to pick each

| Layer | Tool | Location | Use it when |
|---|---|---|---|
| Unit | Vitest (jsdom) | `tests/**/*.test.ts(x)` | Testing a pure function, a validator, a state reducer. No I/O. Milliseconds. |
| Component | Vitest + RTL | same (`.tsx`) | A React component in isolation. Mock only the network boundary. |
| Integration | Vitest (node) | `tests/integration/**/*.int.test.ts` | A Server Action, Route Handler, RPC, or RLS policy against **real local Supabase**. Never mock the system under test. |
| E2E | Playwright | `tests/e2e/**/*.spec.ts` | A full user flow in a real browser against `next build && next start` + local Supabase. |

**You need at least two layers for any user-facing feature.** Integration alone can't prove the UI renders correctly; E2E alone is too slow and too coarse to diagnose. Skip neither.

## Running tests locally

```bash
# Fast pre-push gate — no Supabase needed.
npm run --prefix frontend verify

# Integration: needs `supabase start` up. Self-reads keys via supabase status -o env.
npm run --prefix frontend test:integration

# E2E: boots `next build && next start` + expects local Supabase up.
# Flip to dev mode for local iteration via E2E_USE_DEV=1.
npm run --prefix frontend test:e2e
```

All three are enforced on every PR by `.github/workflows/ci.yml`.

## The test fixtures

All under `frontend/tests/fixtures/supabase-admin.ts`. Read the file — it's short.

- `adminClient()` — service-role Supabase client. RLS-bypassing. For setup + teardown + ground-truth reads only. Never simulates a real user.
- `userClient(email)` — anon-key client signed in as `email` via admin-generated magic link + `verifyOtp`. No password used anywhere. Exercises RLS as that user would.
- `createEphemeralUser(handle)` — creates a brand-new `auth.users` + `app_profile` row. Return `{email, userId}`. Username is set to `handle`; pick a handle that satisfies `/^[a-z0-9_]{3,24}$/` (hyphens are rejected by `validateUsername`). Caller deletes via `admin.auth.admin.deleteUser()`.
- `createTestPost(title)` — creates a text post as the seed user, returns `{slug, threadId, postItemId}`. Auto-wipes seed-user's prior posts first (with retry loop) so the 8/24h rate limit never trips across suites.
- `createTestPoll({title, question, optionLabels, deadlineHoursFromNow})` — creates a poll post, returns `{slug, threadId, postItemId, optionIds}`.

For E2E:
- `signInAsSeedUser(page)` — loads the shared seed-user storage state (written once by `global-setup.ts`).
- `signInAsUser(page, email)` — signs an arbitrary email into the Playwright context. Use for ephemeral-user tests (e.g. onboarding, destructive account operations).

## Writing each layer

### Unit / component
Pure logic or isolated components. If your test file has more than one `vi.mock(...)` that's not for a third-party service (fetch, Supabase, analytics), it's likely theatrical — consider moving it to integration.

```ts
import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/utils/safe-path';

describe('safeNextPath', () => {
  it('rejects javascript: URLs', () => {
    expect(safeNextPath('javascript:alert(1)')).toBe('/');
  });
});
```

### Integration
Against the **real** local Supabase stack. No mocks of Supabase. Use `adminClient()` for setup/teardown. Use `userClient(email)` to impersonate a real user and exercise RLS.

```ts
import { describe, expect, it } from 'vitest';
import { adminClient, createEphemeralUser, userClient } from '../fixtures/supabase-admin';

describe('profile update', () => {
  it('owner can update bio', async () => {
    const user = await createEphemeralUser('userA_int');
    const client = await userClient(user.email);

    await client.from('app_profile').update({ bio: 'new' }).eq('user_id', user.userId);

    const admin = adminClient();
    const { data } = await admin.from('app_profile').select('bio').eq('user_id', user.userId).single();
    expect(data?.bio).toBe('new');

    await admin.auth.admin.deleteUser(user.userId);
  });
});
```

### E2E
Real browser, real network, real build. Authenticate via one of the two helpers. Assert on what the user sees (`getByRole`, `getByText`) — not on class names or internal state.

Destructive tests (deactivate/delete) **must use ephemeral users**, not the seed user. Every other spec depends on the seed user being alive.

```ts
import { expect, test } from '@playwright/test';
import { createEphemeralUser, adminClient } from '../fixtures/supabase-admin';
import { signInAsUser } from './helpers/auth';

test('deactivation flow', async ({ page }) => {
  const user = await createEphemeralUser('deactivator_ok');
  await signInAsUser(page, user.email);
  await page.goto('/me?section=security');
  await page.getByRole('button', { name: /^Desactiver$/ }).first().click();
  await page.locator('input[name="confirm_deactivate"]').fill('DESACTIVER');
  await page.getByRole('button', { name: /^Confirmer$/ }).click();

  const admin = adminClient();
  await expect(async () => {
    const { data } = await admin
      .from('app_profile').select('profile_status').eq('user_id', user.userId).single();
    expect(data?.profile_status).toBe('limited');
  }).toPass({ timeout: 10_000 });

  await admin.auth.admin.deleteUser(user.userId);
});
```

## The "do not mock the system under test" rule

A test that mocks the thing it claims to test is theatrical. It proves the shape of a function call, not that the system works. Example of what NOT to do:

```ts
// THEATRICAL — do not write this.
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }));
// ... then assert the mock was called with specific args.
```

The integration layer exists specifically so you don't need to mock Supabase.

## Reporting a feature as "done"

Three honest answers only:
- *"Yes — here is the passing test, here is the log extract, here is the screenshot."*
- *"I don't know — I have not tested the full flow. Here is what I verified; here is what remains."*
- *"No — here is the failure."*

**"It should work" and "the code looks correct" are not answers.** A DB write that succeeds while the UI errors is a broken feature, not a partial one.

## Debugging a failed test

- **Playwright trace**: `npx playwright show-trace test-results/<dir>/trace.zip`. Retained on failure by default.
- **Vitest watch mode**: `npm run --prefix frontend test:watch` — re-runs on file save.
- **Integration test fails but worked yesterday**: check you ran `supabase db reset --local` recently. Stale rows accumulate in `thread_post` and can trip the 8/24h post-creation rate limit.
- **E2E fails intermittently**: suspect `next dev` flake first. Re-run with `E2E_USE_DEV=` (empty) to force build mode. If still flaky, the test is genuinely racy — fix it, don't quarantine it.
- **"Daily post limit reached" in integration**: the `createTestPost` / `createTestPoll` fixtures auto-wipe seed posts with a retry loop, but if you're creating posts outside them, do the same wipe yourself before calling the RPC.

## See also

- `.claude/skills/testing/reference/layers-cheatsheet.md` — condensed one-pager of what goes where.
- `.claude/skills/testing/reference/bug-hunt-checklist.md` — specific failure modes to look for before calling a feature done.
- `.claude/skills/testing/reference/fixtures-reference.md` — full API of every test fixture.
