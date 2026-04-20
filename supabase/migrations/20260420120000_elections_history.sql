begin;

-- ─────────────────────────────────────────────────────────────
-- Historique électoral national — v1
--   But : servir de base de redressement automatisé des sondages.
--   Source : archives-resultats-elections.interieur.gouv.fr
--
--   V1 : niveau national uniquement (scope = France entière).
--   À étendre plus tard :
--     • X = découpage géographique (département / circonscription / commune)
--     • Y = segmentation démographique (âge, CSP, sexe, diplôme…)
--   → on ajoutera des tables filles (election_result_geo, election_result_demo)
--     ou des colonnes de dimension sur election_result, sans casser la v1.
-- ─────────────────────────────────────────────────────────────

create extension if not exists citext;

-- 1. Enum du type de scrutin
do $$ begin
  if not exists (select 1 from pg_type where typname = 'election_type') then
    create type public.election_type as enum (
      'presidentielle',
      'legislatives',
      'europeennes'
    );
  end if;
end $$;

-- 2. Table election (une ligne par scrutin — tour inclus)
create table if not exists public.election (
  id           uuid                 primary key default gen_random_uuid(),
  slug         citext               not null unique,
  type         public.election_type not null,
  year         int                  not null,
  round        smallint,            -- 1 ou 2 pour présidentielle/législatives, null pour européennes
  held_on      date                 not null,
  label        text                 not null,
  source_url   text,
  -- Agrégats France entière
  inscrits     bigint,
  votants      bigint,
  exprimes     bigint,
  blancs       bigint,
  nuls         bigint,
  created_at   timestamptz          not null default timezone('utc', now())
);

create index if not exists election_type_year_idx on public.election(type, year);

-- 3. Table election_result (une ligne par candidat/liste)
create table if not exists public.election_result (
  id              uuid        primary key default gen_random_uuid(),
  election_id     uuid        not null references public.election(id) on delete cascade,
  rank            smallint,
  candidate_name  text,        -- nom du candidat (présidentielle) ou tête de liste
  list_label      text,        -- libellé de la liste (européennes) ou étiquette politique
  party_slug      citext,      -- slug libre vers political_entity.slug (pas de FK stricte : partis historiques absents)
  nuance          text,        -- code Ministère de l'Intérieur (ENS, RN, NUP, LR, REC, ECO, UG, …)
  votes           bigint,
  pct_exprimes    numeric(5,2),
  pct_inscrits    numeric(5,2),
  created_at      timestamptz not null default timezone('utc', now()),
  unique (election_id, rank)
);

create index if not exists election_result_election_idx on public.election_result(election_id);
create index if not exists election_result_party_idx   on public.election_result(party_slug);

-- 4. RLS — lecture publique, écriture réservée au service_role
alter table public.election        enable row level security;
alter table public.election_result enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'election' and policyname = 'election_public_read') then
    create policy election_public_read on public.election for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'election_result' and policyname = 'election_result_public_read') then
    create policy election_result_public_read on public.election_result for select using (true);
  end if;
end $$;

