begin;

-- ─────────────────────────────────────────────────────────────
-- Historique de vote personnel (prive)
--   Chaque utilisateur peut declarer, par scrutin, soit :
--     - son choix de candidat / liste (election_result_id)
--     - un vote blanc, nul, une abstention, ou "non inscrit"
--   Donnee strictement privee, utilisee pour le redressement
--   des sondages (metier.md § Sondages).
-- ─────────────────────────────────────────────────────────────

-- 1. Enum du type de choix (vote explicite ou non-vote)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'vote_choice_kind') then
    create type public.vote_choice_kind as enum (
      'vote',          -- a vote pour un candidat/liste (election_result_id renseigne)
      'blanc',
      'nul',
      'abstention',
      'non_inscrit',
      'ne_se_prononce_pas'
    );
  end if;
end $$;

-- 2. Table profile_vote_history
create table if not exists public.profile_vote_history (
  id                  uuid                    primary key default gen_random_uuid(),
  user_id             uuid                    not null references auth.users(id) on delete cascade,
  election_id         uuid                    not null references public.election(id) on delete cascade,
  election_result_id  uuid                             references public.election_result(id) on delete set null,
  choice_kind         public.vote_choice_kind not null default 'vote',
  confidence          smallint                check (confidence is null or confidence between 1 and 5),
  notes               text,
  declared_at         timestamptz             not null default timezone('utc', now()),
  created_at          timestamptz             not null default timezone('utc', now()),
  updated_at          timestamptz             not null default timezone('utc', now()),
  unique (user_id, election_id),
  -- Si choice_kind = 'vote', on exige un election_result_id (coherence).
  constraint vote_needs_result check (
    (choice_kind <> 'vote') or (election_result_id is not null)
  )
);

create index if not exists profile_vote_history_user_idx     on public.profile_vote_history(user_id);
create index if not exists profile_vote_history_election_idx on public.profile_vote_history(election_id);

-- 3. Trigger updated_at
create or replace function public.tg_profile_vote_history_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists tg_profile_vote_history_updated_at on public.profile_vote_history;
create trigger tg_profile_vote_history_updated_at
  before update on public.profile_vote_history
  for each row execute function public.tg_profile_vote_history_updated_at();

-- 4. RLS — chacun voit/edite uniquement ses propres votes
alter table public.profile_vote_history enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profile_vote_history' and policyname = 'profile_vote_history_self_select') then
    create policy profile_vote_history_self_select on public.profile_vote_history
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profile_vote_history' and policyname = 'profile_vote_history_self_insert') then
    create policy profile_vote_history_self_insert on public.profile_vote_history
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profile_vote_history' and policyname = 'profile_vote_history_self_update') then
    create policy profile_vote_history_self_update on public.profile_vote_history
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profile_vote_history' and policyname = 'profile_vote_history_self_delete') then
    create policy profile_vote_history_self_delete on public.profile_vote_history
      for delete using (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, update, delete on public.profile_vote_history to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. RPCs publiques (security definer) — alignees avec AGENT.md
--    (les pages ne parlent pas directement a la table si un RPC est disponible)
-- ─────────────────────────────────────────────────────────────

-- 5.1 Liste des votes de l'utilisateur (remplace le stub v0).
create or replace function public.rpc_list_private_vote_history()
returns table (
  id uuid,
  vote_round integer,
  declared_option_label text,
  declared_candidate_name text,
  declared_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path to public
as $$
  select
    h.id,
    e.round::integer                                             as vote_round,
    coalesce(r.list_label, r.candidate_name, h.choice_kind::text) as declared_option_label,
    r.candidate_name                                             as declared_candidate_name,
    h.declared_at,
    h.created_at
  from public.profile_vote_history h
  join public.election             e on e.id = h.election_id
  left join public.election_result r on r.id = h.election_result_id
  where h.user_id = auth.uid()
  order by e.held_on desc, e.round desc nulls last;
$$;

grant execute on function public.rpc_list_private_vote_history() to authenticated;

-- 5.2 Liste enrichie (pour la grille editeur)
create or replace function public.rpc_list_vote_history_detailed()
returns table (
  id uuid,
  election_id uuid,
  election_slug citext,
  election_label text,
  election_result_id uuid,
  choice_kind public.vote_choice_kind,
  confidence smallint,
  notes text,
  declared_at timestamptz,
  candidate_name text,
  list_label text,
  party_slug citext
)
language sql
security definer
set search_path to public
as $$
  select
    h.id,
    h.election_id,
    e.slug,
    e.label,
    h.election_result_id,
    h.choice_kind,
    h.confidence,
    h.notes,
    h.declared_at,
    r.candidate_name,
    r.list_label,
    r.party_slug
  from public.profile_vote_history h
  join public.election             e on e.id = h.election_id
  left join public.election_result r on r.id = h.election_result_id
  where h.user_id = auth.uid()
  order by e.held_on desc, e.round desc nulls last;
$$;

grant execute on function public.rpc_list_vote_history_detailed() to authenticated;

-- 5.3 Upsert d'un vote (par slug d'election pour stabilite cote front)
create or replace function public.rpc_upsert_vote_history(
  p_election_slug    citext,
  p_election_result_id uuid,
  p_choice_kind      public.vote_choice_kind,
  p_confidence       smallint default null,
  p_notes            text     default null
)
returns uuid
language plpgsql
security definer
set search_path to public
as $$
declare
  v_user_id uuid := auth.uid();
  v_election_id uuid;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select id into v_election_id from public.election where slug = p_election_slug;
  if v_election_id is null then
    raise exception 'election introuvable: %', p_election_slug using errcode = '22023';
  end if;

  -- Coherence : si choice = 'vote' alors result requis et doit appartenir au bon scrutin
  if p_choice_kind = 'vote' then
    if p_election_result_id is null then
      raise exception 'election_result_id requis pour un vote' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.election_result
      where id = p_election_result_id and election_id = v_election_id
    ) then
      raise exception 'election_result_id ne correspond pas au scrutin' using errcode = '22023';
    end if;
  end if;

  insert into public.profile_vote_history as h
    (user_id, election_id, election_result_id, choice_kind, confidence, notes, declared_at)
  values
    (v_user_id, v_election_id,
     case when p_choice_kind = 'vote' then p_election_result_id else null end,
     p_choice_kind, p_confidence, p_notes, timezone('utc', now()))
  on conflict (user_id, election_id) do update set
    election_result_id = excluded.election_result_id,
    choice_kind        = excluded.choice_kind,
    confidence         = excluded.confidence,
    notes              = excluded.notes,
    declared_at        = timezone('utc', now())
  returning h.id into v_id;

  return v_id;
end;
$$;

grant execute on function public.rpc_upsert_vote_history(citext, uuid, public.vote_choice_kind, smallint, text) to authenticated;

-- 5.4 Suppression d'un vote pour un scrutin donne
create or replace function public.rpc_delete_vote_history(p_election_slug citext)
returns boolean
language plpgsql
security definer
set search_path to public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted int;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  delete from public.profile_vote_history h
  using public.election e
  where h.election_id = e.id
    and h.user_id     = v_user_id
    and e.slug        = p_election_slug;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

grant execute on function public.rpc_delete_vote_history(citext) to authenticated;

commit;
