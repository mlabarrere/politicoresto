-- Pronos lot 4 — record per-bet sentinelle metadata at resolution time.
--
-- The retroactive banner on /post/[slug] needs to surface for losing
-- bettors too: "you picked X, 88% had picked Y, ×1.1 multiplier — you
-- would have earned 11 points if you had been right". Without this
-- the banner can only render for winners (the only ones with a
-- reputation_ledger entry).
--
-- Two new columns on `prono_bet`, written by `rpc_resolve_prono`:
--   * multiplier        : the smoothed sentinelle multiplier (capped ×5).
--   * smoothed_share    : the lissée share used for the multiplier.
--   * is_winner         : convenience flag (option_id ∈ winning_option_ids).
--
-- `reputation_ledger` keeps its winners-only semantics — it stays a
-- generic event log shared with other features (post_participation, …).

alter table public.prono_bet
  add column if not exists multiplier numeric,
  add column if not exists smoothed_share numeric,
  add column if not exists is_winner boolean;

-- Replace rpc_resolve_prono with the version that fills the new columns
-- and keeps the ledger inserts unchanged (winners with positive points).
create or replace function public.rpc_resolve_prono(
  p_question_id uuid,
  p_resolution_kind text,
  p_winning_option_ids uuid[] default null,
  p_betting_cutoff_at timestamp with time zone default null,
  p_resolution_note text default null,
  p_void_reason text default null
) returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_question public.prono_question%rowtype;
  v_topic public.topic%rowtype;
  v_cutoff timestamp with time zone;
  v_active_options integer;
  v_topic_slug public.citext;
  v_bet_rec record;
  v_snapshot record;
  v_smoothed numeric;
  v_multiplier numeric;
  v_points integer;
  v_prior numeric;
  v_smoothing_strength constant numeric := 10;
  v_share_floor constant numeric := 0.05;
  v_multiplier_cap constant numeric := 5;
  v_points_per_unit constant integer := 10;
