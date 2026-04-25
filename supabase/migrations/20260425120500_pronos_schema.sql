-- Pronostics — schema, RLS, RPCs, triggers, views.
--
-- See `.claude/plans/tu-es-charg-d-impl-menter-humble-popcorn.md` for the
-- full feature spec. v0.1 covers `categorical_closed` pronos only, with
-- moderator-driven publication / resolution and a sentinelle multiplier
-- computed at resolution time (smoothed N=10, capped ×5).
--
-- The new `topic_status` values 'pending_review' / 'rejected' come from
-- the preceding migration; PostgreSQL forbids a single transaction from
-- both adding an enum value and using it eagerly.

-- ────────────────────────────────────────────────────────────────────────
-- 1. reputation_ledger — referenced by legacy code paths but never
-- materialized. Pronostics is the first feature actually writing to it.

create table if not exists public.reputation_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  event_type public.reputation_event_type not null,
  delta integer not null,
  reference_entity_type text not null,
  reference_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists reputation_ledger_user_idx
  on public.reputation_ledger (user_id, created_at desc);
create index if not exists reputation_ledger_event_idx
  on public.reputation_ledger (event_type, created_at desc);

alter table public.reputation_ledger enable row level security;

-- Public, additive history. RLS keeps writes locked down to RPCs.
drop policy if exists reputation_ledger_public_read on public.reputation_ledger;
create policy reputation_ledger_public_read on public.reputation_ledger
  for select using (true);

grant select on public.reputation_ledger to anon, authenticated;
grant all on public.reputation_ledger to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 2. user_notification — minimal in-app notification spine.

create table if not exists public.user_notification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists user_notification_user_unread_idx
  on public.user_notification (user_id, is_read, created_at desc);

alter table public.user_notification enable row level security;

drop policy if exists user_notification_self_read on public.user_notification;
create policy user_notification_self_read on public.user_notification
  for select using (user_id = auth.uid());

drop policy if exists user_notification_self_update on public.user_notification;
create policy user_notification_self_update on public.user_notification
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, update on public.user_notification to authenticated;
grant all on public.user_notification to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 3. Prono tables.

