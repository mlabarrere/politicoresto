begin;

-- Phase 3c — worker-side RPC pour exposer survey_ref_cell.
-- Pendant de weighting_fetch_reference(date) qui couvre les marges 1D.

create or replace function public.weighting_fetch_reference_cells(p_as_of date)
returns table (
  dimensions text[],
  categories text[],
  share      numeric
)
language sql
security definer
set search_path = public
as $$
  select c.dimensions, c.categories, c.share
  from public.survey_ref_cell c
  where c.as_of = p_as_of;
$$;

comment on function public.weighting_fetch_reference_cells(date) is
  'Service-role-only: cellules de référence croisées (age×sex, csp×sex, etc.) à un as_of donné.';

revoke all on function public.weighting_fetch_reference_cells(date) from public;
grant execute on function public.weighting_fetch_reference_cells(date) to service_role;

commit;
