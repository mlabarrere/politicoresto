begin;

-- ─────────────────────────────────────────────────────────────
-- Weighting worker — phase 1, migration 2/4
--
-- Reference population tables for Deville-Särndal calibration.
-- Versioned by as_of date (K-8: stamp-and-freeze). A poll's snapshots
-- reference a frozen as_of so that landing newer INSEE data does not
-- mutate historical estimates.
--
-- These tables are public-readable (transparency), service-role-write
-- only. Seed data lands in a later migration / seed script.
-- ─────────────────────────────────────────────────────────────

-- 1. Univariate marginals (e.g. sex share, region share).
create table if not exists public.survey_ref_marginal (
  as_of         date        not null,
  dimension     text        not null,
  category      text        not null,
  share         numeric     not null check (share >= 0 and share <= 1),
  source_label  text        not null,
  source_url    text,
  created_at    timestamptz not null default timezone('utc', now()),
  primary key (as_of, dimension, category)
);

comment on table public.survey_ref_marginal is
  'National population shares per univariate dimension, versioned by as_of. Reference for poll reweighting.';

create index if not exists survey_ref_marginal_as_of_idx
  on public.survey_ref_marginal(as_of);

-- 2. Cross-product cells (e.g. age_bucket × sex).
create table if not exists public.survey_ref_cell (
  as_of         date        not null,
  dimensions    text[]      not null,
  categories    text[]      not null,
  share         numeric     not null check (share >= 0 and share <= 1),
  source_label  text        not null,
  source_url    text,
  created_at    timestamptz not null default timezone('utc', now()),
  primary key (as_of, dimensions, categories),
  constraint survey_ref_cell_shape check (array_length(dimensions, 1) = array_length(categories, 1))
);

comment on table public.survey_ref_cell is
  'National population shares for multi-dimensional strata, versioned by as_of.';

create index if not exists survey_ref_cell_as_of_idx
  on public.survey_ref_cell(as_of);

-- 3. Postal-code → INSEE region lookup, used at snapshot-write time
--    to derive region from the user's postal_code.
create table if not exists public.region_by_postal (
  postal_code  text primary key check (postal_code ~ '^[0-9]{5}$'),
  region_code  text not null,
  region_label text not null,
  created_at   timestamptz not null default timezone('utc', now())
);

comment on table public.region_by_postal is
  'Postal code → INSEE region code/label lookup. Seeded from geo.api.gouv.fr.';

-- RLS — public read, service-role only write.
alter table public.survey_ref_marginal enable row level security;
alter table public.survey_ref_cell     enable row level security;
alter table public.region_by_postal    enable row level security;

drop policy if exists ref_marginal_public_read on public.survey_ref_marginal;
create policy ref_marginal_public_read on public.survey_ref_marginal
  for select to anon, authenticated using (true);

drop policy if exists ref_cell_public_read on public.survey_ref_cell;
create policy ref_cell_public_read on public.survey_ref_cell
  for select to anon, authenticated using (true);

drop policy if exists region_by_postal_public_read on public.region_by_postal;
create policy region_by_postal_public_read on public.region_by_postal
  for select to anon, authenticated using (true);

commit;
