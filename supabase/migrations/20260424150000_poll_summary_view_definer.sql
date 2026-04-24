-- Fix (re-fix): v_post_poll_summary sample_size = 1 regardless of real vote count.
--
-- Root cause: `20260422130000_fix_poll_summary_view_security.sql` previously
-- set `security_invoker = false` on `v_post_poll_summary` for exactly this
-- reason — aggregate counts (sample_size, raw_results.*) need to see ALL
-- rows of `post_poll_response`, not just those visible under the owner-only
-- RLS policy. Phase 1b (migration 20260423152000_weighting_view_evolution)
-- then recreated the view from scratch with `with (security_invoker = true)`,
-- silently reverting the earlier fix. Since then every authenticated user
-- sees `sample_size=1`, `response_count=1` on every poll they've voted on,
-- and 0 on every poll they haven't voted on — pleased with their own vote
-- but blind to everyone else's.
--
-- Re-apply the definer setting. Tenancy is still enforced inside the view
-- via `can_read_topic(topic_id)` in the WHERE clause, so no PII leaks.
--
-- E2E covered by frontend/tests/e2e/poll-response.spec.ts
-- ("two voters on two different options produce sample_size=2").

alter view public.v_post_poll_summary set (security_invoker = false);

comment on view public.v_post_poll_summary is
  'Public poll summary — SECURITY DEFINER so sample_size and raw_results reflect the global count (post_poll_response is owner-only RLS). Tenancy enforced via can_read_topic(topic_id) in the WHERE clause.';
