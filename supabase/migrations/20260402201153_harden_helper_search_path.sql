-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260402201153
-- name: harden_helper_search_path
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
