-- Pronos review fixes (PR #61) — three correctness bugs flagged by code
-- review:
--
-- 1. `rpc_request_prono` could be tricked into accepting a single
--    distinct user-supplied option by repeating the same label
--    (`['Oui', 'Oui']`). The `< 2` count was incremented per loop
--    iteration even when `ON CONFLICT DO NOTHING` skipped the insert.
--    Fix: precompute the distinct btrim'd cardinality of `p_options`
--    BEFORE the loop and use that as the validation source. Loop
--    just inserts.
--
-- 2. `rpc_resolve_prono` left `topic.topic_status = 'open'` for the
--    voided branch. UI surfaces keying off the topic status (admin
--    open queue, /pronos open filter, the moderator detail page's
--    `isOpen`, the public PronoDetail render) would misclassify a
--    voided prono as still actionable. Fix: flip the topic to
--    `'archived'` (semantically "closed, no further activity, still
--    readable") on the voided branch. The `prono_resolution.kind`
--    remains the canonical source for "voided vs resolved".
--
-- 3. `rpc_place_bet` for `allow_multiple = false` did a delete-then-
--    upsert with no per-user serialization. Two concurrent requests
--    selecting different options could both pass the delete (each
--    delete sees the other option, removes it; the new one isn't
--    yet inserted) and then both insert successfully because the
--    UNIQUE is `(question, option, user)`. The user ends up with
--    two active bets on a single-choice prono. Fix: take an
--    advisory transaction lock on (question, user) at the top of
--    place_bet AND remove_bet so the critical section is serialized.

create or replace function public.rpc_request_prono(
  p_title text,
  p_question_text text,
  p_options text[],
  p_allow_multiple boolean default false
) returns uuid
  language plpgsql security definer
  set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_topic_id uuid;
  v_thread_post_id uuid;
  v_question_id uuid;
  v_slug public.citext;
  v_label text;
  v_distinct_count integer;
  v_idx integer := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null then
    raise exception 'Titre requis' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_question_text, '')), '') is null then
    raise exception 'Question requise' using errcode = '22023';
  end if;
  if p_options is null or array_length(p_options, 1) is null then
    raise exception 'Au moins deux options requises' using errcode = '22023';
  end if;
  if array_length(p_options, 1) > 8 then
    raise exception 'Pas plus de huit options' using errcode = '22023';
  end if;

  -- Validate distinct count BEFORE the loop. Counts non-empty,
  -- trimmed, case-sensitive distinct entries — the unique constraint
  -- on prono_option(question_id, label) is also case-sensitive.
  select cardinality(
    array(select distinct btrim(opt) from unnest(p_options) opt
          where btrim(opt) <> '')
  ) into v_distinct_count;
  if v_distinct_count < 2 then
    raise exception 'Au moins deux options distinctes requises' using errcode = '22023';
  end if;

  v_slug := public.prono_make_slug(p_title);

  insert into public.topic(slug, title, description, topic_status, visibility, created_by, close_at, thread_kind)
  values (
    v_slug,
    btrim(p_title),
    btrim(p_question_text),
    'pending_review'::public.topic_status,
    'public'::public.visibility_level,
    v_user_id,
    timezone('utc', now()) + interval '180 days',
    'issue'::public.thread_kind
  )
  returning id into v_topic_id;

  insert into public.thread_post(thread_id, type, title, content, created_by, status)
  values (
    v_topic_id,
    'market'::public.thread_post_type,
    btrim(p_title),
    btrim(p_question_text),
    v_user_id,
    'published'::public.thread_post_status
  )
  returning id into v_thread_post_id;

  insert into public.prono_question(topic_id, thread_post_id, requested_by, question_text, allow_multiple)
  values (v_topic_id, v_thread_post_id, v_user_id, btrim(p_question_text), coalesce(p_allow_multiple, false))
  returning id into v_question_id;

  -- Insert options. Duplicates are silently skipped via the unique
  -- constraint; we already validated distinct_count above.
  foreach v_label in array p_options loop
    v_label := btrim(coalesce(v_label, ''));
    if v_label = '' then continue; end if;
    insert into public.prono_option(question_id, label, sort_order, is_catchall)
    values (v_question_id, v_label, v_idx, false)
    on conflict (question_id, label) do nothing;
    v_idx := v_idx + 1;
  end loop;

  insert into public.prono_option(question_id, label, sort_order, is_catchall)
  values (v_question_id, 'Autre', v_idx, true)
  on conflict (question_id, label) do nothing;

  return v_topic_id;
end;
$$;

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
  else
    -- Voided : flip the topic out of 'open' so feeds, the admin queue
    -- and the public PronoDetail no longer treat it as actionable.
    -- The kind/reason live in prono_resolution.
    update public.topic
    set topic_status = 'archived'::public.topic_status,
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

create or replace function public.rpc_place_bet(p_question_id uuid, p_option_id uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_question public.prono_question%rowtype;
  v_topic public.topic%rowtype;
  v_option public.prono_option%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- Serialize concurrent (place_bet | remove_bet) calls per
  -- (question_id, user_id) so single-choice mode can't slip into
  -- two-active-bets races. The lock auto-releases at COMMIT.
  perform pg_advisory_xact_lock(
    hashtextextended(p_question_id::text || ':' || v_user_id::text, 0)
  );

  select * into v_question from public.prono_question where id = p_question_id;
  if v_question.id is null then
    raise exception 'Pronostic introuvable' using errcode = 'P0002';
  end if;
  if v_question.betting_cutoff_at is not null then
    raise exception 'Les paris sont clos' using errcode = '22023';
  end if;

  select * into v_topic from public.topic where id = v_question.topic_id;
  if v_topic.topic_status <> 'open' then
    raise exception 'Le pronostic n''est pas ouvert' using errcode = '22023';
  end if;

  select * into v_option from public.prono_option where id = p_option_id and question_id = p_question_id;
  if v_option.id is null or not v_option.is_active then
    raise exception 'Option indisponible' using errcode = '22023';
  end if;

  if not v_question.allow_multiple then
    delete from public.prono_bet
    where question_id = p_question_id
      and user_id = v_user_id
      and option_id <> p_option_id;
  end if;

  insert into public.prono_bet(question_id, option_id, user_id, bet_at)
  values (p_question_id, p_option_id, v_user_id, timezone('utc', now()))
  on conflict (question_id, option_id, user_id) do update
    set bet_at = excluded.bet_at,
        is_pruned = false;

  perform public.prono_capture_distribution(p_question_id);
end;
$$;

create or replace function public.rpc_remove_bet(p_question_id uuid, p_option_id uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_question public.prono_question%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- Mirror the lock taken by place_bet so a remove + place pair
  -- ordering is preserved across concurrent calls.
  perform pg_advisory_xact_lock(
    hashtextextended(p_question_id::text || ':' || v_user_id::text, 0)
  );

  select * into v_question from public.prono_question where id = p_question_id;
  if v_question.id is null then
    raise exception 'Pronostic introuvable' using errcode = 'P0002';
  end if;
  if v_question.betting_cutoff_at is not null then
    raise exception 'Les paris sont clos' using errcode = '22023';
  end if;

  delete from public.prono_bet
  where question_id = p_question_id
    and user_id = v_user_id
    and option_id = p_option_id;

  perform public.prono_capture_distribution(p_question_id);
end;
$$;
