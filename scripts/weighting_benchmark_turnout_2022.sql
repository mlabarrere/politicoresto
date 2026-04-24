-- Editorial benchmark — PR1 2022 turnout reconstruction.
--
-- Creates 120 synthetic voters with a biased composition (young urban
-- engaged) that over-declares PR1 turnout at 88 % vs the INSEE reality
-- of 73.69 %. Runs the vote+snapshot flow, enqueues pgmq so the worker
-- can calibrate. Print raw vs corrected vs truth after running the
-- worker.
--
-- Usage:
--   DB=$(supabase status -o env | grep '^DB_URL=' | cut -d'"' -f2)
--   psql "$DB" -f scripts/weighting_benchmark_turnout_2022.sql
--   cd worker && .venv/bin/python -m weighting.worker --once
--   psql "$DB" -c "select ... from v_post_poll_summary where post_slug like 'bench-%';"

begin;

-- ── Clean up prior runs.
delete from public.topic where slug like 'bench-turnout%';

-- Helper: weighted random pick of an index given cumulative weights.
create or replace function bench_pick_weighted(p_weights numeric[])
returns int language plpgsql as $$
declare
  r numeric := random();
  acc numeric := 0;
  i int;
begin
  for i in 1..array_length(p_weights, 1) loop
    acc := acc + p_weights[i];
    if r <= acc then return i; end if;
  end loop;
  return array_length(p_weights, 1);
end $$;

create or replace function bench_bucket_to_dob(p_bucket text)
returns date language plpgsql as $$
declare lo int; hi int; y int; m int; d int;
begin
  case p_bucket
    when '18_24' then lo := 18; hi := 24;
    when '25_34' then lo := 25; hi := 34;
    when '35_49' then lo := 35; hi := 49;
    when '50_64' then lo := 50; hi := 64;
    else             lo := 65; hi := 85;
  end case;
  y := 2026 - (lo + (random() * (hi - lo))::int);
  m := 1 + (random() * 11)::int;
  d := 1 + (random() * 27)::int;
  return make_date(y, m, d);
end $$;

do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-0000000000aa';
  thread_id uuid;
  post_item_id uuid;
  option_oui_id uuid;
  option_non_id uuid;
  voter_id uuid;
  i int;
  age_buckets text[] := array['18_24','25_34','35_49','50_64','65p'];
  ages_weights  numeric[] := array[0.22, 0.38, 0.25, 0.12, 0.03];
  sex_values text[]  := array['M','F'];
  sex_weights numeric[] := array[0.62, 0.38];
  csp_values text[]  := array['cadres','professions_intermediaires','employes','ouvriers',
                               'retraites','sans_activite','artisans_commercants','agriculteurs'];
  csp_weights numeric[] := array[0.38,0.22,0.18,0.06,0.05,0.08,0.02,0.01];
  -- All postals must match ^[0-9]{5}$. Overseas dropped from this panel.
  postal_values text[] := array[
    '75001','75011','75019','92100','93100','69001','13001','31000',
    '33000','44000','59000','76000','45000','67000','21000',
    '03000','15000','55000','08000','04100'];
  postal_weights numeric[] := array[
    0.12,0.10,0.10,0.05,0.06,0.08,0.07,0.06,0.05,0.04,
    0.05,0.04,0.03,0.03,0.02,0.02,0.02,0.02,0.02,0.02];
  edu_values text[] := array['bac3_plus','bac2','bac','none'];
  edu_weights numeric[] := array[0.70, 0.15, 0.10, 0.05];
  age_bucket text;
  sex_val text;
  csp_val text;
  postal_val text;
  edu_val text;
  dob date;
  declared_vote text;  -- 'macron' | 'abstention'
  n_declared_oui int := 0;
  n_declared_non int := 0;
  pr1_2022_id uuid;
  macron_result_id uuid;
