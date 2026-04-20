-- Suppression des vues sans consommateur + fix share (ratio → pourcentage).
--
-- Vues droppées : aucune n'est référencée par le frontend.
--   - v_feed_entity       : jamais lue par l'app
--   - v_public_profiles   : jamais lue par l'app
--   - v_topic_public_summary : jamais lue par l'app
--
-- Fix v_post_poll_summary : le champ share était calculé en ratio (0..1),
-- le frontend attend un pourcentage (0..100) pour PollResults.toFixed(1) + width.

begin;

drop view if exists public.v_feed_entity;
drop view if exists public.v_public_profiles;
drop view if exists public.v_topic_public_summary;

create or replace view public.v_post_poll_summary
with (security_invoker = true)
as
with options as (
  select
    o.post_item_id,
    jsonb_agg(
      jsonb_build_object(
        'option_id', o.id,
        'label', o.label,
        'sort_order', o.sort_order
      ) order by o.sort_order
    ) as options_json
  from public.post_poll_option o
  where o.is_active = true
  group by o.post_item_id
),
option_counts as (
  select
    o.post_item_id,
    o.id as option_id,
    o.label,
    o.sort_order,
    count(r.id)::integer as response_count
  from public.post_poll_option o
  left join public.post_poll_response r
    on r.option_id = o.id and r.post_item_id = o.post_item_id
  where o.is_active = true
  group by o.post_item_id, o.id, o.label, o.sort_order
),
poll_totals as (
  select post_item_id, sum(response_count)::integer as sample_size
  from option_counts
  group by post_item_id
),
counts_rolled as (
  select
    oc.post_item_id,
    jsonb_agg(
      jsonb_build_object(
        'option_id', oc.option_id,
        'option_label', oc.label,
        'sort_order', oc.sort_order,
        'response_count', oc.response_count,
        'weighted_count', oc.response_count,
        -- Pourcentage attendu par le front (0..100)
        'share', case
          when coalesce(pt.sample_size, 0) = 0 then 0
          else round(oc.response_count::numeric * 100 / pt.sample_size, 2)
        end
      ) order by oc.sort_order
    ) as results
  from option_counts oc
  left join poll_totals pt on pt.post_item_id = oc.post_item_id
  group by oc.post_item_id
),
my_votes as (
  select r.post_item_id, r.option_id as selected_option_id
  from public.post_poll_response r
  where r.user_id = auth.uid()
)
select
  pp.post_item_id,
  pp.question,
  pp.deadline_at,
  case
    when pp.deadline_at <= timezone('utc', now()) then 'closed'
    else pp.poll_status
  end as poll_status,
  coalesce(pt.sample_size, 0) as sample_size,
  coalesce(pt.sample_size, 0)::numeric as effective_sample_size,
  case when coalesce(pt.sample_size, 0) > 0 then 100 else 0 end::numeric as representativity_score,
  0::numeric as coverage_score,
  0::numeric as distance_score,
  0::numeric as stability_score,
  0::numeric as anti_brigading_score,
  coalesce(cr.results, '[]'::jsonb) as raw_results,
  coalesce(cr.results, '[]'::jsonb) as corrected_results,
  coalesce(opt.options_json, '[]'::jsonb) as options,
  mv.selected_option_id,
  tp.thread_id as post_id,
  top.slug as post_slug,
  top.title as post_title
from public.post_poll pp
join public.thread_post tp on tp.id = pp.post_item_id
join public.topic top on top.id = tp.thread_id
left join options opt on opt.post_item_id = pp.post_item_id
left join counts_rolled cr on cr.post_item_id = pp.post_item_id
left join poll_totals pt on pt.post_item_id = pp.post_item_id
left join my_votes mv on mv.post_item_id = pp.post_item_id
where public.can_read_topic(top.*);

grant select on public.v_post_poll_summary to anon, authenticated;

commit;
