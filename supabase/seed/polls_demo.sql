-- Demo-only poll seed.
-- Voluntary panel examples.
-- Not scientific survey data.

with seed_posts as (
  select tp.id as post_item_id, tp.thread_id, row_number() over (order by tp.created_at asc) as rn
  from public.thread_post tp
  where tp.status = 'published'
  order by tp.created_at asc
  limit 5
),
seed_defs as (
  select * from (
    values
      (1, 'Budget 2026: quelle priorite de depense publique en premier?', array['Sante', 'Education', 'Securite', 'Reduction deficit']::text[], interval '24 hours'),
      (2, 'Retention administrative: faut-il allonger la duree maximale ?', array['Oui, pour les cas graves', 'Non, garder la borne actuelle', 'Seulement sous controle du juge']::text[], interval '36 hours'),
      (3, 'Retraites: faut-il suspendre la reforme actuelle ?', array['Oui, suspension immediate', 'Non, maintien du calendrier', 'Pause courte puis ajustement']::text[], interval '18 hours'),
      (4, 'Education: suppressions de postes enseignants en 2026 ?', array['Inacceptable', 'Acceptable si compense numeriquement', 'Acceptable sans reserve']::text[], interval '42 hours'),
      (5, 'RN: credibilite economique avant 2027 ?', array['Credible', 'Pas credible', 'Trop tot pour trancher']::text[], interval '30 hours')
  ) as v(rn, question, options, window_length)
),
poll_upsert as (
  insert into public.post_poll(post_item_id, question, deadline_at, created_by)
  select
    p.post_item_id,
    d.question,
    timezone('utc', now()) + d.window_length,
    tp.created_by
  from seed_posts p
  join seed_defs d on d.rn = p.rn
  join public.thread_post tp on tp.id = p.post_item_id
  on conflict (post_item_id) do update
    set question = excluded.question,
        deadline_at = excluded.deadline_at,
        poll_status = 'open'
  returning post_item_id
),
poll_option_reset as (
  delete from public.post_poll_option o
  using poll_upsert pu
  where o.post_item_id = pu.post_item_id
)
insert into public.post_poll_option(post_item_id, label, sort_order)
select
  p.post_item_id,
  opt.label,
  opt.sort_order
from seed_posts p
join seed_defs d on d.rn = p.rn
cross join lateral (
  select unnest(d.options) as label, generate_subscripts(d.options, 1) - 1 as sort_order
) opt;

-- Fake response mixes to generate low/medium/high representativity cases.
with target_polls as (
  select pp.post_item_id, row_number() over (order by pp.created_at asc) as rn
  from public.post_poll pp
  order by pp.created_at asc
  limit 5
),
option_pick as (
  select o.post_item_id, o.id as option_id, o.sort_order
  from public.post_poll_option o
  where o.is_active = true
),
users_pool as (
  select ap.user_id, row_number() over (order by ap.created_at asc) as rn
  from public.app_profile ap
  limit 240
),
assignments as (
  select
    tp.post_item_id,
    up.user_id,
    case
      when tp.rn = 1 then (up.rn % 4)
      when tp.rn = 2 then case when up.rn % 10 < 5 then 0 when up.rn % 10 < 8 then 1 else 2 end
      when tp.rn = 3 then case when up.rn % 10 < 7 then 0 when up.rn % 10 < 9 then 1 else 2 end
      when tp.rn = 4 then case when up.rn % 10 < 6 then 0 when up.rn % 10 < 9 then 1 else 2 end
      else case when up.rn % 10 < 4 then 0 when up.rn % 10 < 8 then 1 else 2 end
    end as sort_order
  from target_polls tp
  join users_pool up
    on (tp.rn = 1 and up.rn <= 45)
    or (tp.rn = 2 and up.rn <= 30)
    or (tp.rn = 3 and up.rn <= 18)
    or (tp.rn = 4 and up.rn <= 75)
    or (tp.rn = 5 and up.rn <= 180)
),
resolved as (
  select a.post_item_id, a.user_id, op.option_id
  from assignments a
  join option_pick op
    on op.post_item_id = a.post_item_id
   and op.sort_order = a.sort_order
)
insert into public.post_poll_response(post_item_id, option_id, user_id, answered_at)
select r.post_item_id, r.option_id, r.user_id, timezone('utc', now()) - interval '30 minutes'
from resolved r
on conflict (post_item_id, user_id) do update
  set option_id = excluded.option_id,
      answered_at = excluded.answered_at;

select public.recompute_post_poll_snapshot(post_item_id)
from public.post_poll
order by created_at desc
limit 5;
