# PoliticoResto — Project Rules for Claude Code

Forum politique. Next.js 16 (app router, TS, Tailwind v4) + Supabase (SQL, RLS, RPC).
Vercel pour l'hébergement. Le backend est la source de vérité métier.

## Binding external standards (consult before writing code)

- [Vercel Style Guide](https://github.com/vercel/style-guide)
- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Supabase SQL Style Guide](https://supabase.com/docs/guides/getting-started/ai-prompts/code-format-sql)
- [Supabase Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Pino](https://getpino.io)

Verify conventions against these sources rather than extrapolating from existing code.

## Hard rules (non-negotiable)

1. **Local-first.** All iteration happens locally via `supabase start` + `vercel dev`.
   `npm run --prefix frontend verify` must pass before any `git push`. Never push
   speculatively to a Vercel Preview to "see if it works".
2. **Log everything via `lib/logger.ts`.** Zero `console.*` in `frontend/app`,
   `frontend/lib`, `frontend/components`. Tests and `scripts/*` excepted.
   Structured objects only: `log.info({ fields }, "msg")`. Secrets are redacted
   at the logger level — never inline secret values in call sites.
3. **Auth** — canonical `@supabase/ssr` pattern, no custom auth code.
   - Four factories in `frontend/lib/supabase/`: `client.ts` (browser),
     `server.ts` (RSC / actions / route handlers), `middleware.ts` (proxy),
     `auth-user.ts` (thin null-safe wrapper around `auth.getClaims()`).
   - **`auth.getClaims()` is the default** in server contexts (middleware,
     `auth-user.ts`). Staging and prod run asymmetric JWT keys (ES256/RS256)
     since 2026-04-21 — legacy HS256 decommissioned. `getClaims()` validates
     the JWT locally via JWKS, falling back to `getUser()` internally when
     signature verification fails. Single codebase for both environments.
   - **Never** `auth.getSession()` (reads cookie without verification).
     `auth.getUser()` is only used in the OAuth callback immediately after
     `exchangeCodeForSession` (fresh session, tutorial pattern).
   - Each server component / action / route handler calls `getAuthUser(
     supabase)` where it needs the current user. With asymmetric keys the
     call is a local JWT verification (no network round-trip on happy path),
     so we follow the official tutorial pattern: no `react.cache()` wrapper,
     no request-scoped memoization layer. The simpler the code, the less
     surface for `this`-binding / cache-key bugs.
   - OAuth callback at `app/auth/callback/route.ts`. Failures redirect to
     `/auth/auth-code-error?reason=oauth_missing_code|oauth_exchange_failed`.
   - Middleware `/me` gate is intentional product routing, not a generic wall.
   - Every auth operation emits a structured log per the taxonomy documented
     in `.claude/skills/authentication/reference/supabase-auth-nextjs.md`.
   - Forbidden: custom JWT, custom session cookies, session in React state,
     trivial `auth.*` wrappers, ad-hoc `createClient` outside the four factories.
4. **Every new table:** RLS enabled **and** at least one policy in the same migration.
5. **`service_role` keys never reach client or Edge code.** Server-only paths only.
6. **Libraries over custom code** for all solved problems (validation, forms,
   date math, accessible primitives, env parsing). Before writing a utility,
   check if a library already does it.
7. **Existing code is not evidence of necessity.** Three pivots have left
   residue. Verify actual usage before preserving anything.
8. **Always simplify.** Deletions are progress. But applied migrations are
   **never rewritten** — forward-only, additive.
9. **Diagnose, don't mask.** If a thing is slow, find the root cause before
   hiding it behind cache / debounce / optimistic UI.
10. **No speculative code.** No feature flags mort-nés, no props "au cas où",
    no `try/catch` décoratif. If it's not used today, it doesn't exist.
11. **Every user-facing feature requires an E2E spec in the same PR.**
    One spec file per user story under `frontend/tests/e2e/`. Happy path
    + at least one failure path. Features without an E2E spec do not
    merge. Use `signInAsSeedUser` from `tests/e2e/helpers/auth.ts` to
    reach authenticated routes.

## Local dev quick reference

```bash
cp frontend/.env.local.example frontend/.env.local   # first time only
supabase start                                       # Postgres + Auth + Storage + Inbucket
supabase db reset                                    # apply migrations + seed (seed user: test@example.com — E2E auth uses admin magic-link, no password)
./scripts/dev.sh                                     # boots stack if needed + vercel dev
npm run --prefix frontend verify                     # pre-push gate (typecheck + tests)
```

Local URLs: app `http://localhost:3000`, Studio `http://127.0.0.1:54323`,
Inbucket (mail capture) `http://127.0.0.1:54324`.

See skill `local-dev` for the full playbook including reset, troubleshooting, and
the current baseline-migration blocker.

## Logging quick reference

```ts
import { createLogger, logError, withUser } from "@/lib/logger";

const log = createLogger("auth");  // context name — keep stable per module

log.info({ event: "login.start", user_id: userId }, "login requested");

try { /* ... */ }
catch (err) { logError(log, err, { event: "login.failed", user_id: userId }); throw err; }
```

Levels: `trace`/`debug` (dev-only) · `info` (operational) · `warn` (unexpected,
recoverable) · `error` (attention needed) · `fatal` (subsystem failure).

See skill `logging` for field conventions, the event catalog, and request
correlation.

## Railway (weighting worker host)

The Python weighting worker is too heavy for Vercel Python Functions
(~600 MB bundle, Lambda cap is 500 MB — scipy + samplics + pandas +
numpy won't fit). It runs on **Railway** instead, triggered by a
Supabase Database Webhook on every vote.

Railway CLI is installed and pre-authenticated on this machine.

```bash
railway whoami                        # verify auth
railway link -p content-imagination   # link the repo to the project
railway status                        # service + env info
railway up                            # deploy from current dir
railway logs                          # tail deploy / runtime logs
railway variables                     # read/set env vars
railway domain                        # inspect / generate public URL
```

Project: `content-imagination` · environment: `production` · service:
the worker FastAPI app in `worker/`. See
`docs/weighting-railway-deploy.md` for the full playbook (Supabase
webhook wiring, env vars, rollback).

## CI / deployment summary

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | PR → main, push → main | typecheck + vitest + build |
| `deploy-preview.yml` | After CI green on main | migrate-staging → Vercel Preview |
| `deploy-production.yml` | GitHub Release published | migrate-production → build + tests → Vercel Production |

Vercel Git integration is disabled (`frontend/vercel.json`). GitHub Actions is
the only path to production.

## Supabase migration rules

- Every `CREATE TRIGGER` preceded by `DROP TRIGGER IF EXISTS` (idempotent).
- Triggers on `user_visibility_settings` must be wrapped in a `DO` block checking
  `relkind = 'r'` (it becomes a VIEW in migration `20260416184000`).
- `DROP TRIGGER IF EXISTS` on a VIEW also fails — always guard with `pg_class`.
- No BOM in `.sql` files.
- `CREATE OR REPLACE` for functions/views; DROP+CREATE for views with type changes.
- Cast enum literals explicitly: `'bloc'::public.space_role`.

## Next.js 16 conventions

- Middleware file is `proxy.ts` (renamed in Next 16); export is `proxy()`.
- `next` pinned to exact `16.2.4` (no caret).

## Test environment

- `window.localStorage` must be mocked explicitly in component tests that use it.
- Do **not** combine `vi.useFakeTimers()` with `waitFor()` — use real timers
  for debounce tests.
- Server components: render with `await Page({ searchParams: ... })`.

## Testing discipline (non-negotiable)

Previous sessions declared features complete when only the database write worked
and the UI errored. **Partial is broken.** These rules make that failure mode
structurally impossible.

### The pyramid

| Layer | Tool | Location | What it proves |
|---|---|---|---|
| Unit | Vitest (jsdom) | `tests/**/*.test.ts(x)` | Pure logic, utilities, state machines. No I/O. Milliseconds. |
| Component | Vitest + RTL | same | A component renders and behaves correctly in isolation. Mock only at the network boundary. |
| Integration | Vitest (node) | `tests/integration/**/*.int.test.ts` | Server Action / Route Handler / RLS against **real local Supabase**. No mocks of the system under test. |
| E2E | Playwright | `tests/e2e/**/*.spec.ts` | Full user flow in a real browser against `next dev` + local Supabase. |

Each layer is non-optional. E2E alone is not a substitute for integration; unit
tests diagnose *where*, E2E tests confirm *it works*.

### Definition of "done" for a user-facing feature

A feature is **not done** until **all** of the following are true:

1. Unit tests cover the core logic.
2. Component tests cover any non-trivial React component introduced or modified.
3. Integration tests cover the server-side flow, including the DB side-effects.
4. E2E tests cover the happy path **and** at least one failure path.
5. All of the above pass locally (`npm run test`).
6. `npm run verify` passes (typecheck + lint + unit + integration).
7. The UI flow was opened in a browser; log output was inspected.
8. Evidence produced: a passing test (the authoritative artefact), plus — for
   UI changes — a Playwright trace or screenshot of the final state.

A feature that writes to the DB but returns a UI error is **broken, not partial**.
Report it as broken.

### Reporting rules (apply to every future session)

These are instructions to you, not documentation of current practice.

1. **Never claim a feature works without evidence.** Three honest answers exist:
   - *"Yes — here is the passing test, the log extract, the screenshot."*
   - *"I don't know — I have not tested the full flow. Here is what I verified; here is what remains."*
   - *"No — here is the failure."*

   *"It should work"*, *"I implemented it"*, and *"the code looks correct"* are
   not answers.

2. **Report partial states as failures.** If the write persists but the UI
   errors, say: *"The DB write succeeds. The UI then errors with [exact text].
   The feature is broken."* Not: *"Post creation is working, just a small UI
   issue."*

3. **Run every test you write, at least once, and show it passing, before the
   commit that adds it.** A test that has not been run is not a test.

4. **Do not mock the system under test.** An integration test that mocks
   Supabase is theatrical. Mocks are for third-party services (payments, email,
   etc.), not for the code path you are verifying.

5. **Unusual setup is a red flag.** Tests that only pass with specific env
   vars, specific DB state, or specific timing are almost always wrong.
   Investigate before committing.

6. **Flaky tests are bugs.** Fix or delete — never `.skip`, never quarantine.

### Directory structure and scripts

```
frontend/tests/
├── unit/                 # Pure logic + component tests (jsdom)
├── integration/          # *.int.test.ts — real local Supabase (node)
├── e2e/                  # Playwright specs + helpers + global-setup
├── fixtures/             # Shared factories (supabase-admin.ts, …)
└── examples/             # Reference patterns for each layer
```

- `npm run test:unit` · fast, no external deps.
- `npm run test:integration` · requires `supabase start` (verified in verify.sh).
- `npm run test:e2e` · Playwright; auto-boots `next dev` + reads `supabase status -o env`.
- `npm run test` · all three in sequence.
- `npm run verify` · pre-push gate: prettier + eslint + auth guards + typecheck + unit. Integration + E2E are NOT in verify (they need a running Supabase stack) — CI enforces them on every PR. Locally, run them directly before merging a feature: `npm run test:integration && npm run test:e2e`.

### E2E auth (Google-SSO-only app)

The app UI exposes only Google OAuth. E2E tests must **not** use a password
back door. The canonical flow (see `tests/e2e/global-setup.ts`):

1. Service-role client calls `auth.admin.generateLink({type: 'magiclink', email: 'test@example.com'})`.
2. A Node `@supabase/ssr` client redeems the token with `verifyOtp()`, producing
   an `sb-*` cookie jar bit-for-bit identical to a real Google callback.
3. Cookies are persisted to `tests/e2e/.auth/seed-user.json` (gitignored).
4. Every test loads that state via `signInAsSeedUser(page)` — no per-test
   minting, so we do not trip Supabase's single-use-token rate limit.

No password, no OAuth mock. If the seed user should no longer exist, the flow
fails loudly — which is the correct behaviour.

### CI enforcement

- `ci.yml` runs `test:unit` + `test:integration` + `test:e2e` on every PR and
  push to main. Any failure blocks merge.
- Playwright uploads traces/screenshots on failure.
- ESLint forbids `.only` / `.skip` / `fixme` in committed tests, and bans `any`
  in integration-test mocks.

## Known deviations

- **Baseline migration is staging schema as-of 2026-04-21**
  (`supabase/migrations/20260402193700_remote_baseline.sql`). Before the next
  `supabase db push` to staging/prod, run
  `supabase migration repair --status applied 20260402193700` on those envs so
  the CLI does not try to re-apply it.
- **No `console.*` in app code.** Server paths use Pino via
  `lib/logger.ts`. Client Components forward structured entries to the
  server via `lib/client-log.ts` → `POST /api/_log` → Pino. ESLint
  enforces `no-console: error` project-wide with zero suppressions
  outside `scripts/` and `*.config.*`.
- **Auth on asymmetric JWT keys since 2026-04-21.** HS256 legacy decommissioned
  on staging and prod. `auth.getClaims()` is now the default in server
  contexts (see `auth-user.ts` header). Single codebase for both environments.
- **`seed/polls_demo.sql` disabled** — references the dropped RPC
  `recompute_post_poll_snapshot`; rewrite needed against the consolidated
  RPCs from migration `20260420240000`.

## Project-specific decisions

*(One line each; populated as decisions are taken across sessions.)*

- 2026-04-21 — Pino chosen as the single logging library. See `.claude/skills/logging`.
- 2026-04-21 — Local seed test user: `test@example.com` / `password123`.
- 2026-04-21 — Session 2: auth consolidated on `@supabase/ssr`. Four factories,
  `/auth/auth-code-error` page for OAuth failures. Aligned 1:1 on the Supabase
  official Next.js tutorial — no custom memoization layer. See
  `.claude/skills/authentication`.
- 2026-04-21 — Supabase asymmetric JWT keys enabled on staging + prod; HS256
  legacy decommissioned. `auth.getClaims()` is now the default server-side.
- 2026-04-22 — Session 3 library adoptions:
  - `zod@^3` + `@t3-oss/env-nextjs@^0.13` for env validation
    (`lib/supabase/env.ts`).
  - **No** `react-hook-form` (Server Actions are native and sufficient).
  - **No** `date-fns` (native `Intl.RelativeTimeFormat` /
    `Intl.DateTimeFormat` is the modern correct choice).
  - **No** `@tanstack/react-query` (Server Components + Supabase direct).
  - See `.claude/skills/library-first` for the full decision table.
- 2026-04-22 — Session 3 style toolchain: `@vercel/style-guide@^6`
  (browser + react + next + typescript) + `eslint@^8.57` + `prettier@^3`.
  ESLint config at `frontend/.eslintrc.cjs` (legacy format required by
  style-guide v6). A handful of default rules disabled with written
  justifications (see the file header). `no-console: error` enforced.
- 2026-04-23 — Session 4 reality-gap closeout (10-gap audit):
  - Poll votes are **final**: `submit_post_poll_vote` uses `on conflict do nothing`
    + row_count guard raising `Already voted` (migration `20260422140000`).
  - Post edit/delete UI ships. Owner menu on `PostCard` with a `@base-ui/react`
    Dialog confirm modal. Editing a root article also updates `topic.title`
    so the home feed heading stays in sync (migration `20260423080000`).
  - Post edits show a "modifié" indicator (`ForumPost.isEdited` from
    `updated_at !== created_at`).
  - Poll edit: new RPC `rpc_update_post_poll` rewrites question + option
    labels in place; **soft-locks** once any vote is cast
    (`exists(post_poll_response)` check). UI disables Edit with tooltip
    when `sample_size > 0` (migration `20260423080500`).
  - Profile demographics: DOB + postal_code on
    `user_private_political_profile`, resolved_city on `app_profile`,
    `has_seen_completion_nudge` flag. Hard age floor = 18 at the RPC
    layer — under-18 DOBs are **never persisted** (migration
    `20260423081000`).
  - Onboarding stays **username-only**. Progressive demographic capture
    via a dismissible `CompletionBanner` on `/me?section=profile` and a
    one-time `PostCreateNudgeModal` rendered on `/` when `?nudge=1` is
    appended by `createPostAction` for users with an incomplete profile.
  - Postal code → city resolved server-side via `geo.api.gouv.fr` (free,
    no key; multi-commune codes pick the first match).
  - Voting-history tile labels: drop the `shortName()` truncation. Render
    the full label with `line-clamp-2` + `title=` tooltip. Accent fidelity
    lives on the data side (seed). Vote-click latency killed with
    `useOptimistic` — UI flips `aria-pressed` in the same frame, server
    action + `revalidatePath('/me')` run in the background.
  - Home feed cursor pagination: `limit(24)` → `FEED_PAGE_SIZE=20` with a
    base64url-encoded `{last_activity_at, editorial_feed_rank, topic_id}`
    cursor. Route handler `/api/feed?cursor=...` returns `{items, nextCursor}`.
    Client `post-feed.tsx` appends batches via fetch on "Load more" click
    (no more 30-item cap).
  - Deferred (explicit user decisions): poll weighting methodology, @mentions
    backend, change-email flow, self-reported political bloc.
- 2026-04-23 — Weighting worker lives in `worker/` as a top-level sibling of
  `frontend/` and `supabase/`. **Monorepo is the default.** A split into its
  own repo is re-evaluated post-v1 *only if* (1) product is in prod with real
  users, (2) at least one editorial benchmark has concluded that reweighting
  measurably improves truthfulness, (3) explicit decision to open-source the
  worker. Railway deploy can target the `worker/` subdirectory directly —
  splitting is not a deployment prerequisite.

## Instructions to future sessions

1. **Read this file first.** Verify conventions against the linked external
   guides before relying on existing code patterns.
2. **Library-first.** Before writing a utility, check if a library does it.
3. **Verify usage before preserving.** Three pivots, much residue.
4. **Log everything** via `lib/logger.ts`. No `console.*` in app code.
5. **Never push-to-test.** Local first. `verify` must be green.
6. **Fetch current docs when uncertain.** Auth, logging, and Supabase/Vercel
   CLIs evolve — do not trust stale memory.
7. **Skills** live in `.claude/skills/`. Load them when doing work in their
   domain: `local-dev`, `logging`, `authentication`, `supabase-migration`,
   `nextjs-component`, `library-first`.


Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
