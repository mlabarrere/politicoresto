-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260415092804
-- name: reaction_overload_cleanup_prod_20260415
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
