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

## Local dev quick reference

```bash
cp frontend/.env.local.example frontend/.env.local   # first time only
supabase start                                       # Postgres + Auth + Storage + Inbucket
supabase db reset                                    # apply migrations + seed (test@example.com / password123)
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
