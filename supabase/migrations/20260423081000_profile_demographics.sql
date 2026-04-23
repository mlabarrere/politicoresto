-- Profile demographics (DOB + postal code + resolved city) + one-time
-- nudge flag.
--
-- Rationale: the app collects only a username at onboarding, then nudges
-- users to complete a short demographic profile from /me. That data
-- ultimately feeds the poll-weighting stratification (deferred as a named
-- initiative). We split the fields by sensitivity:
--
--   * date_of_birth → user_private_political_profile (strict self-only RLS,
--     never on public profile, minimum age 18 enforced at the RPC layer).
--   * postal_code → user_private_political_profile (same sensitivity —
--     pinpoints home location; we keep it private).
--   * resolved_city → app_profile (coarse, publicly displayable — what
--     the user sees on their own profile header, may later be shown on
--     public profiles).
--   * has_seen_completion_nudge → app_profile (simple boolean flag to
--     avoid re-showing the post-create modal every time).

alter table public.user_private_political_profile
  add column if not exists date_of_birth date,
  add column if not exists postal_code text;

-- 5-digit French postal code (métropole + DOM). Null allowed (not set yet).
alter table public.user_private_political_profile
  add constraint user_private_political_profile_postal_code_format
  check (postal_code is null or postal_code ~ '^[0-9]{5}$');

alter table public.app_profile
  add column if not exists resolved_city text,
  add column if not exists has_seen_completion_nudge boolean not null default false;

-- Narrow RPC for the /me demographics form. Enforces:
--   * auth required
--   * age >= 18 (hard floor; never persist under-18 DOBs)
--   * postal_code 5 digits (checked by constraint too)
-- Writes DOB + postal_code into user_private_political_profile and
-- resolved_city into app_profile (passed in by the server action after
-- the geo.api.gouv.fr round-trip). No stratum is derived here — that's a
-- later concern when poll-weighting lands.
create or replace function public.rpc_update_profile_demographics(
  p_date_of_birth date,
  p_postal_code text,
  p_resolved_city text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  caller uuid := auth.uid();
  age_years integer;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_date_of_birth is null then
    raise exception 'Date of birth required';
  end if;

  age_years := extract(year from age(current_date, p_date_of_birth))::integer;
  if age_years < 18 then
    raise exception 'Minimum age is 18';
  end if;

  if p_postal_code is null or p_postal_code !~ '^[0-9]{5}$' then
    raise exception 'Invalid postal code';
  end if;

  insert into public.user_private_political_profile(user_id, date_of_birth, postal_code)
  values (caller, p_date_of_birth, p_postal_code)
  on conflict (user_id) do update
    set date_of_birth = excluded.date_of_birth,
        postal_code = excluded.postal_code,
        updated_at = timezone('utc', now());

  update public.app_profile
  set resolved_city = p_resolved_city
  where user_id = caller;
end;
$$;

alter function public.rpc_update_profile_demographics(date, text, text) owner to postgres;
grant execute on function public.rpc_update_profile_demographics(date, text, text) to authenticated;

-- Flip the nudge flag once the user dismisses the post-create modal.
create or replace function public.rpc_mark_completion_nudge_seen()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  update public.app_profile
  set has_seen_completion_nudge = true
  where user_id = auth.uid();
end;
$$;

alter function public.rpc_mark_completion_nudge_seen() owner to postgres;
grant execute on function public.rpc_mark_completion_nudge_seen() to authenticated;

-- Read-only view used by /me to decide whether to show the nudge banner.
-- Returns self-only data; no RLS sneak-peek into other users' rows.
create or replace function public.rpc_get_profile_completion()
returns table (
  has_date_of_birth boolean,
  has_postal_code boolean,
  has_seen_completion_nudge boolean
)
language sql
security definer
set search_path to 'public'
as $$
  select
    (upp.date_of_birth is not null) as has_date_of_birth,
    (upp.postal_code is not null) as has_postal_code,
    coalesce(ap.has_seen_completion_nudge, false) as has_seen_completion_nudge
  from public.app_profile ap
  left join public.user_private_political_profile upp on upp.user_id = ap.user_id
  where ap.user_id = auth.uid();
$$;

alter function public.rpc_get_profile_completion() owner to postgres;
grant execute on function public.rpc_get_profile_completion() to authenticated;
