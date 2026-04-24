-- Fix: `current_valid_reference_date()` was `select max(as_of)`,
-- which on a DB carrying both a legacy placeholder (few dims) and the
-- real INSEE seed (all dims) picks the placeholder when it happens to
-- be the newest date. Symptom observed on staging: a `2022-04-15`
-- placeholder with 4 partial dims dominated the `2021-01-01` INSEE
-- seed (11 complete dims), and the pipeline ran with only age/sex/
-- education marginals — degrading every correction to ~no-op.
--
-- New contract: pick the `as_of` with the MOST distinct dimensions.
-- Ties broken by most recent date. This matches editorial intent:
-- use the richest reference frame available. A placeholder with few
-- dims will never win against the full INSEE seed.
--
-- Kept stable + search_path = public for PostgREST exposure.

create or replace function public.current_valid_reference_date()
returns date
language sql
stable
set search_path = public, pg_temp
as $$
  with per_as_of as (
    select as_of, count(distinct dimension) as n_dims
    from public.survey_ref_marginal
    group by as_of
  )
  select coalesce(
    (select as_of from per_as_of order by n_dims desc, as_of desc limit 1),
    current_date
  );
$$;

comment on function public.current_valid_reference_date() is
  'Returns the as_of with the greatest dimension coverage in survey_ref_marginal. Ties broken by recency. Falls back to current_date when the table is empty.';
