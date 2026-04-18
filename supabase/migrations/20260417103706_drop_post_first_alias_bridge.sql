-- placeholder migration to reconcile remote Supabase migration history
-- version: 20260417103706
-- name: drop_post_first_alias_bridge
-- rationale: this version exists in remote history and must be present locally for CI history checks.

begin;
select 1;
commit;
