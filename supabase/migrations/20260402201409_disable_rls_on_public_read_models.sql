-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260402201409
-- name: disable_rls_on_public_read_models
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
