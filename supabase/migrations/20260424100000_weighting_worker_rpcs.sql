begin;

-- ─────────────────────────────────────────────────────────────
-- Phase 3 — worker-side RPCs.
--
-- The pgmq schema is not exposed through PostgREST (config.toml
-- exposes only `public`). We add thin SECURITY DEFINER wrappers in
-- `public` so the Python worker can read/archive/dead-letter queue
-- messages via standard Supabase client calls.
--
-- All wrappers are service-role-only at the REST layer — we grant
-- EXECUTE to `service_role` explicitly. The `authenticated` role
-- intentionally does not get access; only the background worker
-- speaks to the queue.
-- ─────────────────────────────────────────────────────────────

-- Dead-letter queue for messages that fail too many times.
do $$
begin
  if not exists (select 1 from pgmq.list_queues() where queue_name = 'weighting_dead') then
    perform pgmq.create('weighting_dead');
  end if;
end $$;

-- ── 1. Read up to `p_qty` messages with a visibility timeout. ──
create or replace function public.weighting_queue_read(
  p_qty integer default 32,
  p_vt_seconds integer default 120
)
returns table (
  msg_id     bigint,
  read_ct    integer,
  enqueued_at timestamptz,
  vt         timestamptz,
  message    jsonb
)
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  if p_qty <= 0 or p_qty > 1000 then
    raise exception 'p_qty out of range (1..1000)';
  end if;
  if p_vt_seconds <= 0 or p_vt_seconds > 86400 then
    raise exception 'p_vt_seconds out of range (1..86400)';
  end if;
  return query
    select r.msg_id, r.read_ct, r.enqueued_at, r.vt, r.message
    from pgmq.read('weighting', p_vt_seconds, p_qty) r;
end;
$$;

comment on function public.weighting_queue_read(integer, integer) is
  'Service-role-only wrapper around pgmq.read for the weighting queue.';

