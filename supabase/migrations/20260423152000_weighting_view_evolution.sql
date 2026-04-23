begin;

-- ─────────────────────────────────────────────────────────────
-- Weighting worker — phase 1b, migration 4/4
--
-- Evolves v_post_poll_summary to expose the weighting pipeline's
-- output (confidence_score / band / components, corrected_ci95,
-- computed_with_ref_as_of, is_final) while keeping the legacy
-- column names (representativity_score, coverage_score,
-- distance_score, stability_score, anti_brigading_score) as
-- mirrors so the current frontend keeps working unchanged.
--
-- Also converts the view from SECURITY DEFINER to SECURITY INVOKER
-- (J-1, R9). Underlying RLS on post_poll/thread_post/topic/etc. is
-- sufficient; the helper can_read_topic() does the tenancy check
-- via auth.uid(). Extensive smoke-testing included below the view.
--
-- Columns added:
--   confidence_score        int     (0..100, aggregate geometric mean)
--   confidence_band         text    ('indicatif'|'correctable'|'robuste')
--   confidence_components   jsonb   ({kish, coverage, variability, concentration})
--   corrected_ci95          jsonb   (null when confidence_score < 40)
--   computed_with_ref_as_of date
--   is_final                boolean
--
-- Legacy mirrors (one-release deprecation window):
--   representativity_score  ← confidence_score
--   coverage_score          ← confidence_components.coverage
--   distance_score          ← confidence_components.variability  (1/deff)
--   stability_score         ← confidence_components.concentration
--   anti_brigading_score    ← confidence_components.kish
-- ─────────────────────────────────────────────────────────────

-- DROP first because we're changing the column set. CREATE OR REPLACE
-- won't allow column removal/reordering.
drop view if exists public.v_post_poll_summary cascade;

create view public.v_post_poll_summary
  with (security_invoker = true)
as
with options as (
  select o.post_item_id,
         jsonb_agg(
           jsonb_build_object(
             'option_id',  o.id,
             'label',      o.label,
             'sort_order', o.sort_order
           )
           order by o.sort_order
         ) as options_json
  from public.post_poll_option o
  where o.is_active = true
  group by o.post_item_id
),
option_counts as (
  select o.post_item_id,
         o.id    as option_id,
         o.label,
         o.sort_order,
         count(r.id)::integer as response_count
  from public.post_poll_option o
  left join public.post_poll_response r
    on r.option_id = o.id and r.post_item_id = o.post_item_id
  where o.is_active = true
  group by o.post_item_id, o.id, o.label, o.sort_order
),
poll_totals as (
  select post_item_id,
         sum(response_count)::integer as sample_size
  from option_counts
  group by post_item_id
),
counts_rolled as (
  select oc.post_item_id,
         jsonb_agg(
           jsonb_build_object(
             'option_id',      oc.option_id,
             'option_label',   oc.label,
             'sort_order',     oc.sort_order,
             'response_count', oc.response_count,
             'weighted_count', oc.response_count,
             'share', case
               when coalesce(pt.sample_size, 0) = 0 then 0::numeric
               else round(oc.response_count::numeric * 100 / pt.sample_size::numeric, 2)
             end
           )
           order by oc.sort_order
         ) as results
  from option_counts oc
  left join poll_totals pt on pt.post_item_id = oc.post_item_id
  group by oc.post_item_id
),
my_votes as (
  select r.post_item_id,
         r.option_id as selected_option_id
  from public.post_poll_response r
  where r.user_id = auth.uid()
)
select
  pp.post_item_id,
  pp.question,
  pp.deadline_at,
  case
    when pp.deadline_at <= timezone('utc', now()) then 'closed'::text
    else pp.poll_status
  end                                                                as poll_status,
  coalesce(pt.sample_size, 0)                                        as sample_size,
  -- effective_sample_size: use worker's n_effective when available, else raw n.
  coalesce(est.n_effective, coalesce(pt.sample_size, 0)::numeric)    as effective_sample_size,

  -- ── New weighting columns ──
  coalesce(est.confidence_score, 0)                                  as confidence_score,
  coalesce(est.confidence_band, 'indicatif')                         as confidence_band,
  coalesce(est.confidence_components, '{}'::jsonb)                   as confidence_components,
  case when est.confidence_score is not null and est.confidence_score >= 40
       then est.corrected_ci95
       else null
  end                                                                as corrected_ci95,
  est.computed_with_ref_as_of,
  coalesce(est.is_final, false)                                      as is_final,

  -- ── Legacy mirrors (deprecated, one-release window) ──
  coalesce(est.confidence_score, 0)::numeric                         as representativity_score,
  coalesce((est.confidence_components->>'coverage')::numeric,      0) as coverage_score,
  coalesce((est.confidence_components->>'variability')::numeric,   0) as distance_score,
  coalesce((est.confidence_components->>'concentration')::numeric, 0) as stability_score,
  coalesce((est.confidence_components->>'kish')::numeric,          0) as anti_brigading_score,

  -- Raw distribution (pre-reweighting).
  coalesce(cr.results, '[]'::jsonb)                                  as raw_results,

  -- Corrected distribution (post-reweighting). Hidden when score < 40.
  case when est.confidence_score is not null and est.confidence_score >= 40
       then est.corrected_results
       else coalesce(cr.results, '[]'::jsonb)
  end                                                                as corrected_results,

  coalesce(opt.options_json, '[]'::jsonb)                            as options,
  mv.selected_option_id,
  tp.thread_id                                                       as post_id,
  top.slug                                                           as post_slug,
  top.title                                                          as post_title
