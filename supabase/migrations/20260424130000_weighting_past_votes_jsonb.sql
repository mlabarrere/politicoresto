begin;

-- ─────────────────────────────────────────────────────────────
-- Phase 3d.2 — Historique électoral complet dans les snapshots.
--
-- Jusqu'ici `survey_respondent_snapshot` gelait un seul scrutin
-- (`past_vote_pr1_2022`). L'ordre éditorial PoliticoResto est que
-- le vote passé est la variable de calibration la plus prioritaire
-- (cf. 3d.1). En corollaire, on gèle TOUS les scrutins disponibles
-- au moment du vote sur le sondage, pas seulement la présidentielle
-- 2022.
--
-- Design : colonne `past_votes jsonb` (default '{}'). Clés =
-- election.slug ("presidentielle-2022-t1", "legislatives-2017-t2",
-- "europeennes-2019", …). Valeurs = texte du choix
-- (nom du candidat, "abstention", "blanc", "nul", "non_inscrit",
-- "ne_se_prononce_pas"). La colonne scalaire historique
-- `past_vote_pr1_2022` reste : elle dupliquera la clé du jsonb pour
-- un release, puis sera retirée en 3d.3.
--
-- Un helper `public.derive_past_votes(user_id uuid) returns jsonb`
-- matérialise cette dict depuis `profile_vote_history` + `election`.
-- ─────────────────────────────────────────────────────────────

alter table public.survey_respondent_snapshot
  add column if not exists past_votes jsonb not null default '{}'::jsonb;

comment on column public.survey_respondent_snapshot.past_votes is
  'Historique de vote gelé au moment du vote sur le sondage. Clé = election.slug, valeur = nom candidat / abstention / blanc / nul / non_inscrit / ne_se_prononce_pas.';

-- ── Helper d'extraction ──
create or replace function public.derive_past_votes(p_user_id uuid)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  -- Pour chaque election déclarée par l'utilisateur, on renvoie :
  --   * le nom du candidat (election_result.candidate_name) si choice_kind = 'vote'
  --   * sinon le choice_kind lui-même ('abstention', 'blanc', etc.)
  -- Agrégation en jsonb. Si l'utilisateur n'a rien déclaré → '{}'.
  select coalesce(
    jsonb_object_agg(
      e.slug,
      case
        when pvh.choice_kind = 'vote' and er.candidate_name is not null then er.candidate_name
        else pvh.choice_kind::text
      end
    ),
    '{}'::jsonb
  )
  from public.profile_vote_history pvh
  join public.election e on e.id = pvh.election_id
  left join public.election_result er on er.id = pvh.election_result_id
  where pvh.user_id = p_user_id;
$$;

comment on function public.derive_past_votes(uuid) is
  'Materialise l''historique de vote d''un utilisateur en jsonb {election_slug: choix}. Base pour le gel au snapshot.';

-- ── Mise à jour de submit_post_poll_vote pour populer past_votes ──
-- On garde le scalaire `past_vote_pr1_2022` (pour compat) et on
-- ajoute le jsonb complet en parallèle. La suite 3d.3 retirera le
-- scalaire une fois le front migré.
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
  past_votes_json jsonb;
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
  past_votes_json := public.derive_past_votes(caller);

  insert into public.survey_respondent_snapshot (
    poll_id, user_id, option_id,
    age_bucket, sex, region, csp, education, past_vote_pr1_2022,
    past_votes,
    profile_payload, ref_as_of, is_partial
  ) values (
    p_post_item_id, caller, p_option_id,
    public.derive_age_bucket(priv.date_of_birth),
    priv.sex,
    public.derive_region(priv.postal_code),
    priv.csp,
    priv.education,
    public.derive_past_vote_pr1_2022(caller),
    past_votes_json,
    coalesce(priv.profile_payload, '{}'::jsonb)
      || jsonb_build_object(
        'date_of_birth', priv.date_of_birth,
        'postal_code',   priv.postal_code,
        'sex',           priv.sex,
        'csp',           priv.csp,
        'education',     priv.education,
        'past_votes',    past_votes_json
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
  'Casts a vote and atomically writes a frozen survey_respondent_snapshot (including past_votes jsonb) for the weighting pipeline. Rejects re-votes with "Already voted".';

-- ── Worker-side fetch : on expose past_votes dans la RPC existante ──
-- Ajouter un champ au retour sans casser les anciens callers.
-- fetch_snapshots déjà lu par supabase_client.py ; on étend par
-- RECREATE.
drop function if exists public.weighting_fetch_snapshots(uuid);

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
  past_votes          jsonb,
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
    s.past_votes,
    s.is_partial, s.ref_as_of, s.snapshotted_at
  from public.survey_respondent_snapshot s
  where s.poll_id = p_poll_id;
$$;

comment on function public.weighting_fetch_snapshots(uuid) is
  'Service-role-only: all snapshots for a poll including frozen past_votes jsonb.';

revoke all on function public.weighting_fetch_snapshots(uuid) from public;
grant execute on function public.weighting_fetch_snapshots(uuid) to service_role;

commit;
