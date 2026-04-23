begin;

-- ─────────────────────────────────────────────────────────────
-- Weighting worker — phase 1b, migration 1/4
--
-- Helper functions used by submit_post_poll_vote (next migration)
-- to derive snapshot scalars from the private profile.
--
-- All functions are IMMUTABLE or STABLE as appropriate, SECURITY
-- INVOKER (default), with an explicit search_path. They may be
-- safely indexed over, and are cheap for the RPC path.
-- ─────────────────────────────────────────────────────────────

-- 1. Age bucket (INSEE-style 5-category ladder).
create or replace function public.derive_age_bucket(p_dob date)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_dob is null then null
    when extract(year from age(current_date, p_dob))::int <  25 then '18_24'
    when extract(year from age(current_date, p_dob))::int <  35 then '25_34'
    when extract(year from age(current_date, p_dob))::int <  50 then '35_49'
    when extract(year from age(current_date, p_dob))::int <  65 then '50_64'
    else '65_plus'
  end;
$$;

comment on function public.derive_age_bucket(date) is
  'Map DOB to INSEE 5-bucket age ladder. Null-safe. Used at snapshot write.';

-- 2. Region from postal code (via region_by_postal lookup).
create or replace function public.derive_region(p_postal text)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select r.region_code
  from public.region_by_postal r
  where r.postal_code = p_postal;
$$;

comment on function public.derive_region(text) is
  'Map postal code to INSEE region code via region_by_postal. Null if not found.';

-- 3. Past vote at Présidentielle 2022 T1.
--    Returns: candidate_name | 'abstention' | 'blanc' | 'nul' | 'non_inscrit' | 'ne_se_prononce_pas' | null
--    null means "did not declare" — treated as "unknown" at weighting time.
create or replace function public.derive_past_vote_pr1_2022(p_user_id uuid)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when pvh.choice_kind = 'vote' and er.candidate_name is not null then er.candidate_name
    when pvh.choice_kind is not null then pvh.choice_kind::text
    else null
  end
  from public.profile_vote_history pvh
  join public.election e on e.id = pvh.election_id
  left join public.election_result er on er.id = pvh.election_result_id
  where pvh.user_id = p_user_id
    and e.slug = 'presidentielle-2022-t1'
  limit 1;
$$;

comment on function public.derive_past_vote_pr1_2022(uuid) is
  'Self-declared past vote at Présidentielle 2022 T1 via profile_vote_history. Null = not declared.';

-- 4. Latest reference date (stamp-and-freeze anchor).
--    Falls back to current_date if no reference data is seeded yet, so
--    the RPC never fails during local dev before the seed is loaded.
create or replace function public.current_valid_reference_date()
returns date
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    (select max(as_of) from public.survey_ref_marginal),
    current_date
  );
$$;

comment on function public.current_valid_reference_date() is
  'Latest as_of across survey_ref_marginal. Falls back to current_date if unseeded.';

commit;
