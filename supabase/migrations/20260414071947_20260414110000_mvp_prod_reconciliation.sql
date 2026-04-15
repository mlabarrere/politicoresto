-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260414071947
-- name: 20260414110000_mvp_prod_reconciliation
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
