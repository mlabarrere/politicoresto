# Supabase Postgres SQL Style Guide — condensed

Upstream: https://supabase.com/docs/guides/getting-started/ai-prompts/code-format-sql

## Identifiers

- **lowercase keywords**: `create table`, `select`, `where` — NEVER uppercase.
- **snake_case** for every identifier: tables, columns, functions, policies.
- **plural tables**: `subjects`, `elections`, `thread_posts`.
- **singular columns**: `subject_id`, `election_id`, `created_at`.
- **No `tbl_` / `v_` / `fn_` prefixes.** View prefix `v_` is tolerated in
  this project because baseline uses it for generated views; don't add
  new ones with that prefix — use plain naming.
- **Foreign keys**: `<singular_referenced>_id`. `user_id`, not `fk_user`.

## Primary keys

Either of:
- `id uuid primary key default gen_random_uuid()` — this project's default
- `id bigint generated always as identity primary key` — Supabase guide's
  preferred for tables not cross-referenced from JWT `sub`.

Use UUID when the PK must be generatable client-side or when it's the
`sub` of a JWT (e.g. `auth.users.id`).

## Dates and times

- Always `timestamptz`, never `timestamp`.
- Store UTC: `default timezone('utc', now())`.
- Dates in constraint literals follow ISO 8601: `'2026-04-20T12:00:00Z'`.

## Comments

- Non-obvious tables SHOULD have a comment:
  ```sql
  comment on table public.profile_vote_history is
    'Private per-user vote history, used for poll weighting';
  ```
- Non-obvious columns too.
- Obvious ones (`email`, `created_at`) don't need comments.

## Policies

- One policy per intent, named `<scope>_<action>`:
  - `public_read`, `owner_write`, `authenticated_insert`, `moderator_update`
- Use `(select auth.uid())` not `auth.uid()` inside policy expressions —
  Postgres caches the subselect across rows, massively faster.

## Triggers

- Name: `<verb>_<object>_<when>`: `set_updated_at_before_update`.
- Always `drop trigger if exists ... on <table>` before `create trigger`.
- Wrap in `do $$ ... $$` blocks if the trigger target might not exist
  yet (e.g. the relation is a VIEW in this project's baseline).

## Functions

- `security definer` for functions that perform privileged actions
  (admin operations); `security invoker` (default) otherwise.
- `set search_path = ''` for every `security definer` function (prevents
  privilege escalation via search_path hijacking).
- Return types explicit; no `returns setof record`.

## Files and file encoding

- Filename: `<YYYYMMDDhhmmss>_<snake_case_description>.sql`.
- **No BOM.** `head -c 3 file.sql | xxd` should show `7b 20 20` or
  similar ASCII, never `ef bb bf`.
- Trailing newline.
- Use `begin;` / `commit;` for multi-statement migrations that should
  roll back atomically on failure.

## What the Supabase guide says that we deviate from, with reason

| Guide says | We do | Reason |
|---|---|---|
| `generated always as identity` for PKs | `gen_random_uuid()` | Baseline schema came from staging where UUIDs were chosen; keep one convention in the codebase. |
| View prefix `v_` discouraged | `v_feed_global`, `v_thread_posts`, etc. | Inherited from baseline; renaming would break app code. New objects should not use `v_`. |

## Project migration rules layered on top

(From `CLAUDE.md § Supabase migration rules`.)

- Every `CREATE TRIGGER` preceded by `DROP TRIGGER IF EXISTS`.
- Triggers on `user_visibility_settings` wrapped in `DO` block checking
  `relkind = 'r'` (it becomes a VIEW in migration `20260416184000`).
- `DROP TRIGGER IF EXISTS` on a VIEW also fails — guard with `pg_class`
  lookup.
- `CREATE OR REPLACE` for functions and views.
- DROP + CREATE for views whose column types changed.
- Cast enum literals explicitly: `'bloc'::public.space_role`.
