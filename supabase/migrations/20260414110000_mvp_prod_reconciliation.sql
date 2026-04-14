begin;

-- Reconciliation migration after direct prod hotfixing.
-- Goal: keep repo migrations compatible with current production function signatures.

create table if not exists public.poll_response_settings (
  poll_id uuid primary key references public.poll(id) on delete cascade,
  edit_window_minutes integer not null default 30 check (edit_window_minutes between 0 and 10080),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_profile(user_id) on delete set null,
  event_name text not null,
  page_path text,
  entity_type text,
  entity_id uuid,
  session_id text,
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analytics_events_user_idx on public.analytics_events(user_id, occurred_at desc);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name, occurred_at desc);

create or replace function public.rpc_upsert_private_vote_record(
  p_vote_record_id uuid default null,
  p_election_term_id uuid default null,
  p_territory_id uuid default null,
  p_vote_round integer default null,
  p_declared_option_label text default null,
  p_declared_party_term_id uuid default null,
  p_declared_candidate_name text default null,
  p_location_label text default null,
  p_polling_station_label text default null,
  p_vote_context jsonb default '{}'::jsonb
)
returns public.user_declared_vote_record
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.user_declared_vote_record%rowtype;
  current_row public.user_declared_vote_record%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  if nullif(btrim(coalesce(p_declared_option_label, '')), '') is null then
    raise exception 'Declared option label is required';
  end if;

  if p_vote_record_id is null then
    insert into public.user_declared_vote_record(
      user_id,
      election_term_id,
      territory_id,
      vote_round,
      declared_option_label,
      declared_party_term_id,
      declared_candidate_name,
      visibility,
      location_label,
      polling_station_label,
      vote_context
    )
    values (
      public.current_user_id(),
      p_election_term_id,
      p_territory_id,
      p_vote_round,
      btrim(p_declared_option_label),
      p_declared_party_term_id,
      nullif(btrim(coalesce(p_declared_candidate_name, '')), ''),
      'private',
      nullif(btrim(coalesce(p_location_label, '')), ''),
      nullif(btrim(coalesce(p_polling_station_label, '')), ''),
      coalesce(p_vote_context, '{}'::jsonb)
    )
    returning * into result_row;
  else
    select * into current_row
    from public.user_declared_vote_record
    where id = p_vote_record_id;

    if current_row.id is null then
      raise exception 'Vote record not found';
    end if;

    if current_row.user_id <> public.current_user_id() then
      raise exception 'Vote record not owned by current user';
    end if;

    update public.user_declared_vote_record
    set election_term_id = p_election_term_id,
        territory_id = p_territory_id,
        vote_round = p_vote_round,
        declared_option_label = btrim(p_declared_option_label),
        declared_party_term_id = p_declared_party_term_id,
        declared_candidate_name = nullif(btrim(coalesce(p_declared_candidate_name, '')), ''),
        visibility = 'private',
        location_label = nullif(btrim(coalesce(p_location_label, '')), ''),
        polling_station_label = nullif(btrim(coalesce(p_polling_station_label, '')), ''),
        vote_context = coalesce(p_vote_context, '{}'::jsonb),
        updated_at = timezone('utc', now())
    where id = p_vote_record_id
    returning * into result_row;
  end if;

  return result_row;
end;
$$;

-- Compatibility overload kept for environments that were hotfixed with payload + declared_at.
create or replace function public.rpc_upsert_private_vote_record(
  p_vote_record_id uuid default null,
  p_election_term_id uuid default null,
  p_territory_id uuid default null,
  p_vote_round integer default null,
  p_declared_option_label text default null,
  p_declared_party_term_id uuid default null,
  p_declared_candidate_name text default null,
  p_location_label text default null,
  p_polling_station_label text default null,
  p_vote_context jsonb default '{}'::jsonb,
  p_payload jsonb default '{}'::jsonb,
  p_declared_at timestamptz default null
)
returns public.user_declared_vote_record
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.user_declared_vote_record%rowtype;
begin
  result_row := public.rpc_upsert_private_vote_record(
    p_vote_record_id,
    p_election_term_id,
    p_territory_id,
    p_vote_round,
    p_declared_option_label,
    p_declared_party_term_id,
    p_declared_candidate_name,
    p_location_label,
    p_polling_station_label,
    coalesce(p_vote_context, '{}'::jsonb) || coalesce(p_payload, '{}'::jsonb)
  );

  if p_declared_at is not null then
    update public.user_declared_vote_record
    set declared_at = p_declared_at,
        updated_at = timezone('utc', now())
    where id = result_row.id
    returning * into result_row;
  end if;

  return result_row;
end;
$$;

create or replace function public.rpc_record_analytics_event(
  p_event_name text,
  p_page_path text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_session_id text default null,
  p_event_payload jsonb default '{}'::jsonb
)
returns public.analytics_events
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.analytics_events%rowtype;
begin
  if nullif(btrim(coalesce(p_event_name, '')), '') is null then
    raise exception 'Event name is required';
  end if;

  insert into public.analytics_events(
    user_id,
    event_name,
    page_path,
    entity_type,
    entity_id,
    session_id,
    event_payload
  )
  values (
    public.current_user_id(),
    left(btrim(p_event_name), 120),
    nullif(left(coalesce(p_page_path, ''), 300), ''),
    nullif(left(coalesce(p_entity_type, ''), 120), ''),
    p_entity_id,
    nullif(left(coalesce(p_session_id, ''), 200), ''),
    coalesce(p_event_payload, '{}'::jsonb)
  )
  returning * into result_row;

  return result_row;
end;
$$;

revoke all on function public.rpc_upsert_private_vote_record(uuid, uuid, uuid, integer, text, uuid, text, text, text, jsonb, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.rpc_record_analytics_event(text, text, text, uuid, text, jsonb) from public, anon, authenticated;

grant execute on function public.rpc_get_private_political_profile() to authenticated;
grant execute on function public.rpc_upsert_private_political_profile(uuid, uuid, integer, text, jsonb) to authenticated;
grant execute on function public.rpc_delete_private_political_profile() to authenticated;
grant execute on function public.rpc_list_private_vote_history() to authenticated;
grant execute on function public.rpc_upsert_private_vote_record(uuid, uuid, uuid, integer, text, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.rpc_upsert_private_vote_record(uuid, uuid, uuid, integer, text, uuid, text, text, text, jsonb, jsonb, timestamptz) to authenticated;
grant execute on function public.rpc_delete_private_vote_record(uuid) to authenticated;
grant execute on function public.rpc_list_sensitive_consents() to authenticated;
grant execute on function public.rpc_upsert_sensitive_consent(public.consent_type, public.consent_status, text, text) to authenticated;
grant execute on function public.rpc_delete_sensitive_consent(uuid) to authenticated;
grant execute on function public.rpc_update_thread_post(uuid, text, text, jsonb) to authenticated;
grant execute on function public.rpc_delete_thread_post(uuid) to authenticated;
grant execute on function public.rpc_update_comment(uuid, text) to authenticated;
grant execute on function public.rpc_delete_comment(uuid) to authenticated;
grant execute on function public.rpc_set_poll_response_edit_window(uuid, integer) to authenticated;
grant execute on function public.vote_poll(uuid, jsonb) to authenticated;
grant execute on function public.rpc_record_analytics_event(text, text, text, uuid, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