grant select on public.election, public.election_result to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Seed des scrutins (8 élections nationales)
-- ─────────────────────────────────────────────────────────────
insert into public.election (slug, type, year, round, held_on, label, source_url, inscrits, votants, exprimes, blancs, nuls) values
  ('presidentielle-2022-t1', 'presidentielle', 2022, 1, '2022-04-10', 'Presidentielle 2022 - 1er tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/presidentielle-2022/FE.php',
   48747876, 35923707, 35097639, 543609, 282459),
  ('presidentielle-2022-t2', 'presidentielle', 2022, 2, '2022-04-24', 'Presidentielle 2022 - 2nd tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/presidentielle-2022/FE.php',
   48752339, 35096478, 32057320, 2233904, 805291),

  ('presidentielle-2017-t1', 'presidentielle', 2017, 1, '2017-04-23', 'Presidentielle 2017 - 1er tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/presidentielle-2017/FE.php',
   47582183, 37003728, 36054394, 659997, 289337),
  ('presidentielle-2017-t2', 'presidentielle', 2017, 2, '2017-05-07', 'Presidentielle 2017 - 2nd tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/presidentielle-2017/FE.php',
   47568693, 35467327, 31381603, 3021499, 1064225),

  ('presidentielle-2012-t1', 'presidentielle', 2012, 1, '2012-04-22', 'Presidentielle 2012 - 1er tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/PR2012/FE.php',
   46066307, 36584399, 35883209, 497268, 203922),
  ('presidentielle-2012-t2', 'presidentielle', 2012, 2, '2012-05-06', 'Presidentielle 2012 - 2nd tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/PR2012/FE.php',
   46066499, 37016309, 34861353, 1966164, 188792),

  ('legislatives-2022-t1',  'legislatives',   2022, 1, '2022-06-12', 'Legislatives 2022 - 1er tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/legislatives-2022/FE.php',
   null, null, null, null, null),
  ('legislatives-2022-t2',  'legislatives',   2022, 2, '2022-06-19', 'Legislatives 2022 - 2nd tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/legislatives-2022/FE.php',
   null, null, null, null, null),
  ('legislatives-2017-t1',  'legislatives',   2017, 1, '2017-06-11', 'Legislatives 2017 - 1er tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/legislatives-2017/FE.php',
   null, null, null, null, null),
  ('legislatives-2017-t2',  'legislatives',   2017, 2, '2017-06-18', 'Legislatives 2017 - 2nd tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/legislatives-2017/FE.php',
   null, null, null, null, null),
  ('legislatives-2012-t1',  'legislatives',   2012, 1, '2012-06-10', 'Legislatives 2012 - 1er tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/LG2012/FE.php',
   null, null, null, null, null),
  ('legislatives-2012-t2',  'legislatives',   2012, 2, '2012-06-17', 'Legislatives 2012 - 2nd tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/LG2012/FE.php',
   null, null, null, null, null),

  ('europeennes-2019',      'europeennes',    2019, null, '2019-05-26', 'Europeennes 2019',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/europeennes-2019/FE.php',
   null, null, null, null, null),
  ('europeennes-2014',      'europeennes',    2014, null, '2014-05-25', 'Europeennes 2014',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/ER2014/FE.php',
   null, null, null, null, null)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 6. Seed des résultats candidat/liste (France entiere, % exprimes)
--    NB : votes en absolu a re-verifier sur l'archive officielle ;
--    ici on amorce avec les % exprimes (suffisants pour un redressement v1).
-- ─────────────────────────────────────────────────────────────

-- Presidentielle 2022 T1
insert into public.election_result (election_id, rank, candidate_name, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'presidentielle-2022-t1'),  1, 'Emmanuel Macron',       'renaissance',   'ENS',  27.85),
  ((select id from public.election where slug = 'presidentielle-2022-t1'),  2, 'Marine Le Pen',         'rn',            'RN',   23.15),
  ((select id from public.election where slug = 'presidentielle-2022-t1'),  3, 'Jean-Luc Melenchon',    'lfi',           'FI',   21.95),
  ((select id from public.election where slug = 'presidentielle-2022-t1'),  4, 'Eric Zemmour',          'reconquete',    'REC',   7.07),
  ((select id from public.election where slug = 'presidentielle-2022-t1'),  5, 'Valerie Pecresse',      'lr',            'LR',    4.78),
  ((select id from public.election where slug = 'presidentielle-2022-t1'),  6, 'Yannick Jadot',         'ecologistes',   'ECO',   4.63),
  ((select id from public.election where slug = 'presidentielle-2022-t1'),  7, 'Jean Lassalle',         'resistons',     'DVC',   3.13),
  ((select id from public.election where slug = 'presidentielle-2022-t1'),  8, 'Fabien Roussel',        'pcf',           'COM',   2.28),
  ((select id from public.election where slug = 'presidentielle-2022-t1'),  9, 'Nicolas Dupont-Aignan', 'dlf',           'DSV',   2.06),
  ((select id from public.election where slug = 'presidentielle-2022-t1'), 10, 'Anne Hidalgo',          'ps',            'SOC',   1.75),
  ((select id from public.election where slug = 'presidentielle-2022-t1'), 11, 'Philippe Poutou',       'npa-anticapitaliste', 'EXG', 0.77),
  ((select id from public.election where slug = 'presidentielle-2022-t1'), 12, 'Nathalie Arthaud',      'lutte-ouvriere','EXG',   0.56)