begin
  v_user_id := auth.uid();
  if not public.is_moderator() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_resolution_kind not in ('resolved', 'voided') then
    raise exception 'resolution_kind invalide' using errcode = '22023';
  end if;

  select * into v_question from public.prono_question where id = p_question_id;
  if v_question.id is null then
    raise exception 'Pronostic introuvable' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.prono_resolution where question_id = p_question_id) then
    raise exception 'Pronostic déjà résolu' using errcode = '22023';
  end if;

  select * into v_topic from public.topic where id = v_question.topic_id;
  if v_topic.topic_status <> 'open' then
    raise exception 'Le pronostic doit être ouvert' using errcode = '22023';
  end if;

  v_cutoff := coalesce(p_betting_cutoff_at, timezone('utc', now()));

  if p_resolution_kind = 'resolved' then
    if p_winning_option_ids is null or array_length(p_winning_option_ids, 1) is null then
      raise exception 'Options gagnantes requises' using errcode = '22023';
    end if;
    if not v_question.allow_multiple and array_length(p_winning_option_ids, 1) > 1 then
      raise exception 'Une seule option gagnante autorisée' using errcode = '22023';
    end if;
    if exists (
      select 1 from unnest(p_winning_option_ids) wid
      where wid not in (select id from public.prono_option where question_id = p_question_id)
    ) then
      raise exception 'Option gagnante hors du pronostic' using errcode = '22023';
    end if;
  else
    if nullif(btrim(coalesce(p_void_reason, '')), '') is null then
      raise exception 'Raison d''annulation requise' using errcode = '22023';
    end if;
  end if;

  update public.prono_question
  set betting_cutoff_at = v_cutoff,
      updated_at = timezone('utc', now())
  where id = p_question_id;

  update public.prono_bet
  set is_pruned = true
  where question_id = p_question_id and bet_at > v_cutoff;

  insert into public.prono_resolution(question_id, resolution_kind, winning_option_ids, void_reason, resolution_note, resolved_by)
  values (
    p_question_id,
    p_resolution_kind,
    case when p_resolution_kind = 'resolved' then p_winning_option_ids else null end,
    case when p_resolution_kind = 'voided' then btrim(p_void_reason) else null end,
    nullif(btrim(coalesce(p_resolution_note, '')), ''),
    v_user_id
  );

  if p_resolution_kind = 'resolved' then
    select count(*) into v_active_options from public.prono_option
      where question_id = p_question_id and is_active;
    v_prior := case when v_active_options > 0 then 1.0::numeric / v_active_options else 0.5 end;

    for v_bet_rec in
      select pb.id, pb.user_id, pb.option_id, pb.bet_at,
             (pb.option_id = any (p_winning_option_ids)) as is_winner
      from public.prono_bet pb
      where pb.question_id = p_question_id and not pb.is_pruned
    loop
      select share, total_bets
        into v_snapshot
      from public.prono_distribution_snapshot
      where question_id = p_question_id
        and option_id = v_bet_rec.option_id
        and captured_at <= v_bet_rec.bet_at
      order by captured_at desc
      limit 1;

      if v_snapshot is null then
        v_smoothed := v_prior;
      else
        v_smoothed := (v_snapshot.share * v_snapshot.total_bets + v_prior * v_smoothing_strength)
                    / (v_snapshot.total_bets + v_smoothing_strength);
      end if;

      v_multiplier := least(v_multiplier_cap, 1.0 / greatest(v_share_floor, v_smoothed));
      v_points := case when v_bet_rec.is_winner
                       then round(v_multiplier * v_points_per_unit)::integer
                       else 0 end;

      -- Persist sentinelle metadata on the bet row itself (independent
      -- of the ledger) so the retroactive banner renders for losers too.
      update public.prono_bet
      set multiplier = v_multiplier,
          smoothed_share = v_smoothed,
          is_winner = v_bet_rec.is_winner
      where id = v_bet_rec.id;

      if v_points > 0 then
        insert into public.reputation_ledger(user_id, event_type, delta, reference_entity_type, reference_entity_id, metadata)
        values (
          v_bet_rec.user_id,
          'prediction_accuracy'::public.reputation_event_type,
          v_points,
          'prono_question',
          p_question_id,
          jsonb_build_object(
            'option_id', v_bet_rec.option_id,
            'multiplier', v_multiplier,
            'smoothed_share', v_smoothed,
            'bet_at', v_bet_rec.bet_at
          )
        );
      end if;
    end loop;

    update public.topic
    set topic_status = 'resolved'::public.topic_status,
        updated_at = timezone('utc', now())
    where id = v_question.topic_id;
  end if;

  v_topic_slug := v_topic.slug;
  insert into public.user_notification(user_id, kind, payload)
  select distinct pb.user_id,
    case when p_resolution_kind = 'resolved' then 'prono_resolved' else 'prono_voided' end,
    jsonb_build_object('topic_id', v_question.topic_id, 'topic_slug', v_topic_slug)
  from public.prono_bet pb
  where pb.question_id = p_question_id;
end;
$$;

-- Replace v_prono_user_history so the multiplier / share fields come
-- from prono_bet (works for losers + winners). points_earned still
-- comes from the ledger join (NULL for losers).
create or replace view public.v_prono_user_history
with (security_invoker = true) as
select pb.user_id,
       pb.question_id,
       pq.topic_id,
       t.slug as topic_slug,
       t.title,
       po.id as option_id,
       po.label as option_label,
       po.is_catchall,
       pb.bet_at,
       pb.is_pruned,
       pr.resolution_kind,
       pr.winning_option_ids,
       pr.resolved_at,
       coalesce(pb.is_winner, po.id = any (pr.winning_option_ids)) as was_correct,
       rl.delta as points_earned,
       pb.multiplier,
       pb.smoothed_share
from public.prono_bet pb
join public.prono_question pq on pq.id = pb.question_id
join public.topic t on t.id = pq.topic_id
join public.prono_option po on po.id = pb.option_id
left join public.prono_resolution pr on pr.question_id = pb.question_id
left join public.reputation_ledger rl
  on rl.user_id = pb.user_id
 and rl.event_type = 'prediction_accuracy'
 and rl.reference_entity_type = 'prono_question'
 and rl.reference_entity_id = pb.question_id
 and (rl.metadata ->> 'option_id')::uuid = pb.option_id;

alter view public.v_prono_user_history owner to postgres;
grant select on public.v_prono_user_history to anon, authenticated, service_role;
