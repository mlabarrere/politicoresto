# Claude Code — Project Rules

## MANDATORY: Pre-push checklist

**NEVER push to git without running these two commands first and confirming they pass:**

```bash
# 1. Build must succeed with zero errors
cd frontend && npm run build

# 2. All tests must pass (502 tests across 79 files)
cd frontend && ./node_modules/.bin/vitest run
```

If either command fails, fix the issue before committing. No exceptions.

## MANDATORY: Production-level logging

Every server-side operation **must** emit structured `console.info/warn/error` logs so Vercel logs are useful.

Rules:
- **Server Actions** — log start (inputs sans PII), success (IDs + redirect path), and every error branch
- **Route Handlers** — log each request entry point and all error returns
- **Data fetchers** (`lib/data/`) — log query start, row count on success, and full error on failure
- **Middleware / proxy** — log auth redirects and `getUser` failures
- Format: `[module][operation] message`, structured object second arg, e.g.:
  ```ts
  console.info("[auth/callback] session exchanged OK", { userId: user.id });
  console.error("[home] v_feed_global query failed", { message: error.message, code: error.code });
  ```
- Never log passwords, full tokens, or raw cookie values

## ⚠️ Missing config / tool / CLI / MCP — READ THIS

When a required environment variable, CLI tool, MCP server, or external service is **missing or misconfigured**, STOP and display a prominent notice with emojis so the developer reads it:

```
🚨 CONFIGURATION MANQUANTE
━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ NEXT_PUBLIC_SUPABASE_URL is not set
👉 Add it to .env.local and to Vercel environment variables
📖 See: https://supabase.com/dashboard/project/_/settings/api
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Never silently swallow a missing-config error. Always surface it with instructions.

## Local tooling available

The following tools are installed on the developer Mac and can be used by Claude directly — no need to ask the user to run them:

### Core runtime & package management
- **node** v25.9.0 — Next.js 16 runtime (note: CI runs on Node LTS; watch for version drift)
- **npm** 11.12.1 — scripts: `dev`, `build`, `start`, `typecheck`, `test`, `test:unit`, `test:e2e`, `test:e2e:ui`
- **git** 2.50.1, **brew** 5.1.6

### Deployment & backend
- **vercel** 51.7.0 — `vercel dev`, `vercel deploy`, `vercel logs`, `vercel env pull`
- **supabase** 2.90.0 — `supabase start/stop/status`, `supabase db reset`, `supabase gen types`, `supabase migration new`
- **psql** 14.22 — direct DB access (local DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)
- **docker** 27.4.0 — required by Supabase local (ports 54321-54324) and by `act`

### GitHub & CI
- **gh** 2.90.0 — `gh pr create/view/checks`, `gh run list/view`, `gh workflow run`
- **act** 0.2.87 — runs GitHub Actions locally. Config at `~/Library/Application Support/act/actrc` uses `catthehacker/ubuntu:act-latest` with `--container-architecture linux/amd64`. Run from repo root (NOT `frontend/`): `act -j build-and-test` or dry-run with `-n`.

### Workflows present in `.github/workflows/`
- `ci.yml` → Full pipeline on **PR** and **push to main**:
  - Jobs 1–3 in parallel: Security (Codacy SARIF), Code Quality (typecheck), Tests & Coverage (vitest + Codecov)
  - Job 4: Build (waits for all 3)
  - Job 5: Deploy Preview to Vercel (main push only, waits for build)
- `release.yml` → On **GitHub Release published**: Build → Deploy Production to Vercel

Vercel auto-deploys are disabled via `frontend/vercel.json` (`github.enabled: false`).
Required GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `CODECOV_TOKEN`, `CODACY_PROJECT_TOKEN`.

### Testing
- **vitest** — unit tests in `frontend/tests/unit/` (502 tests, 79 files)
- **playwright** — E2E via `npm run test:e2e` (run `npx playwright install` once to fetch browsers)

### Quick validation chain (full local CI)
```bash
cd frontend && npm run build && ./node_modules/.bin/vitest run
cd /Users/micky/Desktop/politicoresto && act -j build-and-test -n   # dry-run
```

## Project structure

- `frontend/` — Next.js 16 app (TypeScript, Tailwind, Supabase SSR)
- `supabase/migrations/` — PostgreSQL migrations applied in timestamp order on fresh DB
- Tests: `frontend/tests/unit/` — Vitest + React Testing Library

## Supabase migration rules

- All `CREATE TRIGGER` must be preceded by `DROP TRIGGER IF EXISTS` (idempotent)
- Triggers on `user_visibility_settings` must be wrapped in a DO block checking `relkind = 'r'` (it becomes a VIEW in migration 20260416184000)
- `DROP TRIGGER IF EXISTS` on a VIEW also fails — always guard with pg_class check
- Never add BOM (UTF-8 byte order mark) to `.sql` files
- Use `CREATE OR REPLACE` for functions and views; use DROP+CREATE for views with type changes
- Cast enum literals explicitly (e.g., `'bloc'::public.space_role`)

## Next.js 16 conventions

- Use `proxy.ts` (not `middleware.ts`) — Next.js 16 renamed the file convention
- Export the function as `proxy()` not `middleware()`
- `next` version is pinned to exact `16.2.4` in `package.json` (no `^` caret)

## Test environment

- `window.localStorage` must be explicitly mocked in tests that render components using it
- Do NOT use `vi.useFakeTimers()` with `waitFor()` — use real timers for debounce tests
- Server components: render with `await Page({ searchParams: ... })` pattern
