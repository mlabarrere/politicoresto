-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260415225509
-- name: post_poll_mvp_prod_compat
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
