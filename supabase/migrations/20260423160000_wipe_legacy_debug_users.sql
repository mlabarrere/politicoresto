begin;

-- ─────────────────────────────────────────────────────────────
-- DESTRUCTIVE — one-time wipe of legacy debug users.
--
-- Context: at 2026-04-23, production carried 241 user accounts
-- created during debugging sessions. None of them have real
-- demographic profiles, none of them cast real poll votes, and
-- they would skew any future weighting computation. The founder
-- explicitly authorised wiping them (session log, no preserve
-- list requested).
--
-- Scope bound: `created_at < '2026-04-24'` so this migration
-- touches ONLY users that existed when the decision was made.
-- Anyone who signs up on or after 2026-04-24 is safe even if the
-- migration is applied later than expected.
--
-- Cascade chain (verified 2026-04-23 against the live schema):
--   auth.identities / sessions / mfa_factors / oauth_consents /
--   one_time_tokens / oauth_authorizations / webauthn_*
--   app_profile → user_private_political_profile (via app_profile)
--   profile_vote_history
--   survey_respondent_snapshot
--   thread_post (via app_profile.user_id)
--   post_poll, post_poll_option, post_poll_response (via thread_post)
-- All FKs are ON DELETE CASCADE.
--
-- Rollback: impossible. Wiped user rows cannot be reconstructed.
-- This is a deliberate, one-time forward action.
-- ─────────────────────────────────────────────────────────────

do $wipe$
declare
  v_count  integer;
  v_cutoff timestamptz := '2026-04-24 00:00:00+00'::timestamptz;
begin
  select count(*) into v_count
    from auth.users
   where created_at < v_cutoff;

  raise notice 'legacy wipe: % auth.users rows older than % will be deleted', v_count, v_cutoff;

  delete from auth.users where created_at < v_cutoff;

  raise notice 'legacy wipe: deletion complete';
end
$wipe$;

commit;
