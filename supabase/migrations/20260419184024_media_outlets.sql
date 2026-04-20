begin;

-- ─────────────────────────────────────────
-- 1. Table media_outlet
-- ─────────────────────────────────────────
create table if not exists public.media_outlet (
  id                  uuid    primary key default gen_random_uuid(),
  slug                citext  not null unique,
  name                text    not null,
  segment             text    not null,
  -- segment values : 'quotidien_national' | 'quotidien_regional' | 'hebdomadaire' | 'tv' | 'radio' | 'pure_player'
  direction           text,
  journalistes_phares text[]  not null default '{}',
  is_active           boolean not null default true,
  created_at          timestamptz not null default timezone('utc', now())
);

create index if not exists media_outlet_segment_idx on public.media_outlet(segment) where is_active;

-- ─────────────────────────────────────────
-- 2. RLS — lecture publique, écriture service_role uniquement
-- ─────────────────────────────────────────
alter table public.media_outlet enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'media_outlet' and policyname = 'media_outlet_public_read'
  ) then
    create policy media_outlet_public_read on public.media_outlet
      for select using (is_active = true);
  end if;
end $$;

-- ─────────────────────────────────────────
-- 3. Seed
-- ─────────────────────────────────────────
insert into public.media_outlet (slug, name, segment, direction, journalistes_phares) values

  -- Presse quotidienne nationale
  ('le-monde',
   'Le Monde',
   'quotidien_national',
   'Louis Dreyfus (president du directoire), Jerome Fenoglio (directeur), Caroline Monnot (direction de la redaction)',
   array['Jerome Fenoglio', 'Caroline Monnot', 'Cedric Pietralunga']),

  ('le-figaro',
   'Le Figaro',
   'quotidien_national',
   'Alexis Brezet (directeur de la redaction)',
   array['Alexis Brezet', 'Vincent Tremolet de Villers', 'Yves Threard']),

  ('liberation',
   'Liberation',
   'quotidien_national',
   'Dov Alfon (ancien directeur)',
   array['Dov Alfon']),

  ('les-echos',
   'Les Echos',
   'quotidien_national',
   'Christophe Jakubyszyn (directeur de la redaction)',
   array['Christophe Jakubyszyn', 'Francois Vidal']),

  ('le-parisien',
   'Le Parisien / Aujourd''hui en France',
   'quotidien_national',
   'Pierre Louette (directeur de publication), Nicolas Charbonneau (directeur de la redaction)',
   array['Nicolas Charbonneau']),

  -- Presse quotidienne regionale
  ('ouest-france',
   'Ouest-France',
   'quotidien_regional',
   'Francois-Xavier Lefranc (president du directoire / directeur de publication)',
   array['Francois-Xavier Lefranc']),

  ('la-depeche-du-midi',
   'La Depeche du Midi',
   'quotidien_regional',
   'Jean-Nicolas Baylet (directeur general / directeur de publication)',
   array['Jean-Nicolas Baylet']),

  -- Pure players
  ('mediapart',
   'Mediapart',
   'pure_player',
   'Carine Fouteau (presidente et directrice de la publication)',
   array['Carine Fouteau', 'Edwy Plenel', 'Fabrice Arfi']),

  -- Hebdomadaires
  ('marianne',
   'Marianne',
   'hebdomadaire',
   'Frederick Cassegrain (directeur de publication), Frederic Taddei (directeur), Eve Szeftel (directrice de la redaction)',
   array['Eve Szeftel', 'Natacha Polony']),

  ('le-point',
   'Le Point',
   'hebdomadaire',
   'Etienne Gernelle (directeur de publication), Valerie Toranian (directrice de la redaction)',
   array['Etienne Gernelle', 'Guillaume Grallet', 'Romain Gubert']),

  -- Television
  ('tf1',
   'TF1',
   'tv',
   'Rodolphe Belmer (directeur du groupe TF1)',
   array['Gilles Bouleau', 'Anne-Claire Coudray', 'Marie-Sophie Lacarrau']),

  ('france-2',
   'France Televisions / France 2',
   'tv',
   'Delphine Ernotte (PDG)',
   array['Caroline Roux', 'Laurent Delahousse', 'Lea Salame']),

  ('lci',
   'LCI',
   'tv',
   null,
   array['David Pujadas', 'Darius Rochebin', 'Ruth Elkrief', 'Margot Haddad']),

  ('bfmtv',
   'BFMTV',
   'tv',
   'Fabien Namias (directeur general)',
   array['Apolline de Malherbe', 'Maxime Switek', 'Marc Fauvelle']),

  ('cnews',
   'CNews',
   'tv',
   'Serge Nedjar (direction generale)',
   array['Pascal Praud', 'Sonia Mabrouk', 'Laurence Ferrari']),

  -- Radio
  ('radio-france',
   'Radio France',
   'radio',
   'Sibyle Veil (PDG), Vincent Meslet (directeur editorial)',
   array['Nicolas Demorand', 'Sonia Devillers', 'Benjamin Duhamel']),

  ('rtl',
   'RTL',
   'radio',
   'Jonathan Curiel (direction)',
   array['Thomas Sotto', 'Amandine Begot', 'Yves Calvi']),

  ('europe-1',
   'Europe 1',
   'radio',
   'Constance Benque (directrice de publication)',
   array['Dimitri Pavlenko', 'Sonia Mabrouk']),

  ('radio-classique',
   'Radio Classique',
   'radio',
   'Herve Gattegno (directeur de la redaction)',
   array['Herve Gattegno', 'David Abiker'])

on conflict (slug) do nothing;

commit;
