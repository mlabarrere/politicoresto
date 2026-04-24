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
-- FK handling: several references are ``ON DELETE NO ACTION``
-- (post_poll.created_by, topic.created_by, post_revision.editor_user_id,
-- post.author_user_id). For each, we clear the dependent rows before
-- deleting the auth users. This cascades naturally via the existing
-- CASCADE FKs on thread_post / post_poll / post_poll_option /
-- post_poll_response / survey_respondent_snapshot /
-- user_private_political_profile / profile_vote_history /
-- app_profile. Everything that references a legacy user goes away
-- with that user.
--
-- Rollback: impossible. Wiped user rows cannot be reconstructed.
-- This is a deliberate, one-time forward action.
-- ─────────────────────────────────────────────────────────────

do $wipe$
declare
  v_count  integer;
  v_cutoff timestamptz := '2026-04-24 00:00:00+00'::timestamptz;
  v_topics int;
  v_posts  int;
  v_polls  int;
begin
  select count(*) into v_count from auth.users where created_at < v_cutoff;
  raise notice 'legacy wipe: % auth.users rows older than % will be deleted',
    v_count, v_cutoff;

  -- 1. Delete post_poll rows owned by legacy users (FK: no action).
  --    This cascades to post_poll_option + post_poll_response.
  delete from public.post_poll pp
   using public.app_profile ap, auth.users au
   where pp.created_by = ap.user_id
     and ap.user_id   = au.id
     and au.created_at < v_cutoff;
  get diagnostics v_polls = row_count;
  raise notice 'legacy wipe: deleted % post_poll rows', v_polls;

  -- 2. Delete post_revision rows written by legacy editors.
  delete from public.post_revision pr
   using auth.users au
   where pr.editor_user_id = au.id and au.created_at < v_cutoff;

  -- 3. Delete thread_post / post rows authored by legacy users.
  --    thread_post.created_by FK cascades on delete from app_profile,
  --    but post.author_user_id does not. Clear post first.
  delete from public.post p
   using auth.users au
   where p.author_user_id = au.id and au.created_at < v_cutoff;
  get diagnostics v_posts = row_count;
  raise notice 'legacy wipe: deleted % post rows', v_posts;

  -- 4. Delete topics created by legacy users (FK: no action).
  delete from public.topic t
   using auth.users au
   where t.created_by = au.id and au.created_at < v_cutoff;
  get diagnostics v_topics = row_count;
  raise notice 'legacy wipe: deleted % topic rows', v_topics;

  -- 5. Finally, delete the auth users. All remaining FK refs
  --    (app_profile, user_private_political_profile,
  --    profile_vote_history, survey_respondent_snapshot, …) are
  --    ON DELETE CASCADE and will unwind automatically.
  delete from auth.users where created_at < v_cutoff;
  raise notice 'legacy wipe: deletion complete';
end
$wipe$;

commit;
