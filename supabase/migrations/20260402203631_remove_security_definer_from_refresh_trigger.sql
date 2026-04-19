-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260402203631
-- name: remove_security_definer_from_refresh_trigger
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
