-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260402201451
-- name: enable_rls_with_explicit_public_read_policies
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
