-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260402194322
-- name: public_views_security_invoker
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
