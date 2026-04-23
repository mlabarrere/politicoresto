begin;

-- ─────────────────────────────────────────────────────────────
-- Weighting worker — phase 1b, migration 5/5
--
-- Extends rpc_update_profile_demographics to accept optional
-- weighting fields (sex, csp, education). Existing 3-arg callers
-- continue to work because the new params have DEFAULT NULL.
--
-- CSP is validated against the INSEE PCS-2020 simplified 8-list
-- at the RPC layer — rejecting unknown values keeps the
-- calibration-time lookup straightforward.
-- ─────────────────────────────────────────────────────────────

-- Drop the old signature first because Postgres overloads functions
-- by arg list — DEFAULT NULL on added params doesn't shadow the
-- original. We recreate below with the same behaviour for the old
-- call sites.
drop function if exists public.rpc_update_profile_demographics(date, text, text);

create or replace function public.rpc_update_profile_demographics(
  p_date_of_birth date,
  p_postal_code   text,
  p_resolved_city text,
  p_sex           text default null,
  p_csp           text default null,
  p_education     text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  caller    uuid := auth.uid();
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

  -- Sex validation — nullable, but if set must be one of {F, M, other}.
  if p_sex is not null and p_sex not in ('F', 'M', 'other') then
    raise exception 'Invalid sex (expected F, M, or other)';
  end if;

  -- Education validation — nullable, but if set must be one of the four ladder rungs.
  if p_education is not null and p_education not in ('none', 'bac', 'bac2', 'bac3_plus') then
    raise exception 'Invalid education';
  end if;

  -- CSP validation — nullable, but if set must be one of INSEE PCS-2020 simplified 8.
  if p_csp is not null and p_csp not in (
    'agriculteurs',
    'artisans_commercants_chefs',
    'cadres_professions_intellectuelles',
    'professions_intermediaires',
    'employes',
    'ouvriers',
    'retraites',
    'sans_activite'
  ) then
    raise exception 'Invalid CSP';
  end if;

  insert into public.user_private_political_profile(user_id, date_of_birth, postal_code, sex, csp, education)
  values (caller, p_date_of_birth, p_postal_code, p_sex, p_csp, p_education)
  on conflict (user_id) do update
    set date_of_birth = excluded.date_of_birth,
        postal_code   = excluded.postal_code,
        sex           = coalesce(excluded.sex,       public.user_private_political_profile.sex),
        csp           = coalesce(excluded.csp,       public.user_private_political_profile.csp),
        education     = coalesce(excluded.education, public.user_private_political_profile.education),
        updated_at    = timezone('utc', now());

  update public.app_profile
     set resolved_city = p_resolved_city
   where user_id = caller;
end;
$$;

comment on function public.rpc_update_profile_demographics(date, text, text, text, text, text) is
  'Writes required (dob, postal, city) + optional (sex, csp, education) demographics. Optional fields that are null in the input do NOT overwrite existing values (partial updates allowed).';

commit;
