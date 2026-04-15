-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260415071439
-- name: forum_prune_drop
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