on conflict (election_id, rank) do nothing;

-- Presidentielle 2022 T2
insert into public.election_result (election_id, rank, candidate_name, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'presidentielle-2022-t2'), 1, 'Emmanuel Macron', 'renaissance', 'ENS', 58.55),
  ((select id from public.election where slug = 'presidentielle-2022-t2'), 2, 'Marine Le Pen',   'rn',          'RN',  41.45)
on conflict (election_id, rank) do nothing;

-- Presidentielle 2017 T1
insert into public.election_result (election_id, rank, candidate_name, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'presidentielle-2017-t1'),  1, 'Emmanuel Macron',       'renaissance',  'EM',   24.01),
  ((select id from public.election where slug = 'presidentielle-2017-t1'),  2, 'Marine Le Pen',         'rn',           'FN',   21.30),
  ((select id from public.election where slug = 'presidentielle-2017-t1'),  3, 'Francois Fillon',       'lr',           'LR',   20.01),
  ((select id from public.election where slug = 'presidentielle-2017-t1'),  4, 'Jean-Luc Melenchon',    'lfi',          'FI',   19.58),
  ((select id from public.election where slug = 'presidentielle-2017-t1'),  5, 'Benoit Hamon',          'ps',           'SOC',   6.36),
  ((select id from public.election where slug = 'presidentielle-2017-t1'),  6, 'Nicolas Dupont-Aignan', 'dlf',          'DLF',   4.70),
  ((select id from public.election where slug = 'presidentielle-2017-t1'),  7, 'Jean Lassalle',         'resistons',    'DVD',   1.21),
  ((select id from public.election where slug = 'presidentielle-2017-t1'),  8, 'Philippe Poutou',       'npa-anticapitaliste', 'EXG', 1.09),
  ((select id from public.election where slug = 'presidentielle-2017-t1'),  9, 'Francois Asselineau',   'upr',          'EXD',   0.92),
  ((select id from public.election where slug = 'presidentielle-2017-t1'), 10, 'Nathalie Arthaud',      'lutte-ouvriere','EXG',   0.64),
  ((select id from public.election where slug = 'presidentielle-2017-t1'), 11, 'Jacques Cheminade',     null,           'DIV',   0.18)
on conflict (election_id, rank) do nothing;

-- Presidentielle 2017 T2
insert into public.election_result (election_id, rank, candidate_name, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'presidentielle-2017-t2'), 1, 'Emmanuel Macron', 'renaissance', 'EM', 66.10),
  ((select id from public.election where slug = 'presidentielle-2017-t2'), 2, 'Marine Le Pen',   'rn',          'FN', 33.90)
on conflict (election_id, rank) do nothing;

-- Presidentielle 2012 T1
insert into public.election_result (election_id, rank, candidate_name, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'presidentielle-2012-t1'),  1, 'Francois Hollande',     'ps',            'SOC', 28.63),
  ((select id from public.election where slug = 'presidentielle-2012-t1'),  2, 'Nicolas Sarkozy',       'lr',            'UMP', 27.18),
  ((select id from public.election where slug = 'presidentielle-2012-t1'),  3, 'Marine Le Pen',         'rn',            'FN',  17.90),
  ((select id from public.election where slug = 'presidentielle-2012-t1'),  4, 'Jean-Luc Melenchon',    'pcf',           'FG',  11.10),
  ((select id from public.election where slug = 'presidentielle-2012-t1'),  5, 'Francois Bayrou',       'modem',         'MDM',  9.13),
  ((select id from public.election where slug = 'presidentielle-2012-t1'),  6, 'Eva Joly',              'ecologistes',   'ECO',  2.31),
  ((select id from public.election where slug = 'presidentielle-2012-t1'),  7, 'Nicolas Dupont-Aignan', 'dlf',           'DLR',  1.79),
  ((select id from public.election where slug = 'presidentielle-2012-t1'),  8, 'Philippe Poutou',       'npa-anticapitaliste', 'EXG', 1.15),
  ((select id from public.election where slug = 'presidentielle-2012-t1'),  9, 'Nathalie Arthaud',      'lutte-ouvriere','EXG',  0.56),
  ((select id from public.election where slug = 'presidentielle-2012-t1'), 10, 'Jacques Cheminade',     null,            'DIV',  0.25)
