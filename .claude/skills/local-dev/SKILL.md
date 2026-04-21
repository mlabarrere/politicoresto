---
name: local-dev
description: Boot, reset, seed, and troubleshoot the local development stack (Supabase + vercel dev). Use when starting work on a new branch, when the local app behaves differently than expected, when diagnosing "works on Vercel but not locally", or when seeding/resetting the local DB.
---

# local-dev — Local development playbook

The local stack is **Docker → Supabase (Postgres + GoTrue + Storage + Inbucket) → `vercel dev`**.
Target: clean clone → running app in under 10 minutes.

## The six-command boot

```bash
# Prerequisite: Docker Desktop running.
cp frontend/.env.local.example frontend/.env.local      # first-time only
supabase start                                          # Postgres/Auth/Storage/Inbucket/Studio
#   → copy the printed "anon key" into NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
supabase db reset                                       # applies migrations + supabase/seed.sql
./scripts/dev.sh                                        # idempotent boot + vercel dev
# app: http://localhost:3000
```

`./scripts/dev.sh --reset` also runs `supabase db reset` before starting.

## Local service URLs

| Service    | URL                                                       |
|------------|-----------------------------------------------------------|
| App        | http://localhost:3000                                     |
| API        | http://127.0.0.1:54321                                    |
| Studio     | http://127.0.0.1:54323                                    |
| Inbucket   | http://127.0.0.1:54324                                    |
| Postgres   | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

## Seeded test user

Available immediately after `supabase db reset`:

- `test@example.com` / `password123`
- Email confirmation is disabled locally (`supabase/config.toml` → `[auth.email]`).

Any additional signup you perform locally also bypasses confirmation. Magic
links and password resets are captured by Inbucket at `:54324`.

## Resetting without losing the Supabase stack

```bash
supabase db reset                # re-applies migrations + seed.sql (keeps stack up)
supabase stop && supabase start  # nuclear option — recycles all containers
```

## Inspecting the DB directly

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
supabase studio                                                  # opens http://127.0.0.1:54323
supabase db diff                                                 # pending changes
supabase migration list                                          # local vs remote history
```

## "Works on Vercel but not locally" — triage

1. **Env vars missing locally?** Compare `frontend/.env.local` with `.env.local.example`.
   Run `vercel env pull frontend/.env.local.vercel` and diff.
2. **Schema drift?** The repo's migrations are incremental on top of a remote
   baseline that is not committed (see blocker below). If a query references
   a table that doesn't exist locally, this is why.
3. **Node version drift?** CI uses Node 20 LTS; local is 25.x. Rare but
   possible — check if the error references a removed Node API.
4. **Supabase stack not healthy?** `supabase status` — all services should
   show `RUNNING`.
5. **Stale build cache?** `rm -rf frontend/.next` then `vercel dev` again.

## Schema baseline

The full schema lives in
`supabase/migrations/20260402193700_remote_baseline.sql` (pulled from staging
on 2026-04-21). `supabase db reset` reproduces the complete schema locally.

### Before pushing migrations to remote

The baseline represents schema already applied to staging/prod. Before the
next `supabase db push`, mark it as already-applied:

```bash
supabase migration repair --status applied 20260402193700
```

Run once against staging and once against prod. The CI migration jobs
(`migrate-staging.yml`, `migrate-production.yml`) otherwise attempt to
re-apply the baseline and fail on duplicate-object errors.

## Pre-push gate

```bash
npm run --prefix frontend verify    # typecheck + unit tests
```

Never push without a green `verify`. Session 3 adds lint/format/knip.

## Adding a new migration

```bash
supabase migration new <snake_case_description>
#   → opens an empty file in supabase/migrations/<ts>_<name>.sql
supabase db reset                   # verify it applies cleanly from scratch
```

Then update `supabase/tests/*.sql` if the migration changes observable
schema, and run:

```bash
for f in supabase/tests/*.sql; do
  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f "$f"
done
```

## Common Supabase CLI gotchas

- `supabase start` on first boot pulls several GB of Docker images. Allow
  5–10 minutes on a fresh machine.
- Ports 54321–54324 must be free. Use `lsof -i :54321` to find conflicts.
- `supabase db reset` wipes data and re-applies migrations in timestamp
  order, then runs `seed.sql`. It does **not** touch `auth.users` unless
  the seed does.
