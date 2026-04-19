# Claude Code — Project Rules

## MANDATORY: Pre-push checklist

**NEVER push to git without running these two commands first and confirming they pass:**

```bash
# 1. Build must succeed with zero errors
cd frontend && npm run build

# 2. All tests must pass (498 tests across 79 files)
cd frontend && ./node_modules/.bin/vitest run
```

If either command fails, fix the issue before committing. No exceptions.

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
- `next` version is pinned to exact `16.1.7` in `package.json` (no `^` caret)

## Test environment

- `window.localStorage` must be explicitly mocked in tests that render components using it
- Do NOT use `vi.useFakeTimers()` with `waitFor()` — use real timers for debounce tests
- Server components: render with `await Page({ searchParams: ... })` pattern