begin
  select id into pr1_2022_id from public.election where slug = 'presidentielle-2022-t1';
  select er.id into macron_result_id from public.election_result er
    where er.election_id = pr1_2022_id and er.candidate_name = 'Emmanuel Macron';
  if pr1_2022_id is null or macron_result_id is null then
    raise exception 'missing election seed for presidentielle-2022-t1 or Macron result';
  end if;

  insert into auth.users (id, instance_id, email, role, aud, created_at, email_confirmed_at)
  values (admin_id, '00000000-0000-0000-0000-000000000000',
          'bench-admin@example.test', 'authenticated', 'authenticated', now(), now())
  on conflict (id) do nothing;

  insert into public.app_profile (user_id, username, display_name, profile_status)
  values (admin_id, 'bench-admin', 'Bench Admin', 'active')
  on conflict (user_id) do update set display_name = excluded.display_name;

  insert into public.topic (slug, title, description, topic_status, visibility,
                            created_by, close_at, thread_kind, campaign_cycle, is_sensitive)
  values ('bench-turnout-' || substr(gen_random_uuid()::text, 1, 8),
          'BENCH-TURNOUT-2022', 'Benchmark', 'open', 'public', admin_id,
          now() + interval '47 hours', 'issue', 'presidentielle_2027', false)
  returning id into thread_id;

  insert into public.thread_post (thread_id, type, title, content, metadata,
                                   created_by, status, party_tags)
  values (thread_id, 'article', 'BENCH-TURNOUT-2022', 'Benchmark',
          jsonb_build_object('is_original_post', true, 'post_mode', 'poll'),
          admin_id, 'published', array[]::text[])
  returning id into post_item_id;

  insert into public.post_poll (post_item_id, question, deadline_at, created_by)
  values (post_item_id, 'Avez-vous voté au 1er tour de la présidentielle 2022 ?',
          now() + interval '47 hours', admin_id);

  insert into public.post_poll_option (post_item_id, label, sort_order)
  values (post_item_id, 'Oui', 0) returning id into option_oui_id;
  insert into public.post_poll_option (post_item_id, label, sort_order)
  values (post_item_id, 'Non', 1) returning id into option_non_id;

  for i in 1..120 loop
    voter_id := gen_random_uuid();
    age_bucket := age_buckets[bench_pick_weighted(ages_weights)];
    sex_val    := sex_values [bench_pick_weighted(sex_weights)];
    csp_val    := csp_values [bench_pick_weighted(csp_weights)];
    postal_val := postal_values[bench_pick_weighted(postal_weights)];
    edu_val    := edu_values [bench_pick_weighted(edu_weights)];
    dob := bench_bucket_to_dob(age_bucket);

    declared_vote := case when random() < 0.88 then 'macron' else 'abstention' end;

    insert into auth.users (id, instance_id, email, role, aud, created_at, email_confirmed_at)
    values (voter_id, '00000000-0000-0000-0000-000000000000',
            'bench-voter-' || i || '-' || substr(voter_id::text, 1, 8) || '@example.test',
            'authenticated', 'authenticated', now(), now());

    insert into public.app_profile (user_id, username, display_name, profile_status)
    values (voter_id, 'bv-' || substr(voter_id::text, 1, 8), 'Voter ' || i, 'active');

    insert into public.user_private_political_profile
      (user_id, date_of_birth, sex, postal_code, csp, education)
    values (voter_id, dob, sex_val, postal_val, csp_val, edu_val);

    -- Vote history uses election_id + choice_kind. Turnout-wise: voters
    -- who "declared voting" → choice_kind='vote' with election_result_id
    -- pointing to Macron (arbitrary, only matters for the turnout bench).
    -- Non-voters → choice_kind='abstention' with no result.
    if declared_vote = 'abstention' then
      insert into public.profile_vote_history (user_id, election_id, choice_kind)
      values (voter_id, pr1_2022_id, 'abstention');
    else
      insert into public.profile_vote_history (user_id, election_id, election_result_id, choice_kind)
      values (voter_id, pr1_2022_id, macron_result_id, 'vote');
    end if;

    insert into public.post_poll_response (post_item_id, option_id, user_id)
    values (post_item_id,
            case when declared_vote = 'abstention' then option_non_id else option_oui_id end,
            voter_id);

    if declared_vote = 'abstention' then
      n_declared_non := n_declared_non + 1;
    else
      n_declared_oui := n_declared_oui + 1;
    end if;

    insert into public.survey_respondent_snapshot
      (poll_id, user_id, option_id, age_bucket, sex, region, csp, education,
       past_vote_pr1_2022, past_votes, profile_payload, ref_as_of, is_partial)
    values (
      post_item_id, voter_id,
      case when declared_vote = 'abstention' then option_non_id else option_oui_id end,
      age_bucket, sex_val, public.derive_region(postal_val), csp_val, edu_val,
      declared_vote,
      public.derive_past_votes(voter_id),
      jsonb_build_object('date_of_birth', dob, 'postal_code', postal_val, 'sex', sex_val,
                         'csp', csp_val, 'education', edu_val),
      public.current_valid_reference_date(),
      false
    );
  end loop;

  perform pgmq.send('weighting', jsonb_build_object('poll_id', post_item_id, 'final', false));

  raise notice E'\n── Seed summary ──\n  poll:   %\n  raw:    % Oui / % Non  (% %% turnout)\n  truth:  INSEE 2022 PR1 = 73.69 %%\n  → run the worker then query v_post_poll_summary.\n',
    post_item_id,
    n_declared_oui, n_declared_non,
    round(n_declared_oui::numeric * 100 / 120, 2);
end $$;

commit;
