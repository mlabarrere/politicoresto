-- Simplification radicale : polls + suppression du code mort
--
-- Contexte : l'écriture d'un vote (submit_post_poll_vote) déclenchait
-- recompute_post_poll_snapshot qui, pour un poll de N réponses, exécutait :
--   - UPDATE weight sur les N lignes post_poll_response
--   - 2 sous-requêtes latérales par réponse (ideology_declared, profile_status)
--   - INSERT snapshot avec ~8 scores
-- => coût O(N²) par vote, pour un MVP avec N=0. On drop.
--
-- Par ailleurs :
--   - refresh_public_read_models() a pour corps "select;" et est déclenchée
--     par des triggers sur post/topic à chaque write. Pure dead code.
--   - validate_topic_visibility() référence public.space qui n'existe pas ;
--     c'est une bombe à retardement (toute INSERT topic avec space_id<>null
--     raise "function effective_space_visibility does not exist").
--
-- Vitesse : supprime 100% du write-amplifier poll + overhead trigger
--           sur chaque insert/update/delete post/topic.
-- Sécurité : RLS inchangée. Les vues deviennent plus petites, auditables.
--            submit_post_poll_vote reste SECURITY DEFINER + auth check.

begin;

-- 1. Triggers de refresh (dead code : la fn cible est "select;")
drop trigger if exists refresh_public_read_models_after_post_write on public.post;
drop trigger if exists refresh_public_read_models_after_topic_write on public.topic;
drop function if exists private.trigger_refresh_public_read_models();
drop function if exists public.refresh_public_read_models();

-- 2. Trigger de validation cassé (référence public.space qui n'existe pas)
drop trigger if exists validate_topic_visibility_before_write on public.topic;
drop function if exists public.validate_topic_visibility();

-- Idem pour poll si présent
drop function if exists public.validate_poll_visibility() cascade;

-- 3. Kill de la stratification poll non utilisée
--    La vue v_post_poll_summary dépend de post_poll_snapshot → CREATE OR REPLACE
--    avant le DROP.
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
  -- Un count par option (sort_order préservé)
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
        'share', case
          when coalesce(pt.sample_size, 0) = 0 then 0
          else oc.response_count::numeric / pt.sample_size
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
  -- Placeholders : scores de stratification retirés. On affiche 100 si
  -- l'échantillon est non vide (le front ignore pour l'instant les autres
  -- scores ; ils restent exposés à 0 pour compat schema).
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

-- 4. Drop des fonctions qui dépendent du snapshot AVANT la table.
--    submit_post_poll_vote retourne post_poll_snapshot%rowtype → drop d'abord.
drop function if exists public.submit_post_poll_vote(uuid, uuid);
drop function if exists public.recompute_post_poll_snapshot(uuid);
drop function if exists public.poll_bucket_for_user(uuid, text);
drop table if exists public.post_poll_snapshot;
drop table if exists public.post_poll_target_distribution;

-- 5. Rewrite submit_post_poll_vote : upsert simple + RETURN la vue
--    → 1 round-trip au lieu de 2 (pas de refetch côté app).

create or replace function public.submit_post_poll_vote(
  p_post_item_id uuid,
  p_option_id uuid
)
returns setof public.v_post_poll_summary
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  poll_row public.post_poll%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- Validation poll (existe + ouvert)
  select * into poll_row from public.post_poll where post_item_id = p_post_item_id;
  if poll_row.post_item_id is null then
    raise exception 'Poll not found';
  end if;
  if poll_row.poll_status <> 'open' or poll_row.deadline_at <= timezone('utc', now()) then
    raise exception 'Poll is closed';
  end if;

  -- Validation option appartient au poll et active
  if not exists (
    select 1 from public.post_poll_option o
    where o.id = p_option_id
      and o.post_item_id = p_post_item_id
      and o.is_active = true
  ) then
    raise exception 'Option not found for this poll';
  end if;

  -- Upsert de la réponse (1 vote par user par poll)
  insert into public.post_poll_response(post_item_id, option_id, user_id)
  values (p_post_item_id, p_option_id, auth.uid())
  on conflict (post_item_id, user_id) do update
    set option_id = excluded.option_id,
        answered_at = timezone('utc', now());

  -- Retourne directement le résumé pour éviter un refetch côté client
  return query
    select * from public.v_post_poll_summary v
    where v.post_item_id = p_post_item_id;
end;
$$;

revoke all on function public.submit_post_poll_vote(uuid, uuid) from public;
grant execute on function public.submit_post_poll_vote(uuid, uuid) to authenticated;

commit;
