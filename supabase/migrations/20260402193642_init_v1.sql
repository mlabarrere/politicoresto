-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260402193642
-- name: init_v1
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
