-- Cleanup: remove all abandoned features from the schema.
-- Drops: territory, cards/gamification, predictions, reputation,
--        moderation, anti_abuse, audit_log, space_scope, post_revision, user_consent.
-- Keeps: user_private_political_profile, user_declared_vote_record, space,
--        polls, posts, topics, taxonomy, app_profile.

begin;

-- =========================================================
-- 1. DROP VIEWS (CASCADE to remove all dependents at once)
-- =========================================================

drop view if exists public.v_territory_rollup_topic_count cascade;
drop view if exists public.v_territory_rollup_prediction_activity cascade;
drop view if exists public.v_topic_prediction_aggregate cascade;
drop view if exists public.v_my_prediction_history cascade;
drop view if exists public.v_my_reputation_summary cascade;
drop view if exists public.v_my_card_inventory cascade;
drop view if exists public.v_public_user_card_showcase cascade;
drop view if exists public.v_moderation_queue cascade;
drop view if exists public.v_abuse_signals_recent cascade;
drop view if exists public.v_resolution_audit_trail cascade;

-- Feed views chain that references dead tables/enums
drop view if exists public.v_feed_topic_base cascade;
drop view if exists public.v_feed_topic_signals cascade;
drop view if exists public.v_feed_topic_scored cascade;
drop view if exists public.v_home_feed_topics cascade;
drop view if exists public.v_feed_global cascade;
drop view if exists public.v_feed_entity cascade;
drop view if exists public.v_feed_global_post cascade;

-- Summary views referencing dead tables
drop view if exists public.v_topic_public_summary cascade;
drop view if exists public.v_public_profiles cascade;

-- =========================================================
-- 2. DROP TRIGGERS ON DEAD TABLES (pre-drop safety)
-- =========================================================

drop trigger if exists validate_prediction_submission_before_write on public.prediction_submission;
drop trigger if exists snapshot_prediction_submission_after_write on public.prediction_submission;
drop trigger if exists capture_post_revision_before_update on public.post;

-- =========================================================
-- 3. DROP DEAD FUNCTIONS
-- =========================================================

drop function if exists public.refresh_territory_closure() cascade;
drop function if exists public.rpc_submit_prediction(uuid, boolean, date, numeric, uuid, integer, text) cascade;
drop function if exists public.rpc_create_topic_with_prediction(uuid, text, text, text, public.visibility_level, timestamptz, public.prediction_type, text, public.prediction_scoring_method, public.prediction_aggregation_method) cascade;
drop function if exists public.rpc_report_content(public.moderation_target_type, uuid, text, text) cascade;
drop function if exists public.rpc_apply_moderation_action(public.moderation_target_type, uuid, public.moderation_action_type, text) cascade;
drop function if exists public.resolve_topic(uuid, text, boolean, date, numeric, uuid, integer, public.resolution_source_type, text, text, text) cascade;
drop function if exists public.validate_prediction_submission() cascade;
drop function if exists public.snapshot_prediction_submission() cascade;
drop function if exists public.capture_post_revision() cascade;
drop function if exists public.place_bet(uuid, uuid, boolean, date, numeric, uuid, integer, text) cascade;
drop function if exists public.rpc_record_consent(public.consent_type, public.consent_status, text, text) cascade;

-- =========================================================
-- 4. DROP DEAD TABLES (CASCADE removes FKs + RLS policies)
-- =========================================================

-- Territory
drop table if exists public.topic_territory_link cascade;
drop table if exists public.territory_closure cascade;
drop table if exists public.territory_reference cascade;

-- Cards / gamification
drop table if exists public.card_grant_event cascade;
drop table if exists public.user_card_inventory cascade;
drop table if exists public.card_rule cascade;
drop table if exists public.card_catalog cascade;
drop table if exists public.card_family cascade;

-- Predictions
drop table if exists public.prediction_score_event cascade;
drop table if exists public.prediction_submission_history cascade;
drop table if exists public.prediction_submission cascade;
drop table if exists public.prediction_option cascade;
drop table if exists public.topic_resolution_source cascade;
drop table if exists public.topic_resolution cascade;
drop table if exists public.prediction_question cascade;

-- Reputation
drop table if exists public.reputation_ledger cascade;

-- Moderation
drop table if exists public.moderation_action cascade;
drop table if exists public.moderation_report cascade;

-- Anti-abuse / audit
drop table if exists public.anti_abuse_signal cascade;
drop table if exists public.audit_log cascade;

-- Post versioning
drop table if exists public.post_revision cascade;

-- RGPD consent
drop table if exists public.user_consent cascade;

-- Space scoping
drop table if exists public.space_scope cascade;

-- =========================================================
-- 5. DROP DEAD COLUMNS FROM KEPT TABLES
-- =========================================================

alter table public.app_profile drop column if exists public_territory_id;
alter table public.topic drop column if exists primary_territory_id;

