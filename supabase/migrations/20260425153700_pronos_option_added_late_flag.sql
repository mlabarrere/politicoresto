-- Promote the "late option" notion from a fragile time-gap heuristic
-- (`added_at - earliest_added_at > 1s`) to an explicit boolean. The
-- chronological banner on /post/[slug] uses this flag, the SQL
-- notification trigger keeps its 1-minute threshold for actually
-- firing notifs.
--
-- Existing initial options keep `is_late = false` because that's the
-- column default; rpc_add_option flips it to true on every late insert.

alter table public.prono_option
  add column if not exists is_late boolean not null default false;

create or replace function public.rpc_add_option(p_question_id uuid, p_label text)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_question public.prono_question%rowtype;
  v_option_id uuid;
  v_label text;
  v_topic_slug public.citext;
begin
  if not public.is_moderator() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select * into v_question from public.prono_question where id = p_question_id;
  if v_question.id is null then
    raise exception 'Pronostic introuvable' using errcode = 'P0002';
  end if;

  v_label := btrim(coalesce(p_label, ''));
  if v_label = '' then
    raise exception 'Libellé requis' using errcode = '22023';
  end if;

  insert into public.prono_option(question_id, label, sort_order, is_late)
  values (
    p_question_id,
    v_label,
    coalesce((select max(sort_order) + 1 from public.prono_option where question_id = p_question_id), 0),
    true
  )
  returning id into v_option_id;

  select slug into v_topic_slug from public.topic where id = v_question.topic_id;
  insert into public.user_notification(user_id, kind, payload)
  select distinct pb.user_id, 'prono_option_added',
         jsonb_build_object(
           'topic_id', v_question.topic_id,
           'topic_slug', v_topic_slug,
           'option_id', v_option_id,
           'label', v_label
         )
  from public.prono_bet pb
  where pb.question_id = p_question_id;

  perform public.prono_capture_distribution(p_question_id);

  return v_option_id;
end;
$$;

-- Refresh the summary view to surface `is_late` to the frontend.
create or replace view public.v_prono_summary
with (security_invoker = true) as
with option_counts as (
  select po.id as option_id,
         po.question_id,
         po.label,
         po.sort_order,
         po.is_catchall,
         po.is_active,
         po.is_late,
         po.added_at,
         (select count(*) from public.prono_bet pb
            where pb.option_id = po.id and not pb.is_pruned) as bet_count
  from public.prono_option po
),
option_totals as (
  select question_id, sum(bet_count) as total
  from option_counts
  group by question_id
),
option_payload as (
  select oc.question_id,
         jsonb_agg(
           jsonb_build_object(
             'id', oc.option_id,
             'label', oc.label,
             'sort_order', oc.sort_order,
             'is_catchall', oc.is_catchall,
             'is_active', oc.is_active,
             'is_late', oc.is_late,
             'added_at', oc.added_at,
             'bet_count', oc.bet_count,
             'share', case when coalesce(ot.total, 0) = 0
                           then 0
                           else round((oc.bet_count::numeric / ot.total::numeric), 4) end,
             'odds', case when coalesce(ot.total, 0) = 0 or oc.bet_count = 0
                          then null
                          else round((ot.total::numeric / oc.bet_count::numeric), 2) end
           )
           order by oc.sort_order, oc.label
         ) as options,
         coalesce(max(ot.total), 0) as total_bets
  from option_counts oc
  left join option_totals ot on ot.question_id = oc.question_id
  group by oc.question_id
),
my_bets as (
  select question_id, array_agg(option_id) as option_ids
  from public.prono_bet
  where user_id = auth.uid() and not is_pruned
  group by question_id
)
select pq.id as question_id,
       pq.topic_id,
       t.slug as topic_slug,
       t.title,
       t.topic_status,
       pq.question_text,
       pq.allow_multiple,
       pq.requested_by as requested_by_user_id,
       ap.username as requested_by_username,
       ap.display_name as requested_by_display_name,
       coalesce(op.options, '[]'::jsonb) as options,
       coalesce(op.total_bets, 0) as total_bets,
       pq.betting_cutoff_at,
       pr.resolution_kind,
       pr.winning_option_ids,
       pr.void_reason,
       pr.resolution_note,
       pr.resolved_at,
       coalesce(mb.option_ids, '{}'::uuid[]) as current_user_bets,
       pq.created_at,
       pq.updated_at
from public.prono_question pq
join public.topic t on t.id = pq.topic_id
join public.app_profile ap on ap.user_id = pq.requested_by
left join option_payload op on op.question_id = pq.id
left join public.prono_resolution pr on pr.question_id = pq.id
left join my_bets mb on mb.question_id = pq.id;

alter view public.v_prono_summary owner to postgres;
grant select on public.v_prono_summary to anon, authenticated, service_role;
