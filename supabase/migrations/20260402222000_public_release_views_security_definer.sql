begin;

-- These release-critical public views expose curated aggregates only.
-- Keeping them as owner-executed views avoids granting anon access to raw
-- prediction submission rows while preserving frontend compatibility.
alter view public.v_home_feed_topics set (security_invoker = false);
alter view public.v_topic_public_summary set (security_invoker = false);
alter view public.v_topic_prediction_aggregate set (security_invoker = false);
alter view public.v_territory_rollup_prediction_activity set (security_invoker = false);

commit;
