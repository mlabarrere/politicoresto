-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260415100624
-- name: reaction_toggle_rpc_prod_20260415
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