on conflict (election_id, rank) do nothing;

-- Presidentielle 2012 T2
insert into public.election_result (election_id, rank, candidate_name, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'presidentielle-2012-t2'), 1, 'Francois Hollande', 'ps', 'SOC', 51.64),
  ((select id from public.election where slug = 'presidentielle-2012-t2'), 2, 'Nicolas Sarkozy',   'lr', 'UMP', 48.36)
on conflict (election_id, rank) do nothing;

-- Europeennes 2019 (listes principales ; liste exhaustive a completer)
insert into public.election_result (election_id, rank, candidate_name, list_label, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'europeennes-2019'),  1, 'Jordan Bardella',    'Rassemblement national',                     'rn',          'RN',  23.34),
  ((select id from public.election where slug = 'europeennes-2019'),  2, 'Nathalie Loiseau',   'Renaissance (LREM-MoDem-Agir)',              'renaissance', 'REM', 22.42),
  ((select id from public.election where slug = 'europeennes-2019'),  3, 'Yannick Jadot',      'Europe Ecologie Les Verts',                  'ecologistes', 'ECO', 13.48),
  ((select id from public.election where slug = 'europeennes-2019'),  4, 'Francois-Xavier Bellamy', 'Les Republicains',                      'lr',          'LR',   8.48),
  ((select id from public.election where slug = 'europeennes-2019'),  5, 'Manon Aubry',        'La France insoumise',                        'lfi',         'FI',   6.31),
  ((select id from public.election where slug = 'europeennes-2019'),  6, 'Raphael Glucksmann', 'Envie d''Europe (PS-Place publique)',        'ps',          'SOC',  6.19),
  ((select id from public.election where slug = 'europeennes-2019'),  7, 'Nicolas Dupont-Aignan', 'Debout la France',                        'dlf',         'DLF',  3.51),
  ((select id from public.election where slug = 'europeennes-2019'),  8, 'Benoit Hamon',       'Generation.s',                               'generations', 'DVG',  3.27),
  ((select id from public.election where slug = 'europeennes-2019'),  9, 'Ian Brossat',        'Parti communiste francais',                  'pcf',         'COM',  2.49),
  ((select id from public.election where slug = 'europeennes-2019'), 10, 'Helene Thouy',       'Parti animaliste',                           'parti-animaliste', 'DIV', 2.17),
  ((select id from public.election where slug = 'europeennes-2019'), 11, 'Francois Asselineau','Union populaire republicaine',               'upr',         'EXD',  1.17),
  ((select id from public.election where slug = 'europeennes-2019'), 12, 'Nathalie Arthaud',   'Lutte ouvriere',                             'lutte-ouvriere','EXG', 0.78)
on conflict (election_id, rank) do nothing;

-- Europeennes 2014 (listes principales)
insert into public.election_result (election_id, rank, candidate_name, list_label, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'europeennes-2014'),  1, 'Marine Le Pen',       'Front national',                  'rn',           'FN',  24.86),
  ((select id from public.election where slug = 'europeennes-2014'),  2, null,                  'UMP',                             'lr',           'UMP', 20.81),
  ((select id from public.election where slug = 'europeennes-2014'),  3, null,                  'Parti socialiste - PRG',          'ps',           'SOC', 13.98),
  ((select id from public.election where slug = 'europeennes-2014'),  4, null,                  'UDI - MoDem (Alternative)',       'udi',          'UDI',  9.94),
  ((select id from public.election where slug = 'europeennes-2014'),  5, null,                  'Europe Ecologie Les Verts',       'ecologistes',  'ECO',  8.95),
  ((select id from public.election where slug = 'europeennes-2014'),  6, null,                  'Front de Gauche',                 'pcf',           'FG',  6.61),
  ((select id from public.election where slug = 'europeennes-2014'),  7, 'Nicolas Dupont-Aignan','Debout la Republique',            'dlf',          'DLR',  3.82)
on conflict (election_id, rank) do nothing;

-- Legislatives 2012/2017/2022 : TODO — a seed par nuance (NUPES, ENS, RN, LR, REC, DVG, DVD, …)
--   rang principal : % exprimes au niveau national par bloc/nuance (1er tour).
--   laisse vide pour l'instant, la structure accepte l'ajout incremental.

commit;
