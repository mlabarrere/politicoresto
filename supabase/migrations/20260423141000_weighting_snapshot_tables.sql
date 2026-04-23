begin;

-- ─────────────────────────────────────────────────────────────
-- Weighting worker — phase 1, migration 3/4
--
-- Three tables that hold the weighting pipeline's state:
--
--   survey_respondent_snapshot: frozen demographic profile at vote
--       time. Written atomically by submit_post_poll_vote (next
--       migration). Immutable after insert — later profile edits
--       never retroactively change past votes.
--
--   survey_poll_weights: one row per respondent per recompute cycle,
--       overwritten on every worker run.
--
--   survey_poll_estimate: one row per poll — the last computation's
--       output, consumed by v_post_poll_summary.
-- ─────────────────────────────────────────────────────────────

-- 1. Respondent snapshot — written atomically with the vote, never
--    updated. RLS: self-read only.
create table if not exists public.survey_respondent_snapshot (
  id                  uuid        primary key default gen_random_uuid(),
  poll_id             uuid        not null references public.post_poll(post_item_id) on delete cascade,
  user_id             uuid        not null references auth.users(id) on delete cascade,
  option_id           uuid        not null references public.post_poll_option(id) on delete restrict,

  -- Frozen demographics — derived from private profile at vote time.
  age_bucket          text,
  sex                 text,
  region              text,
  csp                 text,
  education           text,
  past_vote_pr1_2022  text,

  -- Traceability — full private profile payload at vote time.
  profile_payload     jsonb       not null default '{}'::jsonb,

  -- Reference anchoring — stamp-and-freeze (K-8).
  ref_as_of           date        not null,

  -- True if any of age_bucket / sex / region / csp was null at vote time.
  is_partial          boolean     not null default false,

  snapshotted_at      timestamptz not null default timezone('utc', now()),
  unique (poll_id, user_id)
);

comment on table public.survey_respondent_snapshot is
  'Frozen demographic profile per poll vote. Immutable. Feeds the weighting worker.';

create index if not exists survey_respondent_snapshot_poll_idx
  on public.survey_respondent_snapshot(poll_id);
create index if not exists survey_respondent_snapshot_ref_idx
  on public.survey_respondent_snapshot(ref_as_of);

alter table public.survey_respondent_snapshot enable row level security;

drop policy if exists snapshot_self_read on public.survey_respondent_snapshot;
create policy snapshot_self_read on public.survey_respondent_snapshot
  for select to authenticated
  using (user_id = auth.uid());

-- No public write policy — writes go exclusively through the
-- submit_post_poll_vote SECURITY DEFINER RPC (next migration).

-- 2. Per-respondent calibrated weights, overwritten on each worker run.
create table if not exists public.survey_poll_weights (
  poll_id       uuid        not null references public.post_poll(post_item_id) on delete cascade,
  snapshot_id   uuid        not null references public.survey_respondent_snapshot(id) on delete cascade,
  weight        numeric     not null check (weight >= 0.5 and weight <= 2.0),
  computed_at   timestamptz not null default timezone('utc', now()),
  primary key (poll_id, snapshot_id)
);

comment on table public.survey_poll_weights is
  'Per-respondent calibrated weights, in [0.5, 2.0]. Overwritten by the weighting worker each cycle.';

create index if not exists survey_poll_weights_poll_idx
  on public.survey_poll_weights(poll_id);

alter table public.survey_poll_weights enable row level security;
-- No public read — frontend never consumes per-respondent weights.
-- Worker reads/writes via service role (bypasses RLS).

-- 3. Per-poll estimate (the public surface of the weighting pipeline).
create table if not exists public.survey_poll_estimate (
  poll_id                 uuid        primary key references public.post_poll(post_item_id) on delete cascade,
  n_respondents           integer     not null check (n_respondents >= 0),
  n_effective             numeric     not null check (n_effective >= 0),
  deff                    numeric     not null check (deff >= 1),
  weight_top5_share       numeric     not null check (weight_top5_share >= 0 and weight_top5_share <= 1),
  coverage_share          numeric     not null check (coverage_share >= 0 and coverage_share <= 1),
  min_political_coverage  numeric     not null check (min_political_coverage >= 0 and min_political_coverage <= 1),

  confidence_score        integer     not null check (confidence_score between 0 and 100),
  confidence_band         text        not null check (confidence_band in ('indicatif','correctable','robuste')),
  confidence_components   jsonb       not null,

  raw_results             jsonb       not null,
  corrected_results       jsonb,
  corrected_ci95          jsonb,

  computed_with_ref_as_of date        not null,
  is_final                boolean     not null default false,
  computed_at             timestamptz not null default timezone('utc', now())
);

comment on table public.survey_poll_estimate is
  'Per-poll reweighted estimate. Upserted by the worker. Public-readable for v_post_poll_summary.';

alter table public.survey_poll_estimate enable row level security;

drop policy if exists estimate_public_read on public.survey_poll_estimate;
create policy estimate_public_read on public.survey_poll_estimate
  for select to anon, authenticated using (true);

-- No write policy — worker writes via service role.

commit;
