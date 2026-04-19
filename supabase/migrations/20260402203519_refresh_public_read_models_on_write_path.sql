-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260402203519
-- name: refresh_public_read_models_on_write_path
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