-- user_visibility_settings is a VIEW on remote, a TABLE on local (init).
-- Only run ALTER TABLE when it is a base table.
do $$ begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'user_visibility_settings'
      and c.relkind = 'r'
  ) then
    alter table public.user_visibility_settings drop column if exists territory_visibility;
    alter table public.user_visibility_settings drop column if exists card_inventory_visibility;
  end if;
end $$;

-- =========================================================
-- 6. DROP DEAD ENUMS
-- =========================================================

drop type if exists public.territory_level cascade;
drop type if exists public.card_family_type cascade;
drop type if exists public.prediction_type cascade;
drop type if exists public.prediction_scoring_method cascade;
drop type if exists public.prediction_aggregation_method cascade;
drop type if exists public.moderation_target_type cascade;
drop type if exists public.moderation_action_type cascade;
drop type if exists public.resolution_source_type cascade;
drop type if exists public.audit_entity_type cascade;

-- =========================================================
-- 7. RECREATE CLEAN v_public_profiles (no territory join)
-- =========================================================

create or replace view public.v_public_profiles as
select ap.user_id, ap.display_name, ap.bio, ap.created_at
from public.app_profile ap
where ap.profile_status = 'active'
  and ap.is_public_profile_enabled = true;

-- =========================================================
-- 8. RECREATE CLEAN v_topic_public_summary (no predictions)
-- =========================================================

create or replace view public.v_topic_public_summary as
select
  t.id,
  t.space_id,
  t.slug,
  t.title,
  t.description,
  t.topic_status,
  public.effective_topic_visibility(t) as effective_visibility,
  t.open_at,
  t.close_at,
  t.created_at,
  count(distinct p.id) filter (where p.post_status = 'visible') as visible_post_count
from public.topic t
left join public.post p on p.topic_id = t.id
where t.topic_status in ('open', 'locked', 'resolved', 'archived')
  and public.effective_topic_visibility(t) = 'public'
group by t.id;

-- =========================================================
-- 9. RECREATE v_feed_global (null::text instead of enum cast)
-- v_thread_detail already exists from 20260416184000 without
-- any prediction/territory dependencies.
-- =========================================================

create or replace view public.v_feed_global as
select
  td.id                                         as topic_id,
  td.slug                                       as topic_slug,
  td.title                                      as topic_title,
  td.description                                as topic_description,
  td.topic_status,
  td.derived_lifecycle_state,
  td.effective_visibility                       as visibility,
  td.is_sensitive,
  td.space_id,
  td.space_slug,
  td.space_name,
  td.primary_taxonomy_slug,
  td.primary_taxonomy_label,
  null::text                                    as prediction_type,
  null::text                                    as prediction_question_title,
  '{}'::jsonb                                   as aggregate_payload,
  jsonb_build_object(
    'visible_post_count', td.visible_post_count,
    'time_label', concat('Cloture le ', to_char(td.close_at, 'YYYY-MM-DD'))
  )                                             as metrics_payload,
  jsonb_build_object(
    'excerpt_type',       'thread',
    'excerpt_title',      td.title,
    'excerpt_text',       coalesce(td.description, 'Discussion politique ouverte.'),
    'excerpt_created_at', td.latest_thread_post_at
  )                                             as discussion_payload,
  null::jsonb                                   as card_payload,
  '{}'::jsonb                                   as resolution_payload,
  td.latest_thread_post_at                      as last_activity_at,
  td.open_at,
  td.close_at,
  null::timestamptz                             as resolve_deadline_at,
  null::timestamptz                             as resolved_at,
  td.visible_post_count,
  0::integer                                    as active_prediction_count,
  td.thread_score                               as activity_score_raw,
  0::numeric                                    as freshness_score_raw,
  0::numeric                                    as participation_score_raw,
  0::numeric                                    as resolution_proximity_score_raw,
  0::numeric                                    as editorial_priority_score_raw,
  0::numeric                                    as shift_score_raw,
  td.thread_score                               as editorial_feed_score,
  td.feed_reason_code,
  td.feed_reason_label,
  row_number() over (
    order by td.thread_score desc,
             td.latest_thread_post_at desc nulls last,
             td.created_at desc
  )::integer                                    as editorial_feed_rank,
  '{}'::jsonb                                   as topic_card_payload,
  td.entity_id,
  td.entity_slug,
  td.entity_name,
  td.space_role,
  td.thread_post_count,
  td.latest_thread_post_at,
  td.thread_score
from public.v_thread_detail td;

create or replace view public.v_feed_entity as
select * from public.v_feed_global where entity_id is not null;

-- =========================================================
-- 10. UPDATE GRANTS
-- =========================================================

grant select on public.v_public_profiles to anon, authenticated;
grant select on public.v_topic_public_summary, public.v_poll_public_results to anon, authenticated;
grant select on public.v_feed_global, public.v_feed_entity to anon, authenticated;

commit;