from public.post_poll pp
join public.thread_post tp on tp.id = pp.post_item_id
join public.topic top      on top.id = tp.thread_id
left join options       opt on opt.post_item_id = pp.post_item_id
left join counts_rolled cr  on cr.post_item_id  = pp.post_item_id
left join poll_totals   pt  on pt.post_item_id  = pp.post_item_id
left join my_votes      mv  on mv.post_item_id  = pp.post_item_id
left join public.survey_poll_estimate est on est.poll_id = pp.post_item_id
where public.can_read_topic(top.*);

comment on view public.v_post_poll_summary is
  'Public-read summary of a poll including raw + corrected distributions, confidence score, and legacy score mirrors. SECURITY INVOKER — relies on underlying RLS via can_read_topic().';

-- Grants — the view is SECURITY INVOKER; anon/authenticated read via RLS.
grant select on public.v_post_poll_summary to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Re-create submit_post_poll_vote. Reason: the DROP VIEW … CASCADE
-- above drops any function whose return type depends on the view.
-- Body is identical to migration 20260423151000 — we re-emit here
-- because migrations cannot reach back to re-run a prior file.
-- ─────────────────────────────────────────────────────────────
create or replace function public.submit_post_poll_vote(
  p_post_item_id uuid,
  p_option_id    uuid
)
returns setof public.v_post_poll_summary
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  poll_row        public.post_poll%rowtype;
  priv            public.user_private_political_profile%rowtype;
  caller          uuid := auth.uid();
  inserted_count  integer;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into poll_row from public.post_poll where post_item_id = p_post_item_id;
  if poll_row.post_item_id is null then
    raise exception 'Poll not found';
  end if;
  if poll_row.poll_status <> 'open' or poll_row.deadline_at <= timezone('utc', now()) then
    raise exception 'Poll is closed';
  end if;

  if not exists (
    select 1 from public.post_poll_option o
    where o.id = p_option_id
      and o.post_item_id = p_post_item_id
      and o.is_active = true
  ) then
    raise exception 'Option not found for this poll';
  end if;

  insert into public.post_poll_response(post_item_id, option_id, user_id)
  values (p_post_item_id, p_option_id, caller)
  on conflict (post_item_id, user_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    raise exception 'Already voted' using errcode = 'P0001';
  end if;

  select * into priv from public.user_private_political_profile where user_id = caller;

  insert into public.survey_respondent_snapshot (
    poll_id, user_id, option_id,
    age_bucket, sex, region, csp, education, past_vote_pr1_2022,
    profile_payload, ref_as_of, is_partial
  ) values (
    p_post_item_id, caller, p_option_id,
    public.derive_age_bucket(priv.date_of_birth),
    priv.sex,
    public.derive_region(priv.postal_code),
    priv.csp,
    priv.education,
    public.derive_past_vote_pr1_2022(caller),
    coalesce(priv.profile_payload, '{}'::jsonb)
      || jsonb_build_object(
        'date_of_birth', priv.date_of_birth,
        'postal_code',   priv.postal_code,
        'sex',           priv.sex,
        'csp',           priv.csp,
        'education',     priv.education
      ),
    public.current_valid_reference_date(),
    (priv.date_of_birth is null
      or priv.sex is null
      or priv.postal_code is null
      or priv.csp is null)
  );

  return query
    select * from public.v_post_poll_summary v
    where v.post_item_id = p_post_item_id;
end;
$$;

comment on function public.submit_post_poll_vote(uuid, uuid) is
  'Casts a vote and atomically writes a frozen survey_respondent_snapshot for the weighting pipeline. Rejects re-votes with "Already voted".';

commit;
