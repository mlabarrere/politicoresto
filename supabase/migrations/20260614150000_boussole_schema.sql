-- Boussole / candidat-match (VAA) — fondation données (PRD §4.6 / FR-23 / FR-24).
--
-- Modèle minimal Wahl-O-Mat : des thèses, et la position de chaque entité politique
-- (parti) sur chaque thèse. Le score de proximité (2/1/0) est calculé côté client à
-- partir des réponses de l'utilisateur (single-player, sans auth → maximise la
-- viralité ; cf. UJ-6).
--
-- ⚠️ DONNÉES DE POSITION ILLUSTRATIVES — placeholder pour construire/tester le
-- mécanisme. À REMPLACER par des positions SOURCÉES (citation inspectable, FR-24
-- [advanced]) avant toute exposition « sérieuse ». Référence les partis seedés.
--
-- Forward-only, idempotent. RLS : lecture publique (données de référence), écriture
-- service_role uniquement.

do $$ begin
  create type public.boussole_stance as enum ('agree', 'neutral', 'disagree');
exception when duplicate_object then null; end $$;

-- 1. Thèses
create table if not exists public.boussole_thesis (
  id         uuid primary key default gen_random_uuid(),
  ordering   integer not null unique,
  statement  text not null,
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.boussole_thesis enable row level security;

drop policy if exists boussole_thesis_public_read on public.boussole_thesis;
create policy boussole_thesis_public_read on public.boussole_thesis
  for select using (true);

grant select on public.boussole_thesis to anon, authenticated;
grant all on public.boussole_thesis to service_role;

-- 2. Positions des partis sur les thèses
create table if not exists public.boussole_position (
  thesis_id uuid not null references public.boussole_thesis(id) on delete cascade,
  entity_id uuid not null references public.political_entity(id) on delete cascade,
  stance    public.boussole_stance not null,
  primary key (thesis_id, entity_id)
);

create index if not exists boussole_position_entity_idx
  on public.boussole_position (entity_id);

alter table public.boussole_position enable row level security;

drop policy if exists boussole_position_public_read on public.boussole_position;
create policy boussole_position_public_read on public.boussole_position
  for select using (true);

grant select on public.boussole_position to anon, authenticated;
grant all on public.boussole_position to service_role;

-- 3. Seed ILLUSTRATIF (placeholder) — SQL pur, idempotent.
insert into public.boussole_thesis (ordering, statement)
select v.ordering, v.statement
from (values
  (1, 'L''État doit investir davantage dans les services publics, quitte à augmenter les impôts.'),
  (2, 'Il faut réduire l''immigration de manière significative.'),
  (3, 'La transition écologique doit être prioritaire, même si elle a un coût économique.'),
  (4, 'L''âge légal de départ à la retraite doit être abaissé.'),
  (5, 'La France doit renforcer son intégration au sein de l''Union européenne.')
) as v(ordering, statement)
on conflict (ordering) do nothing;

insert into public.boussole_position (thesis_id, entity_id, stance)
select th.id, pe.id, v.stance::public.boussole_stance
from (values
  (1, 'lfi', 'agree'),        (2, 'lfi', 'disagree'), (3, 'lfi', 'agree'),    (4, 'lfi', 'agree'),     (5, 'lfi', 'neutral'),
  (1, 'ps', 'agree'),         (2, 'ps', 'neutral'),   (3, 'ps', 'agree'),     (4, 'ps', 'agree'),      (5, 'ps', 'agree'),
  (1, 'renaissance', 'neutral'), (2, 'renaissance', 'neutral'), (3, 'renaissance', 'agree'), (4, 'renaissance', 'disagree'), (5, 'renaissance', 'agree'),
  (1, 'lr', 'disagree'),      (2, 'lr', 'agree'),     (3, 'lr', 'neutral'),   (4, 'lr', 'disagree'),   (5, 'lr', 'neutral'),
  (1, 'rn', 'neutral'),       (2, 'rn', 'agree'),     (3, 'rn', 'disagree'),  (4, 'rn', 'agree'),      (5, 'rn', 'disagree')
) as v(ordering, party_slug, stance)
join public.boussole_thesis th on th.ordering = v.ordering
join public.political_entity pe on pe.slug = v.party_slug and pe.type = 'party'
on conflict (thesis_id, entity_id) do nothing;
