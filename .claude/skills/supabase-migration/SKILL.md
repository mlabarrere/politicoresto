---
name: supabase-migration
description: Add or modify a Supabase table, view, function, or policy. Use when touching `supabase/migrations/`, creating a new migration file, adding RLS policies, or regenerating TypeScript types from the DB schema. Covers the full local-first workflow, the Supabase SQL Style Guide, and the remote-push checklist.
---

# supabase-migration — local-first SQL changes

All schema changes go through a migration file. Never edit an applied
migration. Forward-only, additive.

## The one-command workflow

```bash
# 1. scaffold
supabase migration new <snake_case_description>

# 2. edit the generated file in supabase/migrations/<ts>_<name>.sql

# 3. local reset → re-applies all migrations + seed
supabase db reset

# 4. regenerate TS types (optional but recommended when shapes change)
supabase gen types typescript --local > frontend/lib/types/supabase.ts

# 5. verify tests + typecheck
npm run --prefix frontend verify
```

If `db reset` fails, the migration is broken. Fix before committing.

## Required elements for a new table

Every `CREATE TABLE public.<x>` migration MUST include, in the same file:

1. **The table** with `id uuid primary key default gen_random_uuid()`
   (or `generated always as identity` per Supabase SQL style; we use
   `gen_random_uuid()` for consistency with baseline).
2. **Enable RLS**: `alter table public.<x> enable row level security;`
3. **At least one policy**: `create policy "<name>" on public.<x> for
   <select|insert|update|delete> ...`
4. **A comment** on the table if the purpose isn't obvious from the name.
5. **FK columns** named `<singular_referenced>_id` (e.g. `user_id`,
   `election_id`).

A migration that creates a table without RLS will be caught in PR
review and by the Session 4 CI `supabase db lint` step.

## Supabase SQL Style Guide essentials

See `reference/supabase-sql-style.md` for the full guide. Hotkeys:

- lowercase keywords (`create table`, not `CREATE TABLE`)
- snake_case everywhere; no `tbl_` or `camelCase`
- plural tables (`subjects`), singular columns (`subject_id`)
- `id` column uses `gen_random_uuid()` or `generated always as identity`
- ISO 8601 / UTC timestamptz: `timezone('utc', now())`
- No BOM on `.sql` files

## Idempotency rules (project-specific)

The Supabase CLI is rarely perfect at guarding against re-runs across
environments. Our rules:

- **Every `CREATE TRIGGER` preceded by `DROP TRIGGER IF EXISTS`.**
- **Triggers on `user_visibility_settings` must be wrapped in a `DO`
  block checking `relkind = 'r'`** (that object is a VIEW in migration
  `20260416184000`, not a table).
- **`DROP TRIGGER IF EXISTS` on a VIEW also fails** — guard with
  `pg_class` lookup.
- **`CREATE OR REPLACE`** for functions and views.
- **DROP + CREATE** for views whose column types changed.
- **Cast enum literals explicitly**: `'bloc'::public.space_role`.

## Adding a policy

Our policies follow a naming convention: `<scope>_<action>`, where
`<scope>` is one of `public`, `owner`, `moderator`, `authenticated`.

```sql
-- public read
create policy "public_read" on public.<table>
  for select using (true);

-- owner write
create policy "owner_write" on public.<table>
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- authenticated insert
create policy "authenticated_insert" on public.<table>
  for insert with check ((select auth.uid()) is not null);
```

Before adding, ask: **what SQL query should succeed / fail for which
user?** Write the query, run it against the local seed with
`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres`, confirm
the expected outcome. If a policy lets data leak, catch it here — RLS
is the LAST line of defense, not the middle.

## Before pushing migrations to remote

Applied migrations are immutable. Before the CI `migrate-staging.yml`
or `migrate-production.yml` run touches an env:

1. **If this migration already exists on remote** (e.g. baseline pulled
   via `supabase db pull`), mark it applied without re-running:
   ```bash
   supabase migration repair --status applied <timestamp>
   ```
2. **Schema drift check**: `supabase db diff --linked` should show
   nothing unexpected. If it shows DROPs, STOP — someone hand-edited
   the remote schema and your migration will lose their changes.

## Regenerating TypeScript types

Supabase generates `frontend/lib/types/supabase.ts` from the current
schema. Run after any migration that adds/removes columns or changes
return types of functions:

```bash
supabase gen types typescript --local > frontend/lib/types/supabase.ts
```

Commit the regenerated file in the SAME PR as the migration, so types
and schema are always in sync.

## Local testing playbook

After `supabase db reset` succeeds:

1. **Seed user still exists**: `psql ... -c "select email from auth.users;"`
2. **Policy test with an authenticated user** — set role in psql:
   ```sql
   set role authenticated;
   set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
   select * from public.<table>;  -- should return what policy permits
   ```
3. **Anonymous test** — `set role anon;` then the same query. Confirm
   what should and shouldn't be visible.
4. **RLS denial is observable in app logs**: Postgres returns `code:
   "42501"`. `logError(log, err, { event: "db.rls_denied" })` is the
   canonical way to surface these from application code.

## Common pitfalls

- **Forgetting the baseline**: if you write a migration that references
  `public.app_profile`, remember that table is in the baseline
  (`20260402193700_remote_baseline.sql`), not in a numbered named file.
- **`supabase db reset` wipes data**: your local session cookies are
  gone; re-sign in with `test@example.com` / `password123`.
- **Timestamp collisions**: the CLI uses UTC epoch in the filename. If
  two contributors generate migrations the same second, collision is
  possible — rebase + rename the later one.

## See also

- `reference/supabase-sql-style.md` — the full Supabase SQL Style Guide
  condensed for this project.
- `frontend/lib/types/supabase.ts` — regenerated types.
- CLAUDE.md § "Supabase migration rules" — the hard rules the CI lint
  enforces.