create table public.prono_question (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null unique references public.topic(id) on delete cascade,
  thread_post_id uuid unique references public.thread_post(id) on delete set null,
  requested_by uuid not null references public.app_profile(user_id) on delete cascade,
  question_text text not null check (length(btrim(question_text)) between 1 and 500),
  betting_cutoff_at timestamp with time zone,
  allow_multiple boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index prono_question_requested_by_idx on public.prono_question (requested_by);

create table public.prono_option (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.prono_question(id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 120),
  sort_order integer not null default 0,
  is_catchall boolean not null default false,
  added_at timestamp with time zone not null default timezone('utc', now()),
  is_active boolean not null default true,
  unique (question_id, label)
);

create index prono_option_question_idx on public.prono_option (question_id, sort_order);

create table public.prono_bet (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.prono_question(id) on delete cascade,
  option_id uuid not null references public.prono_option(id) on delete cascade,
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  bet_at timestamp with time zone not null default timezone('utc', now()),
  is_pruned boolean not null default false,
  unique (question_id, option_id, user_id)
);

create index prono_bet_question_idx on public.prono_bet (question_id, bet_at);
create index prono_bet_user_idx on public.prono_bet (user_id, bet_at desc);

create table public.prono_distribution_snapshot (
  id bigserial primary key,
  question_id uuid not null references public.prono_question(id) on delete cascade,
  option_id uuid not null references public.prono_option(id) on delete cascade,
  share numeric not null check (share between 0 and 1),
  total_bets integer not null check (total_bets >= 0),
  active_options_count integer not null check (active_options_count > 0),
  captured_at timestamp with time zone not null default timezone('utc', now())
);

create index prono_distribution_snapshot_lookup_idx
  on public.prono_distribution_snapshot (question_id, option_id, captured_at desc);

create table public.prono_resolution (
  question_id uuid primary key references public.prono_question(id) on delete cascade,
  resolution_kind text not null check (resolution_kind in ('resolved', 'voided')),
  winning_option_ids uuid[],
  void_reason text,
  resolution_note text,
  resolved_by uuid not null references public.app_profile(user_id),
  resolved_at timestamp with time zone not null default timezone('utc', now())
);

-- ────────────────────────────────────────────────────────────────────────
-- 4. RLS — public reads on prono_question/option/resolution; bets are
-- self-only until resolution, then public.

alter table public.prono_question enable row level security;
alter table public.prono_option enable row level security;
alter table public.prono_bet enable row level security;
alter table public.prono_distribution_snapshot enable row level security;
alter table public.prono_resolution enable row level security;

drop policy if exists prono_question_public_read on public.prono_question;
create policy prono_question_public_read on public.prono_question
  for select using (
    exists (
      select 1 from public.topic t
      where t.id = prono_question.topic_id
        and public.can_read_topic(t.*)
    )
  );

drop policy if exists prono_question_modo_write on public.prono_question;
create policy prono_question_modo_write on public.prono_question
  for update using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists prono_option_public_read on public.prono_option;
create policy prono_option_public_read on public.prono_option
  for select using (
    exists (
      select 1
      from public.prono_question pq
      join public.topic t on t.id = pq.topic_id
      where pq.id = prono_option.question_id
        and public.can_read_topic(t.*)
    )
  );

drop policy if exists prono_option_modo_write on public.prono_option;
create policy prono_option_modo_write on public.prono_option
  for update using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists prono_bet_self_or_resolved_read on public.prono_bet;
create policy prono_bet_self_or_resolved_read on public.prono_bet
  for select using (
    user_id = auth.uid()
    or public.is_moderator()
    or exists (
      select 1 from public.prono_resolution pr
      where pr.question_id = prono_bet.question_id
    )
  );

drop policy if exists prono_resolution_public_read on public.prono_resolution;
create policy prono_resolution_public_read on public.prono_resolution
  for select using (
    exists (
      select 1
      from public.prono_question pq
      join public.topic t on t.id = pq.topic_id
      where pq.id = prono_resolution.question_id
        and public.can_read_topic(t.*)
    )
  );

grant select on public.prono_question to anon, authenticated;
grant select on public.prono_option to anon, authenticated;
grant select on public.prono_bet to authenticated;
grant select on public.prono_resolution to anon, authenticated;
grant all on public.prono_question, public.prono_option, public.prono_bet,
              public.prono_distribution_snapshot, public.prono_resolution
       to service_role;

-- prono_distribution_snapshot is internal; no select grant for clients.

-- ────────────────────────────────────────────────────────────────────────
-- 5. Helper — slug generation aligned on the existing pattern in
-- rpc_create_post_full (kept private, not exposed to the API).

create or replace function public.prono_make_slug(p_title text)
returns public.citext
language sql immutable
as $$
  select (lower(regexp_replace(
    regexp_replace(
      coalesce(p_title, 'prono') || '-' || substr(gen_random_uuid()::text, 1, 8),
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '(^-+|-+$)', '', 'g'
  )))::public.citext;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- 6. RPCs.

-- 6.1 — request_prono : a regular user submits a betting question. Lands
-- the topic in `pending_review`; a moderator decides next.
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
  v_label_count integer := 0;
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
  if p_options is null or array_length(p_options, 1) is null or array_length(p_options, 1) < 2 then
    raise exception 'Au moins deux options requises' using errcode = '22023';
  end if;
  if array_length(p_options, 1) > 8 then
    raise exception 'Pas plus de huit options' using errcode = '22023';
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

  -- Insert each user-supplied option, deduplicating empties; the catch-all
  -- "Autre" goes last and is flagged is_catchall=true.
  foreach v_label in array p_options loop
    v_label := btrim(coalesce(v_label, ''));
    if v_label = '' then continue; end if;
    insert into public.prono_option(question_id, label, sort_order, is_catchall)
    values (v_question_id, v_label, v_idx, false)
    on conflict (question_id, label) do nothing;
    v_idx := v_idx + 1;
    v_label_count := v_label_count + 1;
  end loop;

  if v_label_count < 2 then
    raise exception 'Au moins deux options distinctes requises' using errcode = '22023';
  end if;

  insert into public.prono_option(question_id, label, sort_order, is_catchall)
  values (v_question_id, 'Autre', v_idx, true)
  on conflict (question_id, label) do nothing;

  return v_topic_id;
end;
$$;

alter function public.rpc_request_prono(text, text, text[], boolean) owner to postgres;
grant execute on function public.rpc_request_prono(text, text, text[], boolean)
  to authenticated, service_role;

-- 6.2 — publish : moderator accepts a pending request.
create or replace function public.rpc_publish_prono(p_topic_id uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_question public.prono_question%rowtype;
  v_topic public.topic%rowtype;
begin
  if not public.is_moderator() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select * into v_topic from public.topic where id = p_topic_id;
  if v_topic.id is null then
    raise exception 'Topic not found' using errcode = 'P0002';
  end if;
  if v_topic.topic_status <> 'pending_review' then
    raise exception 'Le topic doit être en attente de validation' using errcode = '22023';
  end if;

  select * into v_question from public.prono_question where topic_id = p_topic_id;
  if v_question.id is null then
    raise exception 'Pronostic introuvable pour ce topic' using errcode = 'P0002';
  end if;

  update public.topic
  set topic_status = 'open'::public.topic_status,
      updated_at = timezone('utc', now())
  where id = p_topic_id;

  insert into public.user_notification(user_id, kind, payload)
  values (
    v_question.requested_by,
    'prono_published',
    jsonb_build_object('topic_id', p_topic_id, 'topic_slug', v_topic.slug, 'title', v_topic.title)
  );
end;
$$;

alter function public.rpc_publish_prono(uuid) owner to postgres;
grant execute on function public.rpc_publish_prono(uuid) to authenticated, service_role;

-- 6.3 — reject : moderator dismisses a pending request.
create or replace function public.rpc_reject_prono(p_topic_id uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_topic public.topic%rowtype;
  v_question public.prono_question%rowtype;
begin
  if not public.is_moderator() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Raison requise' using errcode = '22023';
  end if;

  select * into v_topic from public.topic where id = p_topic_id;
  if v_topic.id is null or v_topic.topic_status <> 'pending_review' then
    raise exception 'Le topic doit être en attente de validation' using errcode = '22023';
  end if;

  select * into v_question from public.prono_question where topic_id = p_topic_id;

  update public.topic
  set topic_status = 'rejected'::public.topic_status,
      locked_reason = btrim(p_reason),
      updated_at = timezone('utc', now())
  where id = p_topic_id;

  if v_question.requested_by is not null then
    insert into public.user_notification(user_id, kind, payload)
    values (
      v_question.requested_by,
      'prono_rejected',
      jsonb_build_object('topic_id', p_topic_id, 'topic_slug', v_topic.slug, 'reason', btrim(p_reason))
    );
  end if;
end;
$$;

alter function public.rpc_reject_prono(uuid, text) owner to postgres;
grant execute on function public.rpc_reject_prono(uuid, text) to authenticated, service_role;

-- 6.4 — Internal helper: snapshot the full distribution after every bet
-- mutation, so resolve_prono can look up `share at bet_at`.
create or replace function public.prono_capture_distribution(p_question_id uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_total integer;
  v_active integer;
begin
  select count(*) into v_total from public.prono_bet where question_id = p_question_id;
  select count(*) into v_active from public.prono_option where question_id = p_question_id and is_active;

  if v_active = 0 then return; end if;

  insert into public.prono_distribution_snapshot(question_id, option_id, share, total_bets, active_options_count)
  select p_question_id,
         po.id,
         case when v_total = 0 then 0::numeric
              else (count(pb.id))::numeric / v_total::numeric end,
         v_total,
         v_active
  from public.prono_option po
  left join public.prono_bet pb
    on pb.question_id = po.question_id and pb.option_id = po.id
  where po.question_id = p_question_id and po.is_active
  group by po.id;
end;
$$;

alter function public.prono_capture_distribution(uuid) owner to postgres;

-- 6.5 — place_bet
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

alter function public.rpc_place_bet(uuid, uuid) owner to postgres;
grant execute on function public.rpc_place_bet(uuid, uuid) to authenticated, service_role;

-- 6.6 — remove_bet
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

alter function public.rpc_remove_bet(uuid, uuid) owner to postgres;
grant execute on function public.rpc_remove_bet(uuid, uuid) to authenticated, service_role;

-- 6.7 — add_option : moderator adds a late option to a published prono.
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

  insert into public.prono_option(question_id, label, sort_order)
  values (p_question_id, v_label,
    coalesce((select max(sort_order) + 1 from public.prono_option where question_id = p_question_id), 0))
  returning id into v_option_id;

  -- Notify every distinct user who already placed a bet.
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

  -- Refresh the snapshot so the new option is visible to the next bet.
  perform public.prono_capture_distribution(p_question_id);

  return v_option_id;
end;
$$;

alter function public.rpc_add_option(uuid, text) owner to postgres;
grant execute on function public.rpc_add_option(uuid, text) to authenticated, service_role;

-- 6.8 — resolve_prono : the meaty one. Atomically:
--   * inserts prono_resolution
--   * sets betting_cutoff_at on the question
--   * marks bets after cutoff as pruned
--   * for resolved (not voided): computes smoothed multipliers and writes
--     reputation_ledger entries
--   * flips the topic status
--   * pushes notifications to every bettor
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

alter function public.rpc_resolve_prono(uuid, text, uuid[], timestamp with time zone, text, text)
  owner to postgres;
grant execute on function public.rpc_resolve_prono(uuid, text, uuid[], timestamp with time zone, text, text)
  to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 7. Views.

create or replace view public.v_prono_summary
with (security_invoker = true) as
with option_counts as (
  select po.id as option_id,
         po.question_id,
         po.label,
         po.sort_order,
         po.is_catchall,
         po.is_active,
         po.added_at,
         (select count(*) from public.prono_bet pb
            where pb.option_id = po.id and not pb.is_pruned) as bet_count
  from public.prono_option po
),
option_totals as (
  select question_id,
         sum(bet_count) as total
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

-- v_prono_leaderboard — global ranking by precision percentage.
-- precision_pct = sum(delta) / (bets_count * max_points_per_bet).
create or replace view public.v_prono_leaderboard
with (security_invoker = true) as
with bets as (
  select pb.user_id,
         count(*) filter (where not pb.is_pruned and pr.question_id is not null) as bets_count,
         count(*) filter (where pb.option_id = any (pr.winning_option_ids) and not pb.is_pruned) as wins_count
  from public.prono_bet pb
  join public.prono_resolution pr on pr.question_id = pb.question_id
  where pr.resolution_kind = 'resolved'
  group by pb.user_id
),
points as (
  select user_id, sum(delta)::integer as total_score
  from public.reputation_ledger
  where event_type = 'prediction_accuracy'
    and reference_entity_type = 'prono_question'
  group by user_id
)
select b.user_id,
       ap.username,
       ap.display_name,
       coalesce(p.total_score, 0) as total_score,
       (b.bets_count * 50) as total_max_possible,
       case when b.bets_count = 0 then 0
            else round((coalesce(p.total_score, 0)::numeric / (b.bets_count * 50)::numeric) * 100, 2)
       end as precision_pct,
       b.bets_count,
       b.wins_count,
       (rank() over (order by coalesce(p.total_score, 0) desc, b.wins_count desc, ap.username))::integer as rank
from bets b
join public.app_profile ap on ap.user_id = b.user_id
left join points p on p.user_id = b.user_id
where ap.is_public_profile_enabled
order by rank
limit 100;

alter view public.v_prono_leaderboard owner to postgres;
grant select on public.v_prono_leaderboard to anon, authenticated, service_role;

-- v_prono_user_history — per-user history; consumed on /me/pronos and on
-- public profile pages.
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
       (po.id = any (pr.winning_option_ids)) as was_correct,
       rl.delta as points_earned,
       (rl.metadata ->> 'multiplier')::numeric as multiplier,
       (rl.metadata ->> 'smoothed_share')::numeric as smoothed_share
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
