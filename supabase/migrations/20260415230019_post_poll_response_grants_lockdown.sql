-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260415230019
-- name: post_poll_response_grants_lockdown
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
