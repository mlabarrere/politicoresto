-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260402195155
-- name: public_release_views_security_definer
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
