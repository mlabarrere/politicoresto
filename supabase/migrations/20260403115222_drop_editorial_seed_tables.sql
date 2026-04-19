-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260403115222
-- name: drop_editorial_seed_tables
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
