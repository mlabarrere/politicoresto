begin;

-- ─────────────────────────────────────────────────────────────
-- Advisor hygiene (J-1 / risk R9)
--
-- Converts the 5 remaining SECURITY DEFINER views to SECURITY
-- INVOKER. All of them already read from tables with RLS enabled
-- and policies in place (checked 2026-04-23 against the live
-- advisor report on staging + prod). The flip is a 1-line ALTER
-- that requires no view body rewrite.
--
-- Why this matters: SECURITY DEFINER views execute with the view
-- owner's permissions and bypass the caller's RLS — they are the
-- Supabase advisor's #1 ERROR-level warning. SECURITY INVOKER
-- views apply the caller's RLS on underlying tables, which is the
-- default behaviour since Postgres 15.
--
-- v_post_poll_summary is already invoker (migration 20260423152000).
--
-- If any downstream query fails after this migration, the fix is
-- to add/extend an RLS policy on the underlying table, never to
-- revert to DEFINER.
-- ─────────────────────────────────────────────────────────────

alter view public.v_feed_global             set (security_invoker = true);
alter view public.v_thread_detail           set (security_invoker = true);
alter view public.v_thread_posts            set (security_invoker = true);
alter view public.v_post_comments           set (security_invoker = true);
alter view public.user_visibility_settings  set (security_invoker = true);

-- Re-affirm grants — no-op if already present, safe to re-run.
grant select on public.v_feed_global            to anon, authenticated;
grant select on public.v_thread_detail          to anon, authenticated;
grant select on public.v_thread_posts           to anon, authenticated;
grant select on public.v_post_comments          to anon, authenticated;
grant select on public.user_visibility_settings to anon, authenticated;

commit;
