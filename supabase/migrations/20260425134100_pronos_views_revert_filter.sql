-- Revert v_thread_detail to its pre-pronos status filter (only the
-- four "live" statuses). The feed view is rebuilt without the extra
-- WHERE clause; the previous migration's outer filter caused the
-- planner to compute row_number() before pruning, which sometimes
-- timed out on the home feed query.
--
-- The pending_review / rejected pronos remain reachable from
-- /post/[slug] because `getPostDetail` now queries `public.topic`
-- directly for the topic-level row instead of going through
-- v_thread_detail. Comments + thread_post + feed continue to flow
-- through the existing views unchanged.

drop view if exists public.v_feed_global cascade;
drop view if exists public.v_thread_detail cascade;

create view public.v_thread_detail as
with thread_post_rollup as (
  select tp.thread_id,
    (count(*))::integer as thread_post_count,
    (count(*) filter (where tp.type = 'article'::public.thread_post_type))::integer as article_post_count,
    max(tp.created_at) as latest_thread_post_at
  from public.thread_post tp
  where tp.status = 'published'::public.thread_post_status
  group by tp.thread_id
)
select t.id,
  t.space_id,
  t.slug,
  t.title,
  t.description,
  t.topic_status,
  public.effective_topic_visibility(t.*) as effective_visibility,
  t.open_at,
  t.close_at,
  t.created_at,
  t.entity_id,
  pe.slug as entity_slug,
  pe.name as entity_name,
  null::public.citext as space_slug,
  null::text as space_name,
  (pe.slug)::text as space_role,
  coalesce(tpr.thread_post_count, 0) as visible_post_count,
  coalesce(tpr.thread_post_count, 0) as thread_post_count,
  tpr.latest_thread_post_at,
  round(((coalesce(tpr.thread_post_count, 0))::numeric * 0.05), 6) as thread_score,
  'recent_activity'::text as feed_reason_code,
  'Remonte car la discussion est active.'::text as feed_reason_label,
  case
    when t.topic_status = 'resolved'::public.topic_status then 'resolved'::text
    when t.topic_status = 'archived'::public.topic_status then 'archived'::text
    when t.topic_status = 'locked'::public.topic_status then 'locked'::text
    else 'open'::text
  end as derived_lifecycle_state,
  false as is_sensitive,
  (pe.slug)::text as primary_taxonomy_slug,
  case
    when pe.slug operator(public.=) any (array['lfi'::public.citext, 'lfi-nfp'::public.citext, 'pcf'::public.citext, 'gdr'::public.citext, 'ges'::public.citext, 'rev'::public.citext, 'peps'::public.citext]) then 'Gauche radicale a gauche'::text
    when pe.slug operator(public.=) any (array['ps'::public.citext, 'eelv'::public.citext, 'prg'::public.citext, 'dvg'::public.citext, 'soc'::public.citext, 'ecos'::public.citext]) then 'Gauche a centre gauche'::text
    when pe.slug operator(public.=) any (array['re'::public.citext, 'modem'::public.citext, 'prv'::public.citext, 'dvc'::public.citext, 'hor'::public.citext, 'epr'::public.citext, 'dem'::public.citext]) then 'Centre gauche a centre droit'::text
    when pe.slug operator(public.=) any (array['lr'::public.citext, 'udi'::public.citext, 'dvd'::public.citext, 'dr'::public.citext, 'udr'::public.citext]) then 'Centre droit a droite'::text
    when pe.slug operator(public.=) any (array['rn'::public.citext, 'rec'::public.citext, 'dlf'::public.citext, 'laf'::public.citext, 'idl'::public.citext]) then 'Droite a extreme droite'::text
    else 'Forum'::text
  end as primary_taxonomy_label
from public.topic t
  left join thread_post_rollup tpr on tpr.thread_id = t.id
  left join public.political_entity pe on pe.id = t.entity_id
where t.topic_status = any (array['open'::public.topic_status, 'locked'::public.topic_status, 'resolved'::public.topic_status, 'archived'::public.topic_status])
  and public.effective_topic_visibility(t.*) = 'public'::public.visibility_level;

alter view public.v_thread_detail owner to postgres;

create view public.v_feed_global as
select id as topic_id,
  slug as topic_slug,
  title as topic_title,
  description as topic_description,
  topic_status,
  derived_lifecycle_state,
  effective_visibility as visibility,
  is_sensitive,
  space_id,
  space_slug,
  space_name,
  primary_taxonomy_slug,
  primary_taxonomy_label,
  '{}'::jsonb as aggregate_payload,
  jsonb_build_object('visible_post_count', visible_post_count, 'time_label', concat('Cloture le ', to_char(close_at, 'YYYY-MM-DD'::text))) as metrics_payload,
  jsonb_build_object('excerpt_type', 'thread', 'excerpt_title', title, 'excerpt_text', coalesce(description, 'Discussion politique ouverte.'::text), 'excerpt_created_at', latest_thread_post_at) as discussion_payload,
  null::jsonb as card_payload,
  '{}'::jsonb as resolution_payload,
  latest_thread_post_at as last_activity_at,
  open_at,
  close_at,
  null::timestamp with time zone as resolve_deadline_at,
  null::timestamp with time zone as resolved_at,
  visible_post_count,
  thread_score as activity_score_raw,
  (0)::numeric as freshness_score_raw,
  (0)::numeric as participation_score_raw,
  (0)::numeric as resolution_proximity_score_raw,
  (0)::numeric as editorial_priority_score_raw,
  (0)::numeric as shift_score_raw,
  thread_score as editorial_feed_score,
  feed_reason_code,
  feed_reason_label,
  (row_number() over (order by thread_score desc, latest_thread_post_at desc nulls last, created_at desc))::integer as editorial_feed_rank,
  '{}'::jsonb as topic_card_payload,
  entity_id,
  entity_slug,
  entity_name,
  space_role,
  thread_post_count,
  latest_thread_post_at,
  thread_score
from public.v_thread_detail td;

alter view public.v_feed_global owner to postgres;

grant select on public.v_thread_detail to anon, authenticated, service_role;
grant select on public.v_feed_global to anon, authenticated, service_role;
