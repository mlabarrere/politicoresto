begin;

create table if not exists public.topic_public_summary_cache
as
select *
from public.v_topic_public_summary
with no data;

create table if not exists public.topic_prediction_aggregate_cache
as
select *
from public.v_topic_prediction_aggregate
with no data;

create table if not exists public.territory_prediction_rollup_cache
as
select *
from public.v_territory_rollup_prediction_activity
with no data;

create table if not exists public.home_feed_topic_cache
as
select *
from public.v_home_feed_topics
with no data;

alter table public.topic_public_summary_cache
  add constraint topic_public_summary_cache_pkey primary key (id);

alter table public.topic_prediction_aggregate_cache
  add constraint topic_prediction_aggregate_cache_pkey primary key (topic_id);

alter table public.territory_prediction_rollup_cache
  add constraint territory_prediction_rollup_cache_pkey primary key (territory_id);

alter table public.home_feed_topic_cache
  add constraint home_feed_topic_cache_pkey primary key (topic_id);

create unique index if not exists home_feed_topic_cache_rank_idx
  on public.home_feed_topic_cache (editorial_feed_rank);

insert into public.topic_public_summary_cache
select *
from public.v_topic_public_summary;

insert into public.topic_prediction_aggregate_cache
select *
from public.v_topic_prediction_aggregate;

insert into public.territory_prediction_rollup_cache
select *
from public.v_territory_rollup_prediction_activity;

insert into public.home_feed_topic_cache
select *
from public.v_home_feed_topics;

drop view if exists public.v_home_feed_topics;
drop view if exists public.v_feed_topic_scored;
drop view if exists public.v_feed_topic_signals;
drop view if exists public.v_feed_topic_base;
drop view if exists public.v_topic_public_summary;
drop view if exists public.v_topic_prediction_aggregate;
drop view if exists public.v_territory_rollup_prediction_activity;

revoke all on table public.topic_public_summary_cache from public;
revoke all on table public.topic_prediction_aggregate_cache from public;
revoke all on table public.territory_prediction_rollup_cache from public;
revoke all on table public.home_feed_topic_cache from public;

revoke all on table public.topic_public_summary_cache from anon, authenticated;
revoke all on table public.topic_prediction_aggregate_cache from anon, authenticated;
revoke all on table public.territory_prediction_rollup_cache from anon, authenticated;
revoke all on table public.home_feed_topic_cache from anon, authenticated;

grant select on public.topic_public_summary_cache to anon, authenticated;
grant select on public.topic_prediction_aggregate_cache to anon, authenticated;
grant select on public.territory_prediction_rollup_cache to anon, authenticated;
grant select on public.home_feed_topic_cache to anon, authenticated;

revoke all on function public.log_audit_event(public.audit_entity_type, uuid, text, jsonb) from public;
revoke all on function public.log_audit_event(public.audit_entity_type, uuid, text, jsonb) from anon, authenticated;

revoke all on function public.compute_prediction_normalized_score(uuid, uuid) from public;
revoke all on function public.compute_prediction_normalized_score(uuid, uuid) from anon, authenticated;

revoke all on function public.award_card(uuid, uuid, public.card_grant_reason_type, public.audit_entity_type, uuid, jsonb) from public;
revoke all on function public.award_card(uuid, uuid, public.card_grant_reason_type, public.audit_entity_type, uuid, jsonb) from anon, authenticated;

revoke all on function public.resolve_topic(uuid, text, boolean, date, numeric, uuid, integer, public.resolution_source_type, text, text, text) from public;
revoke all on function public.resolve_topic(uuid, text, boolean, date, numeric, uuid, integer, public.resolution_source_type, text, text, text) from anon, authenticated;

revoke all on function public.refresh_territory_closure() from public;
revoke all on function public.refresh_territory_closure() from anon, authenticated;

revoke all on function public.rpc_apply_moderation_action(public.moderation_target_type, uuid, public.moderation_action_type, text) from public;
revoke all on function public.rpc_apply_moderation_action(public.moderation_target_type, uuid, public.moderation_action_type, text) from anon, authenticated;

commit;
