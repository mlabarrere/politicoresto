begin;

-- ─────────────────────────────────────────
-- 1. Table subject
-- ─────────────────────────────────────────
create table if not exists public.subject (
  id          uuid    primary key default gen_random_uuid(),
  slug        citext  not null unique,
  name        text    not null,
  emoji       text,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default timezone('utc', now())
);

create index if not exists subject_sort_idx    on public.subject(sort_order) where is_active;
create index if not exists subject_slug_idx    on public.subject(slug)       where is_active;

-- ─────────────────────────────────────────
-- 2. M2M thread_post ↔ subject
-- ─────────────────────────────────────────
create table if not exists public.thread_post_subject (
  thread_post_id uuid not null references public.thread_post(id) on delete cascade,
  subject_id     uuid not null references public.subject(id)     on delete cascade,
  primary key (thread_post_id, subject_id)
);

create index if not exists thread_post_subject_subject_idx
  on public.thread_post_subject(subject_id);

-- ─────────────────────────────────────────
-- 3. Party tags sur thread_post
-- ─────────────────────────────────────────
alter table public.thread_post
  add column if not exists party_tags text[] not null default '{}';

-- ─────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────
alter table public.subject             enable row level security;
alter table public.thread_post_subject enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subject' and policyname = 'subject_public_read'
  ) then
    create policy subject_public_read on public.subject
      for select using (is_active = true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'thread_post_subject' and policyname = 'thread_post_subject_public_read'
  ) then
    create policy thread_post_subject_public_read on public.thread_post_subject
      for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'thread_post_subject' and policyname = 'thread_post_subject_authenticated_insert'
  ) then
    create policy thread_post_subject_authenticated_insert on public.thread_post_subject
      for insert with check (auth.role() = 'authenticated');
  end if;
end $$;

-- ─────────────────────────────────────────
-- 5. Seed — subjects
-- ─────────────────────────────────────────
insert into public.subject (slug, name, emoji, description, sort_order) values
  ('presidentielle-2027',       'Présidentielle 2027',       '🗳️', 'Élection présidentielle française de 2027 — candidats, sondages, programmes.', 1),
  ('gouvernement-lecornu',      'Gouvernement Lecornu',      '🏛️', 'Composition, actions et controverses du gouvernement Lecornu.', 2),
  ('budget-2026',               'Budget 2026',               '💰', 'Loi de finances 2026 — arbitrages, débats parlementaires, impact économique.', 3),
  ('assemblee-nationale',       'Assemblée nationale',       '🏛️', 'Actualités, votes et débats à l''Assemblée nationale.', 4),
  ('senat',                     'Sénat',                     '🏛️', 'Actualités, votes et débats au Sénat.', 5),
  ('gauche',                    'Gauche',                    '🔴', 'Actualités politiques de la gauche française — LFI, PS, Écologistes.', 6),
  ('bloc-central',              'Bloc central',              '🟡', 'Actualités du bloc gouvernemental — Renaissance, MoDem, Horizons.', 7),
  ('droite',                    'Droite',                    '🔵', 'Actualités de la droite parlementaire — LR, UDR.', 8),
  ('extreme-droite',            'Extrême droite',            '⬛', 'Actualités de l''extrême droite française — RN, Reconquête.', 9),
  ('elections-municipales-2026','Élections municipales 2026','🗳️', 'Scrutin municipal de 2026 — enjeux locaux, candidats, résultats.', 10),
  ('fin-de-vie',                'Fin de vie',                '🕊️', 'Débat sur l''aide active à mourir et les soins palliatifs.', 11),
  ('loi-duplomb',               'Loi Duplomb',               '🌾', 'Proposition de loi agricole de simplification portée par Laurent Duplomb.', 12),
  ('loi-yadan',                 'Loi Yadan',                 '⚖️', 'Proposition de loi Yadan — débat parlementaire et enjeux.', 13),
  ('loi-1er-mai',               'Loi du 1er mai',            '🔨', 'Actualités autour de la loi adoptée ou discutée le 1er mai.', 14),
  ('guerre-moyen-orient',       'Guerre au Moyen-Orient',    '🌍', 'Conflit israélo-palestinien, Gaza, Liban — réactions politiques françaises.', 15),
  ('collectivites-locales',     'Collectivités locales',     '🏘️', 'Régions, départements et communes — décentralisation, finances locales.', 16),
  ('fonction-publique',         'Fonction publique',         '🏢', 'Réforme de l''État, statut des agents publics, retraites de la fonction publique.', 17),
  ('social',                    'Social',                    '🤝', 'Protection sociale, emploi, précarité, réformes sociales.', 18),
  ('corse',                     'Corse',                     '🏝️', 'Actualités politiques et institutionnelles corses.', 19),
  ('outre-mer',                 'Outre-mer',                 '🌊', 'Départements et territoires d''outre-mer — enjeux politiques et sociaux.', 20)
on conflict (slug) do nothing;

commit;
