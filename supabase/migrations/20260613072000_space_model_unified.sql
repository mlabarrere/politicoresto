-- Espaces unifiés (Nœuds + Tables) — modèle de données (PRD AD-1, Epic 1 / Story 1.1).
--
-- Une seule abstraction conteneur `space` à deux natures :
--   • Nœud  (kind='node')  — objet PARTAGÉ du graphe politique (territoire, élu,
--     candidat, parti, thème), dédoublonné (slug citext unique + 1 space/entité),
--     vérifiable. Créable par les utilisateurs ; le graphe s'auto-construit.
--   • Table (kind='table') — espace SOCIAL créé par un utilisateur, deux axes
--     indépendants : access (public/private) × identity_mode (open/blind).
--
-- Réutilise l'existant : political_entity (entités), app_profile (auteurs),
-- topic (discussions, via topic_space N:N). NB d'audit : `public.space` était une
-- référence MORTE d'un pivot (cf. migration 20260420220000) — aucune table préexistante,
-- on crée à neuf. Les enums legacy space_role/space_status ne sont PAS réutilisés.
--
-- Forward-only, idempotent. RLS default-deny + policies dans la même migration (règle #4).
-- Ordre : enums → tables → fonction helper → policies/grants (dépendances respectées).

-- ────────────────────────────────────────────────────────────────────────
-- 1. Enums

do $$ begin
  create type public.space_kind as enum ('node', 'table');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.space_node_type as enum ('territory', 'elu', 'candidate', 'party', 'theme');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.space_access as enum ('public', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.space_identity_mode as enum ('open', 'blind');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.space_verification as enum ('unverified', 'verified', 'official');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.space_member_role as enum ('owner', 'moderator', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.space_edge_type as enum (
    'candidate_of_party', 'theme_has_candidate', 'territory_has_elu', 'elu_of_party', 'related'
  );
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────────────────
-- 2. Tables (créées AVANT toute fonction/policy qui les référence)

-- 2.1 space — conteneur unifié
create table if not exists public.space (
  id            uuid primary key default gen_random_uuid(),
  kind          public.space_kind not null,
  slug          public.citext not null unique,
  title         text not null,
  description   text,
  node_type     public.space_node_type,
  entity_id     uuid references public.political_entity(id) on delete set null,
  verification  public.space_verification not null default 'unverified',
  access        public.space_access,
  identity_mode public.space_identity_mode,
  created_by    uuid references public.app_profile(user_id) on delete set null,
  created_at    timestamp with time zone not null default timezone('utc', now()),
  updated_at    timestamp with time zone not null default timezone('utc', now()),
  -- Intégrité de forme : un Nœud porte node_type ; une Table porte access+identity_mode.
  constraint space_kind_shape_chk check (
    (kind = 'node'  and node_type is not null and access is null and identity_mode is null)
    or
    (kind = 'table' and node_type is null and access is not null and identity_mode is not null)
  )
);

-- Dédoublonnage : au plus un Nœud par entité politique réelle.
create unique index if not exists space_entity_uq
  on public.space (entity_id) where entity_id is not null;
create index if not exists space_kind_idx on public.space (kind);
create index if not exists space_node_type_idx on public.space (node_type) where kind = 'node';
create index if not exists space_created_by_idx on public.space (created_by);

-- 2.2 space_member — adhésion (FK vers space + app_profile)
create table if not exists public.space_member (
  space_id  uuid not null references public.space(id) on delete cascade,
  user_id   uuid not null references public.app_profile(user_id) on delete cascade,
  role      public.space_member_role not null default 'member',
  joined_at timestamp with time zone not null default timezone('utc', now()),
  primary key (space_id, user_id)
);
create index if not exists space_member_user_idx on public.space_member (user_id);

-- 2.3 space_edge — arêtes typées du graphe
create table if not exists public.space_edge (
  src_space_id uuid not null references public.space(id) on delete cascade,
  dst_space_id uuid not null references public.space(id) on delete cascade,
  edge_type    public.space_edge_type not null,
  created_at   timestamp with time zone not null default timezone('utc', now()),
  primary key (src_space_id, dst_space_id, edge_type),
  constraint space_edge_no_self check (src_space_id <> dst_space_id)
);
create index if not exists space_edge_dst_idx on public.space_edge (dst_space_id, edge_type);

-- 2.4 topic_space — rattachement N:N Topic ↔ Espace
create table if not exists public.topic_space (
  topic_id uuid not null references public.topic(id) on delete cascade,
  space_id uuid not null references public.space(id) on delete cascade,
  primary key (topic_id, space_id)
);
create index if not exists topic_space_space_idx on public.topic_space (space_id);

-- ────────────────────────────────────────────────────────────────────────
-- 3. Helper (security definer pour éviter la récursion RLS) — APRÈS space_member.

create or replace function public.is_space_member(p_space_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.space_member m
    where m.space_id = p_space_id and m.user_id = auth.uid()
  );
$$;

-- ────────────────────────────────────────────────────────────────────────
-- 4. RLS + policies + grants (APRÈS tables + fonction).

-- 4.1 space
alter table public.space enable row level security;

drop policy if exists space_read on public.space;
create policy space_read on public.space
  for select using (
    kind = 'node'
    or access = 'public'
    or public.is_space_member(id)
    or public.is_moderator()
  );

drop policy if exists space_insert on public.space;
create policy space_insert on public.space
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists space_update on public.space;
create policy space_update on public.space
  for update using (created_by = auth.uid() or public.is_moderator())
  with check (created_by = auth.uid() or public.is_moderator());

grant select on public.space to anon, authenticated;
grant insert, update on public.space to authenticated;
grant all on public.space to service_role;

-- 4.2 space_member
alter table public.space_member enable row level security;

-- Lecture : soi-même ; modérateur ; co-membres SAUF en table aveugle (identité masquée).
drop policy if exists space_member_read on public.space_member;
create policy space_member_read on public.space_member
  for select using (
    user_id = auth.uid()
    or public.is_moderator()
    or (
      public.is_space_member(space_id)
      and not exists (
        select 1 from public.space s
        where s.id = space_id and s.identity_mode = 'blind'
      )
    )
  );

-- Auto-adhésion aux Nœuds et Tables publiques (privées = invitation, story ultérieure).
drop policy if exists space_member_self_join on public.space_member;
create policy space_member_self_join on public.space_member
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.space s
      where s.id = space_id and (s.kind = 'node' or s.access = 'public')
    )
  );

drop policy if exists space_member_self_leave on public.space_member;
create policy space_member_self_leave on public.space_member
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.space_member to authenticated;
grant all on public.space_member to service_role;

-- 4.3 space_edge — structure de graphe publique (création via service_role/RPC).
alter table public.space_edge enable row level security;

drop policy if exists space_edge_read on public.space_edge;
create policy space_edge_read on public.space_edge for select using (true);

grant select on public.space_edge to anon, authenticated;
grant all on public.space_edge to service_role;

-- 4.4 topic_space
alter table public.topic_space enable row level security;

drop policy if exists topic_space_read on public.topic_space;
create policy topic_space_read on public.topic_space
  for select using (
    exists (
      select 1 from public.space s
      where s.id = space_id
        and (s.kind = 'node' or s.access = 'public'
             or public.is_space_member(s.id) or public.is_moderator())
    )
  );

drop policy if exists topic_space_author_write on public.topic_space;
create policy topic_space_author_write on public.topic_space
  for insert to authenticated with check (
    exists (select 1 from public.topic t where t.id = topic_id and t.created_by = auth.uid())
  );

grant select, insert on public.topic_space to authenticated;
grant select on public.topic_space to anon;
grant all on public.topic_space to service_role;