-- ── 2. Archive a message after successful processing. ──
create or replace function public.weighting_queue_archive(p_msg_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  return pgmq.archive('weighting', p_msg_id);
end;
$$;

comment on function public.weighting_queue_archive(bigint) is
  'Service-role-only wrapper around pgmq.archive for the weighting queue.';

-- ── 3. Move a poisoned message to the dead-letter queue. ──
create or replace function public.weighting_queue_dead_letter(
  p_msg_id bigint,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare
  msg_row pgmq.q_weighting%rowtype;
begin
  select * into msg_row from pgmq.q_weighting where msg_id = p_msg_id;
  if not found then
    return false;
  end if;
  perform pgmq.send(
    'weighting_dead',
    jsonb_build_object(
      'original_message', msg_row.message,
      'original_msg_id',  p_msg_id,
      'read_ct',          msg_row.read_ct,
      'reason',           p_reason,
      'dead_lettered_at', timezone('utc', now())
    )
  );
  return pgmq.archive('weighting', p_msg_id);
end;
$$;

comment on function public.weighting_queue_dead_letter(bigint, text) is
  'Archives a poisoned message and forwards a record of it to weighting_dead.';

-- ── Grants ──
revoke all on function public.weighting_queue_read(integer, integer)           from public;
revoke all on function public.weighting_queue_archive(bigint)                  from public;
revoke all on function public.weighting_queue_dead_letter(bigint, text)        from public;
grant execute on function public.weighting_queue_read(integer, integer)        to service_role;
grant execute on function public.weighting_queue_archive(bigint)               to service_role;
grant execute on function public.weighting_queue_dead_letter(bigint, text)     to service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. Pipeline helpers the worker calls read-side.
-- ─────────────────────────────────────────────────────────────

-- Fetch all frozen snapshots for a poll. Returns enough columns that
-- the worker can build the respondent frame + look up their options.
create or replace function public.weighting_fetch_snapshots(p_poll_id uuid)
returns table (
  id                  uuid,
  user_id             uuid,
  option_id           uuid,
  age_bucket          text,
  sex                 text,
  region              text,
  csp                 text,
  education           text,
  past_vote_pr1_2022  text,
  is_partial          boolean,
  ref_as_of           date,
  snapshotted_at      timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id, s.user_id, s.option_id,
    s.age_bucket, s.sex, s.region, s.csp, s.education, s.past_vote_pr1_2022,
    s.is_partial, s.ref_as_of, s.snapshotted_at
  from public.survey_respondent_snapshot s
  where s.poll_id = p_poll_id;
$$;

comment on function public.weighting_fetch_snapshots(uuid) is
  'Service-role-only: all snapshots for a poll, ordered implementation-defined.';

-- Fetch the reference data at a given as_of. Pivoted-ish: one row per
-- (dimension, category) so the Python side can build the marginals dict
-- without needing multiple queries.
create or replace function public.weighting_fetch_reference(p_as_of date)
returns table (
  dimension text,
  category  text,
  share     numeric
)
language sql
security definer
set search_path = public
as $$
  select m.dimension, m.category, m.share
  from public.survey_ref_marginal m
  where m.as_of = p_as_of;
$$;

comment on function public.weighting_fetch_reference(date) is
  'Service-role-only: marginal shares at an as_of date. One row per (dimension, category).';

-- Fetch the ordered list of a poll's active options (for consistent
-- output ordering in the estimate JSON).
create or replace function public.weighting_fetch_poll_options(p_poll_id uuid)
returns table (
  option_id   uuid,
  label       text,
  sort_order  integer
)
language sql
security definer
set search_path = public
as $$
  select o.id, o.label, o.sort_order
  from public.post_poll_option o
  where o.post_item_id = p_poll_id and o.is_active
  order by o.sort_order;
$$;

comment on function public.weighting_fetch_poll_options(uuid) is
  'Service-role-only: ordered active options for a poll.';

revoke all on function public.weighting_fetch_snapshots(uuid)      from public;
revoke all on function public.weighting_fetch_reference(date)       from public;
revoke all on function public.weighting_fetch_poll_options(uuid)    from public;
grant execute on function public.weighting_fetch_snapshots(uuid)    to service_role;
grant execute on function public.weighting_fetch_reference(date)    to service_role;
grant execute on function public.weighting_fetch_poll_options(uuid) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. Upsert the computed estimate. One call per worker cycle.
-- ─────────────────────────────────────────────────────────────

create or replace function public.weighting_upsert_estimate(
  p_poll_id                uuid,
  p_n_respondents          integer,
  p_n_effective            numeric,
  p_deff                   numeric,
  p_weight_top5_share      numeric,
  p_coverage_share         numeric,
  p_min_political_coverage numeric,
  p_confidence_score       integer,
  p_confidence_band        text,
  p_confidence_components  jsonb,
  p_raw_results            jsonb,
  p_corrected_results      jsonb,
  p_corrected_ci95         jsonb,
  p_computed_with_ref_as_of date,
  p_is_final               boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.survey_poll_estimate (
    poll_id, n_respondents, n_effective, deff,
    weight_top5_share, coverage_share, min_political_coverage,
    confidence_score, confidence_band, confidence_components,
    raw_results, corrected_results, corrected_ci95,
    computed_with_ref_as_of, is_final, computed_at
  ) values (
    p_poll_id, p_n_respondents, p_n_effective, p_deff,
    p_weight_top5_share, p_coverage_share, p_min_political_coverage,
    p_confidence_score, p_confidence_band, p_confidence_components,
    p_raw_results, p_corrected_results, p_corrected_ci95,
    p_computed_with_ref_as_of, p_is_final, timezone('utc', now())
  )
  on conflict (poll_id) do update set
    n_respondents           = excluded.n_respondents,
    n_effective             = excluded.n_effective,
    deff                    = excluded.deff,
    weight_top5_share       = excluded.weight_top5_share,
    coverage_share          = excluded.coverage_share,
    min_political_coverage  = excluded.min_political_coverage,
    confidence_score        = excluded.confidence_score,
    confidence_band         = excluded.confidence_band,
    confidence_components   = excluded.confidence_components,
    raw_results             = excluded.raw_results,
    corrected_results       = excluded.corrected_results,
    corrected_ci95          = excluded.corrected_ci95,
    computed_with_ref_as_of = excluded.computed_with_ref_as_of,
    is_final                = excluded.is_final,
    computed_at             = timezone('utc', now());
end;
$$;

comment on function public.weighting_upsert_estimate(
  uuid, integer, numeric, numeric, numeric, numeric, numeric,
  integer, text, jsonb, jsonb, jsonb, jsonb, date, boolean
) is
  'Service-role-only: upsert a computed estimate for a poll.';

revoke all on function public.weighting_upsert_estimate(
  uuid, integer, numeric, numeric, numeric, numeric, numeric,
  integer, text, jsonb, jsonb, jsonb, jsonb, date, boolean
) from public;
grant execute on function public.weighting_upsert_estimate(
  uuid, integer, numeric, numeric, numeric, numeric, numeric,
  integer, text, jsonb, jsonb, jsonb, jsonb, date, boolean
) to service_role;

commit;
