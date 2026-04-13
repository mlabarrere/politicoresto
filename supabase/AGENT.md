# AGENT.md

## Target architecture
- `supabase/` is the authoritative business layer for permissions, scoring, moderation, taxonomy, territorial aggregation, and gamification.
- `frontend/` must stay thin. It may call RPCs and read views but must not duplicate business rules.
- Sensitive multi-table mutations go through SQL RPC or narrowly scoped `SECURITY DEFINER` functions.

## Invariants
- `space_type` is structural only: `geographic`, `institutional`, `thematic`, `editorial`.
- Ideology, judicial context, and electoral nature belong to taxonomy, never to `space_type`.
- `topic` is the primary durable object and owns exactly one `prediction_question` in v1.
- `post` cannot be orphaned.
- `post` has no standalone visibility field; effective visibility derives from parent objects.
- `poll` must belong to a `topic` or a `space`.
- Vote history is normalized in `user_declared_vote_record`, not stored as `jsonb`.

## Security rules
- Enable RLS on every `public` table.
- Index every column that appears in RLS predicates or parent-visibility joins.
- Never expose raw sensitive profile data, raw submissions, audit logs, or abuse signals publicly.
- Every `SECURITY DEFINER` function must set `search_path` explicitly.
- Do not add custom password auth or custom auth tables. Supabase Auth with external OAuth providers only.

## Migration strategy
- Preserve the monolithic v1 migration as the foundation.
- Favor `create or replace`, `if not exists`, and upsert-based seeds for reconstructibility.
- Keep macro taxonomy and macro territory seeds in the migration; place larger territorial payloads in `supabase/seed/`.
- Any change to RLS or RPC must update tests in the same patch.

## Dependency policy
- Prefer official PostgreSQL and Supabase primitives.
- Avoid client-side or backend-side duplication of validation, scoring, or access control.
- Introduce extensions only when they are standard and justified.

## Review checklist
- Does the change preserve parent-child visibility inheritance?
- Is every new public table protected by RLS?
- Are critical mutations auditable?
- Are sensitive political attributes still owner-only by default?
- Is the frontend prevented from reimplementing logic already enforced by SQL?

## MCP and platform guidance
- Use official Supabase project tooling for resets, migrations, and auth inspection.
- Use the official Supabase ↔ Vercel integration for environment synchronization.
- OAuth client IDs, secrets, and redirect URLs belong in Supabase project configuration, not in SQL.
