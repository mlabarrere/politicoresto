begin;

-- ─────────────────────────────────────────────────────────────
-- Weighting worker — phase 1b, migration 3/4
--
-- Extends submit_post_poll_vote to write a survey_respondent_snapshot
-- row in the SAME transaction as the vote (B-1: modify in place).
--
-- Signature unchanged: (p_post_item_id uuid, p_option_id uuid) →
-- SETOF v_post_poll_summary. No frontend change required.
--
-- Snapshot semantics:
--   • Always written, even for users with incomplete profile. The
--     is_partial flag records it.
--   • Frozen scalars (age_bucket, sex, region, csp, education,
--     past_vote_pr1_2022) derived at vote time — never retroactive.
--   • Full profile_payload jsonb kept for traceability (B-2).
--   • ref_as_of stamped with current_valid_reference_date().
--   • unique(poll_id, user_id) on the snapshot table matches the
--     existing unique(post_item_id, user_id) on post_poll_response,
--     so the ON CONFLICT path on the vote itself cascades naturally
--     — if the vote is a re-vote (rejected), no snapshot is inserted.
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

  -- 1. The vote itself (unchanged behaviour, rejects re-votes).
  insert into public.post_poll_response(post_item_id, option_id, user_id)
  values (p_post_item_id, p_option_id, caller)
  on conflict (post_item_id, user_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    raise exception 'Already voted' using errcode = 'P0001';
  end if;

  -- 2. Atomic snapshot — frozen demographic profile at this vote.
  --    Read the private profile (may not exist if the user has not
  --    filled anything; in that case all derived fields are null).
  select * into priv from public.user_private_political_profile where user_id = caller;

  insert into public.survey_respondent_snapshot (
    poll_id, user_id, option_id,
    age_bucket, sex, region, csp, education, past_vote_pr1_2022,
    profile_payload, ref_as_of, is_partial
  ) values (
    p_post_item_id,
    caller,
    p_option_id,
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

  -- 3. Return the current poll summary for the client.
  return query
    select * from public.v_post_poll_summary v
    where v.post_item_id = p_post_item_id;
end;
$$;

comment on function public.submit_post_poll_vote(uuid, uuid) is
  'Casts a vote and atomically writes a frozen survey_respondent_snapshot for the weighting pipeline. Rejects re-votes with "Already voted".';

commit;
