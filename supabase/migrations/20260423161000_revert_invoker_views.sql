begin;

-- ─────────────────────────────────────────────────────────────
-- Revert of 20260423152000 (v_post_poll_summary invoker flip) and
-- 20260423153000 (other 5 views invoker flip). E2E suite broke
-- because the underlying RLS on thread_post/post_poll/post_poll_option
-- is stricter than the views' intent — the old SECURITY DEFINER
-- behaviour was effectively load-bearing.
--
-- Advisor hygiene (J-1) is deferred to a separate initiative that
-- will FIRST broaden the RLS on the affected tables, THEN flip the
-- views. Doing it the other way around (as this PR tried) produces
-- a surface where authenticated+anon reads silently return empty
-- sets.
--
-- We set security_invoker = false explicitly (instead of dropping
-- the option) so the view's behaviour is unambiguous in later audits.
-- ─────────────────────────────────────────────────────────────

alter view public.v_post_poll_summary       set (security_invoker = false);
alter view public.v_feed_global             set (security_invoker = false);
alter view public.v_thread_detail           set (security_invoker = false);
alter view public.v_thread_posts            set (security_invoker = false);
alter view public.v_post_comments           set (security_invoker = false);
alter view public.user_visibility_settings  set (security_invoker = false);

commit;
