-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260414091407
-- name: 20260414111500_mvp_prod_reconciliation_grants_fix
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
