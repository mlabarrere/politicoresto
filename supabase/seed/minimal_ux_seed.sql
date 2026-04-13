begin;

-- Politicoresto minimal UX seed
-- Reduced but narrative dataset for public and personal screens.

-- --------------------------------------------------------------------------
-- Territories
-- --------------------------------------------------------------------------

with territory_seed (
  territory_level,
  country_code,
  territory_code,
  name,
  normalized_name,
  parent_country_code,
  parent_territory_code,
  region_code,
  department_code,
  commune_code
) as (
  values
    ('region'::public.territory_level, 'FR', '11', 'Ile-de-France', 'ile-de-france', 'FR', 'france', '11', null, null),
    ('region'::public.territory_level, 'FR', '93', 'Provence-Alpes-Cote d''Azur', 'provence-alpes-cote-d-azur', 'FR', 'france', '93', null, null),
    ('region'::public.territory_level, 'FR', '84', 'Auvergne-Rhone-Alpes', 'auvergne-rhone-alpes', 'FR', 'france', '84', null, null),
    ('region'::public.territory_level, 'FR', '76', 'Occitanie', 'occitanie', 'FR', 'france', '76', null, null),
    ('region'::public.territory_level, 'FR', '32', 'Hauts-de-France', 'hauts-de-france', 'FR', 'france', '32', null, null),
    ('department'::public.territory_level, 'FR', '75', 'Paris', 'paris', 'FR', '11', '11', '75', null),
    ('department'::public.territory_level, 'FR', '13', 'Bouches-du-Rhone', 'bouches-du-rhone', 'FR', '93', '93', '13', null),
    ('department'::public.territory_level, 'FR', '69', 'Rhone', 'rhone', 'FR', '84', '84', '69', null),
    ('department'::public.territory_level, 'FR', '31', 'Haute-Garonne', 'haute-garonne', 'FR', '76', '76', '31', null),
    ('department'::public.territory_level, 'FR', '59', 'Nord', 'nord', 'FR', '32', '32', '59', null),
    ('commune'::public.territory_level, 'FR', '75056', 'Paris', 'paris', 'FR', '75', '11', '75', '75056'),
    ('commune'::public.territory_level, 'FR', '13055', 'Marseille', 'marseille', 'FR', '13', '93', '13', '13055'),
    ('commune'::public.territory_level, 'FR', '69123', 'Lyon', 'lyon', 'FR', '69', '84', '69', '69123'),
    ('commune'::public.territory_level, 'FR', '31555', 'Toulouse', 'toulouse', 'FR', '31', '76', '31', '31555'),
    ('commune'::public.territory_level, 'FR', '59350', 'Lille', 'lille', 'FR', '59', '32', '59', '59350')
)
insert into public.territory_reference(
  territory_level,
  country_code,
  territory_code,
  name,
  normalized_name,
  parent_id,
  region_code,
  department_code,
  commune_code
)
select
  ts.territory_level,
  ts.country_code,
  ts.territory_code,
  ts.name,
  ts.normalized_name,
  parent_ref.id,
  ts.region_code,
  ts.department_code,
  ts.commune_code
from territory_seed ts
left join public.territory_reference parent_ref
  on parent_ref.country_code = ts.parent_country_code
 and parent_ref.territory_code = ts.parent_territory_code
on conflict (country_code, territory_code) do update
set
  territory_level = excluded.territory_level,
  name = excluded.name,
  normalized_name = excluded.normalized_name,
  parent_id = excluded.parent_id,
  region_code = excluded.region_code,
  department_code = excluded.department_code,
  commune_code = excluded.commune_code;

select public.refresh_territory_closure();

-- --------------------------------------------------------------------------
-- Auth users and public profiles
-- --------------------------------------------------------------------------

with user_seed (
  user_id,
  username,
  email,
  display_name,
  bio,
  territory_country_code,
  territory_code
) as (
  values
    ('00000000-0000-0000-0000-000000000101'::uuid, 'claire-vignal', 'claire.vignal@politicoresto.test', 'Claire Vignal', 'Suit les coalitions nationales et les bascules territoriales.', 'FR', '75056'),
    ('00000000-0000-0000-0000-000000000102'::uuid, 'samir-dervaux', 'samir.dervaux@politicoresto.test', 'Samir Dervaux', 'Observe les compromis parlementaires et les rapports de force.', 'FR', '75056'),
    ('00000000-0000-0000-0000-000000000103'::uuid, 'nora-benhaim', 'nora.benhaim@politicoresto.test', 'Nora Benhaim', 'Travaille les sujets municipaux et les dynamiques locales du sud.', 'FR', '13055'),
    ('00000000-0000-0000-0000-000000000104'::uuid, 'lucien-morel', 'lucien.morel@politicoresto.test', 'Lucien Morel', 'Profile data et institutions pour les grandes villes.', 'FR', '69123'),
    ('00000000-0000-0000-0000-000000000105'::uuid, 'ines-rivaton', 'ines.rivaton@politicoresto.test', 'Ines Rivaton', 'Suit les procedures publiques et la vie locale du nord.', 'FR', '59350'),
    ('00000000-0000-0000-0000-000000000106'::uuid, 'matthieu-sorel', 'matthieu.sorel@politicoresto.test', 'Matthieu Sorel', 'Regarde les compromis europeens et les signaux diplomatiques.', 'ZZ', 'europe'),
    ('00000000-0000-0000-0000-000000000107'::uuid, 'camille-renaud', 'camille.renaud@politicoresto.test', 'Camille Renaud', 'Couvre Toulouse, les mobilites et les consultations locales.', 'FR', '31555'),
    ('00000000-0000-0000-0000-000000000108'::uuid, 'yacine-fares', 'yacine.fares@politicoresto.test', 'Yacine Fares', 'Suit les sujets metropolitains et les recompositions marseillaises.', 'FR', '13055'),
    ('00000000-0000-0000-0000-000000000109'::uuid, 'elise-montfort', 'elise.montfort@politicoresto.test', 'Elise Montfort', 'Observe les personnalites, les retours mediatiques et les congres.', 'FR', '75056'),
    ('00000000-0000-0000-0000-000000000110'::uuid, 'romain-vidal', 'romain.vidal@politicoresto.test', 'Romain Vidal', 'Travaille les signaux de campagne et les trajectoires partisanes.', 'FR', '69123'),
    ('00000000-0000-0000-0000-000000000111'::uuid, 'sophie-carrel', 'sophie.carrel@politicoresto.test', 'Sophie Carrel', 'Suit les compromis social-democrates et les equilibres regionaux.', 'FR', '59350'),
    ('00000000-0000-0000-0000-000000000112'::uuid, 'thomas-brehat', 'thomas.brehat@politicoresto.test', 'Thomas Brehat', 'Suit les sujets institutionnels a rythme lent.', 'FR', 'france')
)
insert into auth.users(
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
select
  us.user_id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  us.email,
  crypt('politicoresto-demo-password', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', us.display_name),
  timezone('utc', now()),
  timezone('utc', now()),
  '',
  '',
  '',
  ''
from user_seed us
on conflict (id) do update
set
  email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

with user_seed (
  user_id,
  username,
  display_name,
  bio,
  territory_country_code,
  territory_code
) as (
  values
    ('00000000-0000-0000-0000-000000000101'::uuid, 'claire-vignal', 'Claire Vignal', 'Suit les coalitions nationales et les bascules territoriales.', 'FR', '75056'),
    ('00000000-0000-0000-0000-000000000102'::uuid, 'samir-dervaux', 'Samir Dervaux', 'Observe les compromis parlementaires et les rapports de force.', 'FR', '75056'),
    ('00000000-0000-0000-0000-000000000103'::uuid, 'nora-benhaim', 'Nora Benhaim', 'Travaille les sujets municipaux et les dynamiques locales du sud.', 'FR', '13055'),
    ('00000000-0000-0000-0000-000000000104'::uuid, 'lucien-morel', 'Lucien Morel', 'Profile data et institutions pour les grandes villes.', 'FR', '69123'),
    ('00000000-0000-0000-0000-000000000105'::uuid, 'ines-rivaton', 'Ines Rivaton', 'Suit les procedures publiques et la vie locale du nord.', 'FR', '59350'),
    ('00000000-0000-0000-0000-000000000106'::uuid, 'matthieu-sorel', 'Matthieu Sorel', 'Regarde les compromis europeens et les signaux diplomatiques.', 'ZZ', 'europe'),
    ('00000000-0000-0000-0000-000000000107'::uuid, 'camille-renaud', 'Camille Renaud', 'Couvre Toulouse, les mobilites et les consultations locales.', 'FR', '31555'),
    ('00000000-0000-0000-0000-000000000108'::uuid, 'yacine-fares', 'Yacine Fares', 'Suit les sujets metropolitains et les recompositions marseillaises.', 'FR', '13055'),
    ('00000000-0000-0000-0000-000000000109'::uuid, 'elise-montfort', 'Elise Montfort', 'Observe les personnalites, les retours mediatiques et les congres.', 'FR', '75056'),
    ('00000000-0000-0000-0000-000000000110'::uuid, 'romain-vidal', 'Romain Vidal', 'Travaille les signaux de campagne et les trajectoires partisanes.', 'FR', '69123'),
    ('00000000-0000-0000-0000-000000000111'::uuid, 'sophie-carrel', 'Sophie Carrel', 'Suit les compromis social-democrates et les equilibres regionaux.', 'FR', '59350'),
    ('00000000-0000-0000-0000-000000000112'::uuid, 'thomas-brehat', 'Thomas Brehat', 'Suit les sujets institutionnels a rythme lent.', 'FR', 'france')
)
update public.app_profile p
set
  username = us.username,
  display_name = us.display_name,
  bio = us.bio,
  public_territory_id = tr.id,
  is_public_profile_enabled = true,
  profile_status = 'active',
  last_seen_at = timezone('utc', now()) - interval '1 day'
from user_seed us
join public.territory_reference tr
  on tr.country_code = us.territory_country_code
 and tr.territory_code = us.territory_code
where p.user_id = us.user_id;

update public.user_visibility_settings
set
  display_name_visibility = 'public',
  bio_visibility = 'public',
  territory_visibility = 'public',
  card_inventory_visibility = 'public',
  prediction_history_visibility = 'authenticated'
where user_id in (
  '00000000-0000-0000-0000-000000000101'::uuid,
  '00000000-0000-0000-0000-000000000102'::uuid,
  '00000000-0000-0000-0000-000000000103'::uuid,
  '00000000-0000-0000-0000-000000000104'::uuid,
  '00000000-0000-0000-0000-000000000105'::uuid,
  '00000000-0000-0000-0000-000000000106'::uuid,
  '00000000-0000-0000-0000-000000000107'::uuid,
  '00000000-0000-0000-0000-000000000108'::uuid,
  '00000000-0000-0000-0000-000000000109'::uuid,
  '00000000-0000-0000-0000-000000000110'::uuid,
  '00000000-0000-0000-0000-000000000111'::uuid,
  '00000000-0000-0000-0000-000000000112'::uuid
);

-- --------------------------------------------------------------------------
-- Card families and catalog
-- --------------------------------------------------------------------------

insert into public.card_family(id, slug, label, family_type, description)
values
  ('00000000-0000-0000-0000-000000000701'::uuid, 'territory', 'Territory', 'territory', 'Rewards visible territorial exploration and local presence.'),
  ('00000000-0000-0000-0000-000000000705'::uuid, 'exploration', 'Exploration', 'exploration', 'Rewards exploration beyond a single local sequence.'),
  ('00000000-0000-0000-0000-000000000702'::uuid, 'event', 'Event', 'event', 'Rewards participation in notable political sequences.'),
  ('00000000-0000-0000-0000-000000000703'::uuid, 'role', 'Role', 'role', 'Highlights recurrent contribution roles.'),
  ('00000000-0000-0000-0000-000000000704'::uuid, 'archetype', 'Archetype', 'archetype', 'Rewards recognizable contribution patterns.')
on conflict (slug) do update
set
  label = excluded.label,
  family_type = excluded.family_type,
  description = excluded.description;

insert into public.card_catalog(id, family_id, slug, label, description, rarity, is_stackable, is_active)
values
  ('00000000-0000-0000-0000-000000000711'::uuid, (select id from public.card_family where slug = 'territory'), 'paris-observer', 'Paris Observer', 'Awarded for recurrent visible activity on Paris topics.', 'common', false, true),
  ('00000000-0000-0000-0000-000000000712'::uuid, (select id from public.card_family where slug = 'territory'), 'marseille-watch', 'Marseille Watch', 'Awarded for visible contribution on Marseille municipal sequences.', 'uncommon', false, true),
  ('00000000-0000-0000-0000-000000000713'::uuid, (select id from public.card_family where slug = 'exploration'), 'european-watcher', 'European Watcher', 'Awarded for visible participation on Europe-facing topics.', 'uncommon', false, true),
  ('00000000-0000-0000-0000-000000000714'::uuid, (select id from public.card_family where slug = 'event'), 'municipal-cycle', 'Municipal Cycle', 'Awarded for repeated participation on big-city municipal topics.', 'rare', false, true),
  ('00000000-0000-0000-0000-000000000715'::uuid, (select id from public.card_family where slug = 'role'), 'procedure-reader', 'Procedure Reader', 'Awarded for useful attention to procedural and judicial follow-up.', 'uncommon', false, true),
  ('00000000-0000-0000-0000-000000000716'::uuid, (select id from public.card_family where slug = 'archetype'), 'consensus-shift', 'Consensus Shift', 'Awarded for strong timing on topics whose aggregate moved sharply.', 'rare', false, true)
on conflict (slug) do update
set
  family_id = excluded.family_id,
  label = excluded.label,
  description = excluded.description,
  rarity = excluded.rarity,
  is_stackable = excluded.is_stackable,
  is_active = excluded.is_active;

-- --------------------------------------------------------------------------
-- Spaces
-- --------------------------------------------------------------------------

insert into public.space(id, slug, name, description, space_type, space_status, visibility, created_by)
values
  ('00000000-0000-0000-0000-000000000201'::uuid, 'presidentielle-2027', 'Presidentielle 2027', 'Sujets de trajectoire, d''offre et de coalition autour de l''echeance presidentielle.', 'institutional', 'active', 'public', '00000000-0000-0000-0000-000000000101'::uuid),
  ('00000000-0000-0000-0000-000000000202'::uuid, 'municipales-grandes-villes', 'Municipales grandes villes', 'Lecture locale des grands equilibres municipaux et metropolitains.', 'institutional', 'active', 'public', '00000000-0000-0000-0000-000000000103'::uuid),
  ('00000000-0000-0000-0000-000000000203'::uuid, 'justice-affaires', 'Justice et affaires publiques', 'Suivi des procedures publiques, des justifications et des horizons de resolution.', 'thematic', 'active', 'public', '00000000-0000-0000-0000-000000000105'::uuid),
  ('00000000-0000-0000-0000-000000000204'::uuid, 'gouvernement-institutions', 'Gouvernement et institutions', 'Sujets de calendrier, de majorite et de tension institutionnelle.', 'institutional', 'active', 'public', '00000000-0000-0000-0000-000000000102'::uuid),
  ('00000000-0000-0000-0000-000000000205'::uuid, 'geopolitique-europe', 'Geopolitique Europe', 'Compromis, delais et arbitrages du niveau europeen.', 'thematic', 'active', 'public', '00000000-0000-0000-0000-000000000106'::uuid),
  ('00000000-0000-0000-0000-000000000206'::uuid, 'partis-congres', 'Partis et congres', 'Dynamiques partisanes, lignes majoritaires et primaires internes.', 'thematic', 'active', 'public', '00000000-0000-0000-0000-000000000109'::uuid),
  ('00000000-0000-0000-0000-000000000207'::uuid, 'ile-de-france-politique', 'Ile-de-France politique', 'Sujets territoriaux denses autour de Paris et de la region capitale.', 'geographic', 'active', 'public', '00000000-0000-0000-0000-000000000101'::uuid),
  ('00000000-0000-0000-0000-000000000208'::uuid, 'personnalites-strategies', 'Personnalites et strategies', 'Trajectoires publiques, retours mediatiques et signaux de positionnement.', 'editorial', 'active', 'public', '00000000-0000-0000-0000-000000000109'::uuid)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  space_type = excluded.space_type,
  space_status = excluded.space_status,
  visibility = excluded.visibility,
  created_by = excluded.created_by;

insert into public.space_scope(id, space_id, taxonomy_term_id, territory_id, is_primary)
values
  ('00000000-0000-0000-0000-000000000221'::uuid, (select id from public.space where slug = 'presidentielle-2027'), (select tt.id from public.taxonomy_term tt join public.taxonomy_axis ta on ta.id = tt.axis_id where ta.slug = 'institution_election' and tt.slug = 'presidential'), null, true),
  ('00000000-0000-0000-0000-000000000222'::uuid, (select id from public.space where slug = 'municipales-grandes-villes'), (select tt.id from public.taxonomy_term tt join public.taxonomy_axis ta on ta.id = tt.axis_id where ta.slug = 'institution_election' and tt.slug = 'municipal'), null, true),
  ('00000000-0000-0000-0000-000000000223'::uuid, (select id from public.space where slug = 'justice-affaires'), (select tt.id from public.taxonomy_term tt join public.taxonomy_axis ta on ta.id = tt.axis_id where ta.slug = 'topic_nature' and tt.slug = 'judicial'), null, true),
  ('00000000-0000-0000-0000-000000000224'::uuid, (select id from public.space where slug = 'gouvernement-institutions'), (select tt.id from public.taxonomy_term tt join public.taxonomy_axis ta on ta.id = tt.axis_id where ta.slug = 'topic_nature' and tt.slug = 'institutional'), null, true),
  ('00000000-0000-0000-0000-000000000225'::uuid, (select id from public.space where slug = 'geopolitique-europe'), (select tt.id from public.taxonomy_term tt join public.taxonomy_axis ta on ta.id = tt.axis_id where ta.slug = 'topic_nature' and tt.slug = 'geopolitical'), null, true),
  ('00000000-0000-0000-0000-000000000226'::uuid, (select id from public.space where slug = 'partis-congres'), (select tt.id from public.taxonomy_term tt join public.taxonomy_axis ta on ta.id = tt.axis_id where ta.slug = 'topic_nature' and tt.slug = 'partisan-internal'), null, true),
  ('00000000-0000-0000-0000-000000000227'::uuid, (select id from public.space where slug = 'ile-de-france-politique'), null, (select id from public.territory_reference where country_code = 'FR' and territory_code = '11'), true),
  ('00000000-0000-0000-0000-000000000228'::uuid, (select id from public.space where slug = 'personnalites-strategies'), (select tt.id from public.taxonomy_term tt join public.taxonomy_axis ta on ta.id = tt.axis_id where ta.slug = 'entity_kind' and tt.slug = 'personality'), null, true)
on conflict (id) do update
set
  space_id = excluded.space_id,
  taxonomy_term_id = excluded.taxonomy_term_id,
  territory_id = excluded.territory_id,
  is_primary = excluded.is_primary;

-- --------------------------------------------------------------------------
-- Topics are first inserted as open so submissions remain valid.
-- --------------------------------------------------------------------------

with topic_seed (
  id,
  space_slug,
  slug,
  title,
  description,
  created_by,
  open_at,
  close_at,
  resolve_deadline_at,
  primary_country_code,
  primary_territory_code,
  is_sensitive
) as (
  values
    ('00000000-0000-0000-0000-000000000301'::uuid, 'presidentielle-2027', 'union-droite-printemps-2027', 'Qui portera l''union de la droite parlementaire au printemps 2027 ?', 'Sujet de coalition nationale sur le type de figure le plus rassembleur a droite.', '00000000-0000-0000-0000-000000000101'::uuid, '2026-02-10 09:00:00+00', '2026-04-20 20:00:00+00', '2026-04-28 20:00:00+00', 'FR', 'france', false),
    ('00000000-0000-0000-0000-000000000302'::uuid, 'gouvernement-institutions', 'motion-censure-avant-automne', 'Le gouvernement survivra-t-il a une motion de censure avant l''automne ?', 'Lecture institutionnelle simple d''un risque de rupture parlementaire.', '00000000-0000-0000-0000-000000000102'::uuid, '2026-03-01 08:00:00+00', '2026-05-15 18:00:00+00', '2026-05-22 18:00:00+00', 'FR', 'france', false),
    ('00000000-0000-0000-0000-000000000303'::uuid, 'ile-de-france-politique', 'budget-paris-defections-2026', 'Combien de defections compter au vote final du budget de Paris 2026 ?', 'Sujet municipal dense, deja clos, en attente de consolidation du decompte final.', '00000000-0000-0000-0000-000000000101'::uuid, '2026-01-20 08:00:00+00', '2026-03-26 19:00:00+00', '2026-04-04 19:00:00+00', 'FR', '75056', false),
    ('00000000-0000-0000-0000-000000000304'::uuid, 'municipales-grandes-villes', 'remaniement-marseille-date', 'A quelle date le maire de Marseille annoncera-t-il son remaniement politique ?', 'Question de calendrier local sur une recomposition d''equipe attendue.', '00000000-0000-0000-0000-000000000103'::uuid, '2026-03-05 08:00:00+00', '2026-04-18 20:00:00+00', '2026-04-25 20:00:00+00', 'FR', '13055', false),
    ('00000000-0000-0000-0000-000000000305'::uuid, 'municipales-grandes-villes', 'score-alliance-ecologiste-lyon', 'Quel score de premier tour pour l''alliance ecologiste a Lyon en 2026 ?', 'Sujet municipal de pre-campagne a forte valeur comparative.', '00000000-0000-0000-0000-000000000104'::uuid, '2026-02-28 08:00:00+00', '2026-04-24 20:00:00+00', '2026-05-01 20:00:00+00', 'FR', '69123', false),
    ('00000000-0000-0000-0000-000000000306'::uuid, 'municipales-grandes-villes', 'participation-consultation-toulouse', 'Quel volume de participation pour la consultation mobilite a Toulouse ?', 'Sujet local sur un volume borne utile au test des ecrans numeriques.', '00000000-0000-0000-0000-000000000107'::uuid, '2026-03-02 08:00:00+00', '2026-04-19 20:00:00+00', '2026-04-26 20:00:00+00', 'FR', '31555', false),
    ('00000000-0000-0000-0000-000000000307'::uuid, 'geopolitique-europe', 'compromis-elargissement-octobre', 'Le Conseil europeen actera-t-il un compromis sur l''elargissement avant octobre ?', 'Sujet geopolitique volontairement verrouille avant fermeture pour tester les variantes d''etat.', '00000000-0000-0000-0000-000000000106'::uuid, '2026-03-10 09:00:00+00', '2026-06-01 20:00:00+00', '2026-06-08 20:00:00+00', 'ZZ', 'europe', false),
    ('00000000-0000-0000-0000-000000000308'::uuid, 'gouvernement-institutions', 'tension-cmp-texte-institutionnel', 'Quel niveau de tension pour la commission mixte sur le texte institutionnel ?', 'Mesure ordinale de tension procedurale pour un sujet institutionnel lent.', '00000000-0000-0000-0000-000000000102'::uuid, '2026-03-03 09:00:00+00', '2026-04-30 20:00:00+00', '2026-05-07 20:00:00+00', 'FR', 'france', false),
    ('00000000-0000-0000-0000-000000000309'::uuid, 'justice-affaires', 'renvoi-metropole-marches-publics', 'La procedure sur les marches publics de la metropole sera-t-elle renvoyee avant l''ete ?', 'Sujet judiciaire public sans personne nommee, clos et en attente de confirmation procedurale.', '00000000-0000-0000-0000-000000000105'::uuid, '2026-01-25 08:00:00+00', '2026-03-24 18:00:00+00', '2026-04-12 18:00:00+00', 'FR', '13055', true),
    ('00000000-0000-0000-0000-000000000310'::uuid, 'partis-congres', 'ligne-majoritaire-congres-social-democrate', 'Quelle ligne majoritaire au congres social-democrate regional ?', 'Sujet partisan deja tranche, utile pour les ecrans de resolution et de scoring.', '00000000-0000-0000-0000-000000000111'::uuid, '2026-01-10 08:00:00+00', '2026-03-15 18:00:00+00', '2026-03-20 18:00:00+00', 'FR', '59350', false),
    ('00000000-0000-0000-0000-000000000311'::uuid, 'gouvernement-institutions', 'taux-adoption-amendements-compromis', 'Quel taux d''adoption pour les amendements budgetaires de compromis ?', 'Sujet resolu permettant d''illustrer une prediction numerique sur institutions.', '00000000-0000-0000-0000-000000000102'::uuid, '2026-01-15 08:00:00+00', '2026-03-12 18:00:00+00', '2026-03-18 18:00:00+00', 'FR', 'france', false),
    ('00000000-0000-0000-0000-000000000312'::uuid, 'municipales-grandes-villes', 'stabilite-coalition-lille', 'Quel niveau de stabilite pour la coalition municipale de Lille ?', 'Sujet local archive pour tester la lecture historique d''une echelle ordinale.', '00000000-0000-0000-0000-000000000105'::uuid, '2025-11-10 08:00:00+00', '2026-02-10 18:00:00+00', '2026-02-17 18:00:00+00', 'FR', '59350', false),
    ('00000000-0000-0000-0000-000000000313'::uuid, 'partis-congres', 'primaire-centre-reformiste-regionale', 'Qui arrivera en tete de la primaire regionale du centre reformiste ?', 'Primaire interne close, mais consolidation finale encore attendue.', '00000000-0000-0000-0000-000000000110'::uuid, '2026-02-05 08:00:00+00', '2026-03-27 18:00:00+00', '2026-04-05 18:00:00+00', 'FR', '69123', false),
    ('00000000-0000-0000-0000-000000000314'::uuid, 'personnalites-strategies', 'retour-mediatique-figure-gouvernementale', 'A quelle date une figure gouvernementale annoncera-t-elle son retour mediatique ?', 'Sujet de calendrier personnalite, verrouille avant sa fermeture pour tester la suspension de saisie.', '00000000-0000-0000-0000-000000000109'::uuid, '2026-03-08 08:00:00+00', '2026-05-05 18:00:00+00', '2026-05-12 18:00:00+00', 'FR', 'france', false),
    ('00000000-0000-0000-0000-000000000315'::uuid, 'personnalites-strategies', 'centralite-retour-ancien-premier-ministre', 'La perspective d''un retour d''ancien Premier ministre restera-t-elle centrale dans le debat public local ?', 'Sujet archive de personnalite pour tester une lecture historique non diffamatoire.', '00000000-0000-0000-0000-000000000109'::uuid, '2025-12-01 08:00:00+00', '2026-02-28 18:00:00+00', '2026-03-06 18:00:00+00', 'FR', 'france', false)
)
insert into public.topic(
  id,
  space_id,
  slug,
  title,
  description,
  topic_status,
  visibility,
  created_by,
  open_at,
  close_at,
  resolve_deadline_at,
  primary_territory_id,
  is_sensitive,
  locked_reason
)
select
  ts.id,
  s.id,
  ts.slug,
  ts.title,
  ts.description,
  'open'::public.topic_status,
  'public'::public.visibility_level,
  ts.created_by,
  ts.open_at::timestamptz,
  ts.close_at::timestamptz,
  ts.resolve_deadline_at::timestamptz,
  tr.id,
  ts.is_sensitive,
  null
from topic_seed ts
join public.space s on s.slug = ts.space_slug
join public.territory_reference tr
  on tr.country_code = ts.primary_country_code
 and tr.territory_code = ts.primary_territory_code
on conflict (slug) do update
set
  space_id = excluded.space_id,
  title = excluded.title,
  description = excluded.description,
  topic_status = excluded.topic_status,
  visibility = excluded.visibility,
  created_by = excluded.created_by,
  open_at = excluded.open_at,
  close_at = excluded.close_at,
  resolve_deadline_at = excluded.resolve_deadline_at,
  primary_territory_id = excluded.primary_territory_id,
  is_sensitive = excluded.is_sensitive,
  locked_reason = excluded.locked_reason;

with topic_term_seed(topic_slug, axis_slug, term_slug, is_primary) as (
  values
    ('union-droite-printemps-2027', 'topic_nature', 'electoral', true),
    ('union-droite-printemps-2027', 'institution_election', 'presidential', false),
    ('union-droite-printemps-2027', 'geographic_scope', 'national', false),
    ('motion-censure-avant-automne', 'topic_nature', 'governmental', true),
    ('motion-censure-avant-automne', 'geographic_scope', 'national', false),
    ('budget-paris-defections-2026', 'topic_nature', 'local-municipal', true),
    ('budget-paris-defections-2026', 'institution_election', 'municipal', false),
    ('budget-paris-defections-2026', 'geographic_scope', 'communal', false),
    ('remaniement-marseille-date', 'topic_nature', 'local-municipal', true),
    ('remaniement-marseille-date', 'institution_election', 'municipal', false),
    ('remaniement-marseille-date', 'geographic_scope', 'communal', false),
    ('score-alliance-ecologiste-lyon', 'topic_nature', 'electoral', true),
    ('score-alliance-ecologiste-lyon', 'institution_election', 'municipal', false),
    ('score-alliance-ecologiste-lyon', 'geographic_scope', 'communal', false),
    ('participation-consultation-toulouse', 'topic_nature', 'local-municipal', true),
    ('participation-consultation-toulouse', 'geographic_scope', 'communal', false),
    ('compromis-elargissement-octobre', 'topic_nature', 'geopolitical', true),
    ('compromis-elargissement-octobre', 'geographic_scope', 'international', false),
    ('tension-cmp-texte-institutionnel', 'topic_nature', 'institutional', true),
    ('tension-cmp-texte-institutionnel', 'topic_nature', 'parliamentary', false),
    ('tension-cmp-texte-institutionnel', 'geographic_scope', 'national', false),
    ('renvoi-metropole-marches-publics', 'topic_nature', 'judicial', true),
    ('renvoi-metropole-marches-publics', 'geographic_scope', 'communal', false),
    ('ligne-majoritaire-congres-social-democrate', 'topic_nature', 'partisan-internal', true),
    ('ligne-majoritaire-congres-social-democrate', 'geographic_scope', 'regional', false),
    ('taux-adoption-amendements-compromis', 'topic_nature', 'parliamentary', true),
    ('taux-adoption-amendements-compromis', 'geographic_scope', 'national', false),
    ('stabilite-coalition-lille', 'topic_nature', 'local-municipal', true),
    ('stabilite-coalition-lille', 'geographic_scope', 'communal', false),
    ('primaire-centre-reformiste-regionale', 'topic_nature', 'partisan-internal', true),
    ('primaire-centre-reformiste-regionale', 'institution_election', 'primaries', false),
    ('primaire-centre-reformiste-regionale', 'geographic_scope', 'regional', false),
    ('retour-mediatique-figure-gouvernementale', 'entity_kind', 'personality', true),
    ('retour-mediatique-figure-gouvernementale', 'geographic_scope', 'national', false),
    ('centralite-retour-ancien-premier-ministre', 'entity_kind', 'personality', true),
    ('centralite-retour-ancien-premier-ministre', 'geographic_scope', 'national', false)
)
insert into public.topic_taxonomy_link(topic_id, taxonomy_term_id, is_primary)
select
  t.id,
  tt.id,
  tts.is_primary
from topic_term_seed tts
join public.topic t on t.slug = tts.topic_slug
join public.taxonomy_axis ta on ta.slug = tts.axis_slug
join public.taxonomy_term tt on tt.axis_id = ta.id and tt.slug = tts.term_slug
on conflict (topic_id, taxonomy_term_id) do update
set is_primary = excluded.is_primary;

with topic_territory_seed(topic_slug, country_code, territory_code, is_primary) as (
  values
    ('union-droite-printemps-2027', 'FR', 'france', true),
    ('motion-censure-avant-automne', 'FR', 'france', true),
    ('budget-paris-defections-2026', 'FR', '75056', true),
    ('budget-paris-defections-2026', 'FR', '75', false),
    ('remaniement-marseille-date', 'FR', '13055', true),
    ('score-alliance-ecologiste-lyon', 'FR', '69123', true),
    ('participation-consultation-toulouse', 'FR', '31555', true),
    ('compromis-elargissement-octobre', 'ZZ', 'europe', true),
    ('tension-cmp-texte-institutionnel', 'FR', 'france', true),
    ('renvoi-metropole-marches-publics', 'FR', '13055', true),
    ('ligne-majoritaire-congres-social-democrate', 'FR', '32', true),
    ('taux-adoption-amendements-compromis', 'FR', 'france', true),
    ('stabilite-coalition-lille', 'FR', '59350', true),
    ('primaire-centre-reformiste-regionale', 'FR', '84', true),
    ('retour-mediatique-figure-gouvernementale', 'FR', 'france', true),
    ('centralite-retour-ancien-premier-ministre', 'FR', 'france', true)
)
insert into public.topic_territory_link(topic_id, territory_id, is_primary)
select
  t.id,
  tr.id,
  tts.is_primary
from topic_territory_seed tts
join public.topic t on t.slug = tts.topic_slug
join public.territory_reference tr
  on tr.country_code = tts.country_code
 and tr.territory_code = tts.territory_code
on conflict (topic_id, territory_id) do update
set is_primary = excluded.is_primary;

with question_seed(
  topic_slug,
  prediction_type,
  title,
  unit_label,
  min_numeric_value,
  max_numeric_value,
  min_date_value,
  max_date_value,
  ordinal_min,
  ordinal_max,
  scoring_method,
  aggregation_method,
  allow_submission_update
) as (
  values
    ('union-droite-printemps-2027', 'categorical_closed'::public.prediction_type, 'Quel type de figure sortira le plus naturellement en tete de l''espace de rassemblement ?', null, null, null, null, null, null, null, 'exact_match'::public.prediction_scoring_method, 'option_distribution'::public.prediction_aggregation_method, true),
    ('motion-censure-avant-automne', 'binary'::public.prediction_type, 'Une motion de censure aboutira-t-elle avant l''automne ?', null, null, null, null, null, null, null, 'exact_match'::public.prediction_scoring_method, 'binary_split'::public.prediction_aggregation_method, true),
    ('budget-paris-defections-2026', 'bounded_integer'::public.prediction_type, 'Combien de defections seront retenues dans le decompte final ?', 'defections', 0, 20, null, null, null, null, 'normalized_absolute_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, false),
    ('remaniement-marseille-date', 'date_value'::public.prediction_type, 'Date attendue de l''annonce du remaniement', null, null, null, '2026-04-01'::date, '2026-06-15'::date, null, null, 'date_distance'::public.prediction_scoring_method, 'median_distribution'::public.prediction_aggregation_method, true),
    ('score-alliance-ecologiste-lyon', 'bounded_percentage'::public.prediction_type, 'Score de premier tour de l''alliance ecologiste', '%', 0, 100, null, null, null, null, 'normalized_absolute_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, true),
    ('participation-consultation-toulouse', 'bounded_volume'::public.prediction_type, 'Volume total de participation a la consultation', 'participants', 50000, 500000, null, null, null, null, 'normalized_relative_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, true),
    ('compromis-elargissement-octobre', 'binary'::public.prediction_type, 'Un compromis politique formel interviendra-t-il avant octobre ?', null, null, null, null, null, null, null, 'exact_match'::public.prediction_scoring_method, 'binary_split'::public.prediction_aggregation_method, false),
    ('tension-cmp-texte-institutionnel', 'ordinal_scale'::public.prediction_type, 'Niveau de tension attendu en commission mixte', null, null, null, null, null, 1, 5, 'ordinal_distance'::public.prediction_scoring_method, 'ordinal_summary'::public.prediction_aggregation_method, true),
    ('renvoi-metropole-marches-publics', 'binary'::public.prediction_type, 'Le renvoi procedurale sera-t-il acte avant l''ete ?', null, null, null, null, null, null, null, 'exact_match'::public.prediction_scoring_method, 'binary_split'::public.prediction_aggregation_method, false),
    ('ligne-majoritaire-congres-social-democrate', 'categorical_closed'::public.prediction_type, 'Quelle ligne sortira majoritaire du congres ?', null, null, null, null, null, null, null, 'exact_match'::public.prediction_scoring_method, 'option_distribution'::public.prediction_aggregation_method, false),
    ('taux-adoption-amendements-compromis', 'bounded_percentage'::public.prediction_type, 'Part des amendements de compromis adoptes', '%', 0, 100, null, null, null, null, 'normalized_absolute_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, false),
    ('stabilite-coalition-lille', 'ordinal_scale'::public.prediction_type, 'Niveau de stabilite percu de la coalition', null, null, null, null, null, 1, 5, 'ordinal_distance'::public.prediction_scoring_method, 'ordinal_summary'::public.prediction_aggregation_method, false),
    ('primaire-centre-reformiste-regionale', 'categorical_closed'::public.prediction_type, 'Quel profil arrivera en tete ?', null, null, null, null, null, null, null, 'exact_match'::public.prediction_scoring_method, 'option_distribution'::public.prediction_aggregation_method, false),
    ('retour-mediatique-figure-gouvernementale', 'date_value'::public.prediction_type, 'Date du retour mediatique annonce', null, null, null, '2026-04-15'::date, '2026-07-15'::date, null, null, 'date_distance'::public.prediction_scoring_method, 'median_distribution'::public.prediction_aggregation_method, false),
    ('centralite-retour-ancien-premier-ministre', 'binary'::public.prediction_type, 'Le sujet restera-t-il central dans le debat local ?', null, null, null, null, null, null, null, 'exact_match'::public.prediction_scoring_method, 'binary_split'::public.prediction_aggregation_method, false)
)
insert into public.prediction_question(
  topic_id,
  prediction_type,
  title,
  unit_label,
  min_numeric_value,
  max_numeric_value,
  min_date_value,
  max_date_value,
  ordinal_min,
  ordinal_max,
  scoring_method,
  aggregation_method,
  allow_submission_update
)
select
  t.id,
  qs.prediction_type,
  qs.title,
  qs.unit_label,
  qs.min_numeric_value,
  qs.max_numeric_value,
  qs.min_date_value,
  qs.max_date_value,
  qs.ordinal_min,
  qs.ordinal_max,
  qs.scoring_method,
  qs.aggregation_method,
  qs.allow_submission_update
from question_seed qs
join public.topic t on t.slug = qs.topic_slug
on conflict (topic_id) do update
set
  prediction_type = excluded.prediction_type,
  title = excluded.title,
  unit_label = excluded.unit_label,
  min_numeric_value = excluded.min_numeric_value,
  max_numeric_value = excluded.max_numeric_value,
  min_date_value = excluded.min_date_value,
  max_date_value = excluded.max_date_value,
  ordinal_min = excluded.ordinal_min,
  ordinal_max = excluded.ordinal_max,
  scoring_method = excluded.scoring_method,
  aggregation_method = excluded.aggregation_method,
  allow_submission_update = excluded.allow_submission_update;

with option_seed(topic_slug, slug, label, sort_order) as (
  values
    ('union-droite-printemps-2027', 'profil-gouvernemental', 'Profil gouvernemental', 10),
    ('union-droite-printemps-2027', 'maire-grande-ville', 'Maire de grande ville', 20),
    ('union-droite-printemps-2027', 'figure-partisane', 'Figure partisane', 30),
    ('union-droite-printemps-2027', 'depute-identitaire', 'Depute identitaire', 40),
    ('ligne-majoritaire-congres-social-democrate', 'ligne-territoriale', 'Ligne territoriale', 10),
    ('ligne-majoritaire-congres-social-democrate', 'ligne-sociale', 'Ligne sociale', 20),
    ('ligne-majoritaire-congres-social-democrate', 'ligne-ecolo-alliee', 'Ligne ecolo alliee', 30),
    ('primaire-centre-reformiste-regionale', 'executif-sortant', 'Executif sortant', 10),
    ('primaire-centre-reformiste-regionale', 'maire-regionale', 'Maire de grande ville', 20),
    ('primaire-centre-reformiste-regionale', 'depute-equilibre', 'Depute d''equilibre', 30)
)
insert into public.prediction_option(topic_id, slug, label, sort_order, is_active)
select
  t.id,
  os.slug,
  os.label,
  os.sort_order,
  true
from option_seed os
join public.topic t on t.slug = os.topic_slug
on conflict (topic_id, slug) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- --------------------------------------------------------------------------
-- Posts
-- --------------------------------------------------------------------------

insert into public.post(
  id,
  space_id,
  topic_id,
  author_user_id,
  post_type,
  post_status,
  title,
  body_markdown,
  body_plaintext,
  created_at
)
values
  ('00000000-0000-0000-0000-000000000601'::uuid, (select id from public.space where slug = 'presidentielle-2027'), (select id from public.topic where slug = 'union-droite-printemps-2027'), '00000000-0000-0000-0000-000000000101'::uuid, 'analysis', 'visible', 'Trois profils se detachent', 'Le sujet oppose un profil gouvernemental rassurant, un maire de grande ville plus transversal et une figure partisane plus identitaire.', 'Le sujet oppose plusieurs profils de rassemblement a droite.', '2026-03-20 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000602'::uuid, (select id from public.space where slug = 'presidentielle-2027'), (select id from public.topic where slug = 'union-droite-printemps-2027'), '00000000-0000-0000-0000-000000000110'::uuid, 'discussion', 'visible', 'Le facteur temps joue contre les appareils', 'Les acteurs les plus visibles localement semblent mieux places que les profils purement partisans si le calendrier se resserre.', 'Le temps peut avantager les profils deja visibles localement.', '2026-03-28 18:10:00+00'),
  ('00000000-0000-0000-0000-000000000603'::uuid, (select id from public.space where slug = 'gouvernement-institutions'), (select id from public.topic where slug = 'motion-censure-avant-automne'), '00000000-0000-0000-0000-000000000102'::uuid, 'analysis', 'visible', 'La fenetre parlementaire se referme puis se rouvre', 'Le risque depend moins d''un texte unique que de la coordination de plusieurs groupes charnieres.', 'Le risque depend des groupes charnieres et du calendrier.', '2026-03-26 10:00:00+00'),
  ('00000000-0000-0000-0000-000000000604'::uuid, (select id from public.space where slug = 'gouvernement-institutions'), (select id from public.topic where slug = 'motion-censure-avant-automne'), '00000000-0000-0000-0000-000000000112'::uuid, 'news', 'visible', 'Un vote test a relance les calculs', 'Un vote de milieu de session a remis la question de la discipline des groupes au centre du sujet.', 'Un vote test relance les calculs de discipline de groupe.', '2026-03-29 07:30:00+00'),
  ('00000000-0000-0000-0000-000000000605'::uuid, (select id from public.space where slug = 'ile-de-france-politique'), (select id from public.topic where slug = 'budget-paris-defections-2026'), '00000000-0000-0000-0000-000000000101'::uuid, 'local', 'visible', 'Le decompte municipal reste dispute', 'Les comptes de fin de seance convergent, mais deux abstentions tardives n''ont pas encore ete consolidees dans le recapitulatif final.', 'Le decompte final reste dispute sur deux abstentions tardives.', '2026-03-26 20:30:00+00'),
  ('00000000-0000-0000-0000-000000000606'::uuid, (select id from public.space where slug = 'ile-de-france-politique'), (select id from public.topic where slug = 'budget-paris-defections-2026'), '00000000-0000-0000-0000-000000000102'::uuid, 'moderation', 'visible', 'Sujet clos, resolution en attente', 'Le sujet est verrouille car le vote est clos. La resolution attend la publication consolidee de la mairie.', 'Sujet verrouille en attente de publication consolidee.', '2026-03-27 08:15:00+00'),
  ('00000000-0000-0000-0000-000000000607'::uuid, (select id from public.space where slug = 'municipales-grandes-villes'), (select id from public.topic where slug = 'remaniement-marseille-date'), '00000000-0000-0000-0000-000000000103'::uuid, 'local', 'visible', 'Le calendrier municipal reste poreux', 'Le remaniement devrait etre annonce apres un rendez-vous local devenu central dans les arbitrages de l''equipe.', 'Le calendrier depend d un rendez-vous local cle.', '2026-03-25 17:00:00+00'),
  ('00000000-0000-0000-0000-000000000608'::uuid, (select id from public.space where slug = 'municipales-grandes-villes'), (select id from public.topic where slug = 'remaniement-marseille-date'), '00000000-0000-0000-0000-000000000108'::uuid, 'analysis', 'visible', 'Un remaniement qui sert aussi de signal de campagne', 'L''annonce ne vaut pas seulement ajustement d''equipe. Elle doit aussi repositionner la majorite face aux oppositions de quartiers.', 'Le remaniement sert aussi de signal de campagne.', '2026-03-30 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000609'::uuid, (select id from public.space where slug = 'municipales-grandes-villes'), (select id from public.topic where slug = 'score-alliance-ecologiste-lyon'), '00000000-0000-0000-0000-000000000104'::uuid, 'analysis', 'visible', 'Le sujet teste la lisibilite du bloc sortant', 'La question n''est pas seulement le score absolu mais la capacite a rester en tete dans plusieurs arrondissements de reference.', 'Le sujet teste surtout la lisibilite du bloc sortant.', '2026-03-22 12:00:00+00'),
  ('00000000-0000-0000-0000-000000000610'::uuid, (select id from public.space where slug = 'municipales-grandes-villes'), (select id from public.topic where slug = 'participation-consultation-toulouse'), '00000000-0000-0000-0000-000000000107'::uuid, 'local', 'visible', 'Une consultation utile pour mesurer l''engagement local', 'Les seuils de participation publics permettront de comparer quartier central et peripherie sans ramener le sujet a un simple sondage.', 'La consultation permettra une lecture comparative de l engagement local.', '2026-03-21 11:30:00+00'),
  ('00000000-0000-0000-0000-000000000611'::uuid, (select id from public.space where slug = 'geopolitique-europe'), (select id from public.topic where slug = 'compromis-elargissement-octobre'), '00000000-0000-0000-0000-000000000106'::uuid, 'analysis', 'visible', 'Le verrouillage est institutionnel, pas editorial', 'Le sujet reste visible mais la prise de position est suspendue le temps d''une sequence diplomatique a faible publicite.', 'Le sujet reste visible mais la saisie est suspendue.', '2026-03-28 06:45:00+00'),
  ('00000000-0000-0000-0000-000000000612'::uuid, (select id from public.space where slug = 'gouvernement-institutions'), (select id from public.topic where slug = 'tension-cmp-texte-institutionnel'), '00000000-0000-0000-0000-000000000102'::uuid, 'analysis', 'visible', 'Le texte institutionnel devient un test de discipline', 'La tension ne se mesure pas au nombre de communiques mais a la capacite des groupes a tenir une ligne procedurale commune.', 'La tension se mesure a la discipline procedurale.', '2026-03-27 14:10:00+00'),
  ('00000000-0000-0000-0000-000000000613'::uuid, (select id from public.space where slug = 'justice-affaires'), (select id from public.topic where slug = 'renvoi-metropole-marches-publics'), '00000000-0000-0000-0000-000000000105'::uuid, 'analysis', 'visible', 'Le calendrier procedurale est presque fixe', 'Les pieces publiques connues convergent vers une fenetre de renvoi, mais la formalisation n''est pas encore publiee.', 'Le calendrier procedural semble fixe mais pas encore publie.', '2026-03-23 15:00:00+00'),
  ('00000000-0000-0000-0000-000000000614'::uuid, (select id from public.space where slug = 'justice-affaires'), (select id from public.topic where slug = 'renvoi-metropole-marches-publics'), '00000000-0000-0000-0000-000000000105'::uuid, 'moderation', 'visible', 'Resolution attendue', 'Le sujet est clos. La resolution interviendra a reception d''une source procedurale directement consultable.', 'Le sujet attend une source procedurale consultable.', '2026-03-25 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000615'::uuid, (select id from public.space where slug = 'partis-congres'), (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), '00000000-0000-0000-0000-000000000111'::uuid, 'analysis', 'visible', 'La ligne territoriale a progressivement domine', 'Le congres a glisse d''un debat ideologique large vers une ligne territoriale plus operationnelle.', 'La ligne territoriale a progressivement domine.', '2026-03-14 17:00:00+00'),
  ('00000000-0000-0000-0000-000000000616'::uuid, (select id from public.space where slug = 'partis-congres'), (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), '00000000-0000-0000-0000-000000000111'::uuid, 'resolution_justification', 'visible', 'Resolution publiee', 'La resolution retient la ligne territoriale telle qu''elle apparait dans le releve final du congres.', 'Resolution basee sur le releve final du congres.', '2026-03-19 09:30:00+00'),
  ('00000000-0000-0000-0000-000000000617'::uuid, (select id from public.space where slug = 'gouvernement-institutions'), (select id from public.topic where slug = 'taux-adoption-amendements-compromis'), '00000000-0000-0000-0000-000000000102'::uuid, 'analysis', 'visible', 'Le compromis a mieux tenu que prevu', 'La sequence a montre une capacite inattendue a maintenir un bloc de compromis stable sur plusieurs articles.', 'Le bloc de compromis a mieux tenu que prevu.', '2026-03-11 16:00:00+00'),
  ('00000000-0000-0000-0000-000000000618'::uuid, (select id from public.space where slug = 'gouvernement-institutions'), (select id from public.topic where slug = 'taux-adoption-amendements-compromis'), '00000000-0000-0000-0000-000000000112'::uuid, 'resolution_justification', 'visible', 'Taux retenu pour la resolution', 'Le taux final retenu s''appuie sur le decompte officiel des amendements de compromis adoptes en seance.', 'Le taux final vient du decompte officiel des amendements.', '2026-03-17 08:10:00+00'),
  ('00000000-0000-0000-0000-000000000619'::uuid, (select id from public.space where slug = 'municipales-grandes-villes'), (select id from public.topic where slug = 'stabilite-coalition-lille'), '00000000-0000-0000-0000-000000000105'::uuid, 'local', 'visible', 'Un sujet archive mais pedagogique', 'La coalition n''a pas casse, mais elle a laisse une impression de fragilite continue utile pour une lecture historique.', 'Sujet archive utile pour la lecture historique.', '2026-02-09 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000620'::uuid, (select id from public.space where slug = 'partis-congres'), (select id from public.topic where slug = 'primaire-centre-reformiste-regionale'), '00000000-0000-0000-0000-000000000110'::uuid, 'analysis', 'visible', 'La primaire s''est resserree tres tard', 'Le profil du maire de grande ville a rattrape l''executif sortant dans les derniers jours, ce qui complique la lecture des resultats partiels.', 'La primaire s est resserree tres tard.', '2026-03-26 13:00:00+00'),
  ('00000000-0000-0000-0000-000000000621'::uuid, (select id from public.space where slug = 'partis-congres'), (select id from public.topic where slug = 'primaire-centre-reformiste-regionale'), '00000000-0000-0000-0000-000000000109'::uuid, 'moderation', 'visible', 'Attente de consolidation', 'Le sujet est clos. Les derniers bureaux regionaux n''ont pas encore ete consolides dans la publication finale.', 'Les derniers bureaux regionaux ne sont pas encore consolides.', '2026-03-28 07:50:00+00'),
  ('00000000-0000-0000-0000-000000000622'::uuid, (select id from public.space where slug = 'personnalites-strategies'), (select id from public.topic where slug = 'retour-mediatique-figure-gouvernementale'), '00000000-0000-0000-0000-000000000109'::uuid, 'analysis', 'visible', 'Le retour mediatique est traite comme un signal de placement', 'Le sujet ne porte pas sur la personne mais sur le moment choisi pour rendre ce retour politiquement utile.', 'Le sujet porte sur le calendrier du retour, pas sur la personne.', '2026-03-30 08:20:00+00'),
  ('00000000-0000-0000-0000-000000000623'::uuid, (select id from public.space where slug = 'personnalites-strategies'), (select id from public.topic where slug = 'retour-mediatique-figure-gouvernementale'), '00000000-0000-0000-0000-000000000109'::uuid, 'moderation', 'visible', 'Fenetre de saisie suspendue', 'Le sujet reste visible, mais de nouvelles prises de position sont suspendues pendant la sequence de veille.', 'La saisie est suspendue pendant la sequence de veille.', '2026-03-31 07:15:00+00'),
  ('00000000-0000-0000-0000-000000000624'::uuid, (select id from public.space where slug = 'personnalites-strategies'), (select id from public.topic where slug = 'centralite-retour-ancien-premier-ministre'), '00000000-0000-0000-0000-000000000109'::uuid, 'analysis', 'visible', 'Le sujet a servi de test de centralite mediatique', 'Le sujet est archive: il a surtout servi a mesurer la persistance d''une hypothese dans le debat public local.', 'Sujet archive de centralite mediatique.', '2026-02-27 16:30:00+00')
on conflict (id) do update
set
  space_id = excluded.space_id,
  topic_id = excluded.topic_id,
  author_user_id = excluded.author_user_id,
  post_type = excluded.post_type,
  post_status = excluded.post_status,
  title = excluded.title,
  body_markdown = excluded.body_markdown,
  body_plaintext = excluded.body_plaintext,
  created_at = excluded.created_at;

-- --------------------------------------------------------------------------
-- Prediction submissions and history
-- --------------------------------------------------------------------------

insert into public.prediction_submission(
  id,
  topic_id,
  user_id,
  submission_status,
  answer_boolean,
  answer_date,
  answer_numeric,
  answer_option_id,
  answer_ordinal,
  submitted_at,
  updated_at,
  source_context
)
values
  ('00000000-0000-0000-0000-000000000801'::uuid, (select id from public.topic where slug = 'union-droite-printemps-2027'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'union-droite-printemps-2027') and slug = 'profil-gouvernemental'), null, '2026-03-28 10:00:00+00', '2026-03-31 10:30:00+00', 'homepage'),
  ('00000000-0000-0000-0000-000000000802'::uuid, (select id from public.topic where slug = 'union-droite-printemps-2027'), '00000000-0000-0000-0000-000000000110'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'union-droite-printemps-2027') and slug = 'maire-grande-ville'), null, '2026-03-29 08:40:00+00', '2026-03-29 08:40:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000803'::uuid, (select id from public.topic where slug = 'union-droite-printemps-2027'), '00000000-0000-0000-0000-000000000111'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'union-droite-printemps-2027') and slug = 'maire-grande-ville'), null, '2026-03-30 12:20:00+00', '2026-03-30 12:20:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000804'::uuid, (select id from public.topic where slug = 'union-droite-printemps-2027'), '00000000-0000-0000-0000-000000000112'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'union-droite-printemps-2027') and slug = 'figure-partisane'), null, '2026-03-26 11:05:00+00', '2026-03-26 11:05:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000805'::uuid, (select id from public.topic where slug = 'motion-censure-avant-automne'), '00000000-0000-0000-0000-000000000102'::uuid, 'active', false, null, null, null, null, '2026-03-29 09:00:00+00', '2026-03-29 09:00:00+00', 'homepage'),
  ('00000000-0000-0000-0000-000000000806'::uuid, (select id from public.topic where slug = 'motion-censure-avant-automne'), '00000000-0000-0000-0000-000000000109'::uuid, 'active', true, null, null, null, null, '2026-03-30 13:30:00+00', '2026-03-30 13:30:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000807'::uuid, (select id from public.topic where slug = 'motion-censure-avant-automne'), '00000000-0000-0000-0000-000000000110'::uuid, 'active', false, null, null, null, null, '2026-03-31 07:50:00+00', '2026-03-31 07:50:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000808'::uuid, (select id from public.topic where slug = 'budget-paris-defections-2026'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, null, 4, null, null, '2026-03-24 20:00:00+00', '2026-03-26 21:00:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000809'::uuid, (select id from public.topic where slug = 'budget-paris-defections-2026'), '00000000-0000-0000-0000-000000000102'::uuid, 'active', null, null, 5, null, null, '2026-03-25 08:20:00+00', '2026-03-27 08:20:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000810'::uuid, (select id from public.topic where slug = 'budget-paris-defections-2026'), '00000000-0000-0000-0000-000000000104'::uuid, 'active', null, null, 4, null, null, '2026-03-25 12:00:00+00', '2026-03-25 12:00:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000811'::uuid, (select id from public.topic where slug = 'remaniement-marseille-date'), '00000000-0000-0000-0000-000000000103'::uuid, 'active', null, '2026-04-24', null, null, null, '2026-03-30 09:10:00+00', '2026-03-30 09:10:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000812'::uuid, (select id from public.topic where slug = 'remaniement-marseille-date'), '00000000-0000-0000-0000-000000000108'::uuid, 'active', null, '2026-04-28', null, null, null, '2026-03-31 07:40:00+00', '2026-03-31 07:40:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000813'::uuid, (select id from public.topic where slug = 'remaniement-marseille-date'), '00000000-0000-0000-0000-000000000105'::uuid, 'active', null, '2026-04-26', null, null, null, '2026-03-29 18:10:00+00', '2026-03-29 18:10:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000814'::uuid, (select id from public.topic where slug = 'score-alliance-ecologiste-lyon'), '00000000-0000-0000-0000-000000000104'::uuid, 'active', null, null, 31, null, null, '2026-03-27 12:00:00+00', '2026-03-27 12:00:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000815'::uuid, (select id from public.topic where slug = 'score-alliance-ecologiste-lyon'), '00000000-0000-0000-0000-000000000110'::uuid, 'active', null, null, 33, null, null, '2026-03-30 09:25:00+00', '2026-03-30 09:25:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000816'::uuid, (select id from public.topic where slug = 'score-alliance-ecologiste-lyon'), '00000000-0000-0000-0000-000000000111'::uuid, 'active', null, null, 29, null, null, '2026-03-29 10:15:00+00', '2026-03-29 10:15:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000817'::uuid, (select id from public.topic where slug = 'participation-consultation-toulouse'), '00000000-0000-0000-0000-000000000107'::uuid, 'active', null, null, 178000, null, null, '2026-03-28 11:20:00+00', '2026-03-28 11:20:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000818'::uuid, (select id from public.topic where slug = 'participation-consultation-toulouse'), '00000000-0000-0000-0000-000000000103'::uuid, 'active', null, null, 164000, null, null, '2026-03-29 07:50:00+00', '2026-03-29 07:50:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000819'::uuid, (select id from public.topic where slug = 'participation-consultation-toulouse'), '00000000-0000-0000-0000-000000000104'::uuid, 'active', null, null, 191000, null, null, '2026-03-31 08:00:00+00', '2026-03-31 08:00:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000820'::uuid, (select id from public.topic where slug = 'compromis-elargissement-octobre'), '00000000-0000-0000-0000-000000000106'::uuid, 'active', true, null, null, null, null, '2026-03-27 06:30:00+00', '2026-03-27 06:30:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000821'::uuid, (select id from public.topic where slug = 'compromis-elargissement-octobre'), '00000000-0000-0000-0000-000000000112'::uuid, 'active', false, null, null, null, null, '2026-03-26 09:15:00+00', '2026-03-26 09:15:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000822'::uuid, (select id from public.topic where slug = 'tension-cmp-texte-institutionnel'), '00000000-0000-0000-0000-000000000102'::uuid, 'active', null, null, null, null, 4, '2026-03-29 11:00:00+00', '2026-03-29 11:00:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000823'::uuid, (select id from public.topic where slug = 'tension-cmp-texte-institutionnel'), '00000000-0000-0000-0000-000000000112'::uuid, 'active', null, null, null, null, 3, '2026-03-31 10:00:00+00', '2026-03-31 10:00:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000824'::uuid, (select id from public.topic where slug = 'tension-cmp-texte-institutionnel'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, null, null, null, 5, '2026-03-27 15:00:00+00', '2026-03-27 15:00:00+00', 'homepage')
on conflict (id) do update
set
  topic_id = excluded.topic_id,
  user_id = excluded.user_id,
  submission_status = excluded.submission_status,
  answer_boolean = excluded.answer_boolean,
  answer_date = excluded.answer_date,
  answer_numeric = excluded.answer_numeric,
  answer_option_id = excluded.answer_option_id,
  answer_ordinal = excluded.answer_ordinal,
  submitted_at = excluded.submitted_at,
  updated_at = excluded.updated_at,
  source_context = excluded.source_context;

-- --------------------------------------------------------------------------
-- Resolutions, score events, cards and reputation
-- --------------------------------------------------------------------------

insert into public.topic_resolution(
  topic_id,
  resolution_status,
  resolved_by,
  resolved_at,
  resolution_note,
  resolved_boolean,
  resolved_date,
  resolved_numeric,
  resolved_option_id,
  resolved_ordinal,
  void_reason
)
values
  ((select id from public.topic where slug = 'budget-paris-defections-2026'), 'pending', null, null, 'Decompte final non consolide.', null, null, null, null, null, null),
  ((select id from public.topic where slug = 'renvoi-metropole-marches-publics'), 'pending', null, null, 'Attente d''une source procedurale directement consultable.', null, null, null, null, null, null),
  ((select id from public.topic where slug = 'primaire-centre-reformiste-regionale'), 'pending', null, null, 'Derniers bureaux regionaux non consolides.', null, null, null, null, null, null),
  ((select id from public.topic where slug = 'premiere-declaration-programmatique-2027'), 'pending', null, null, 'Publication commune encore attendue.', null, null, null, null, null, null),
  ((select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), 'resolved', '00000000-0000-0000-0000-000000000111'::uuid, '2026-03-19 09:15:00+00', 'La ligne territoriale apparait majoritaire dans le releve final du congres.', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate') and slug = 'ligne-territoriale'), null, null),
  ((select id from public.topic where slug = 'taux-adoption-amendements-compromis'), 'resolved', '00000000-0000-0000-0000-000000000112'::uuid, '2026-03-17 08:00:00+00', 'Le decompte officiel retient une adoption a 61 pour cent.', null, null, 61, null, null, null),
  ((select id from public.topic where slug = 'suspension-arrete-logement-paris'), 'resolved', '00000000-0000-0000-0000-000000000105'::uuid, '2026-03-04 08:20:00+00', 'La sequence contentieuse est restee centree sur la suspension.', true, null, null, null, null, null),
  ((select id from public.topic where slug = 'date-publication-rapport-procedural-region'), 'resolved', '00000000-0000-0000-0000-000000000105'::uuid, '2026-03-30 07:50:00+00', 'Le rapport a ete publie le 29 mars au soir.', null, '2026-03-29', null, null, null, null)
on conflict (topic_id) do update
set
  resolution_status = excluded.resolution_status,
  resolved_by = excluded.resolved_by,
  resolved_at = excluded.resolved_at,
  resolution_note = excluded.resolution_note,
  resolved_boolean = excluded.resolved_boolean,
  resolved_date = excluded.resolved_date,
  resolved_numeric = excluded.resolved_numeric,
  resolved_option_id = excluded.resolved_option_id,
  resolved_ordinal = excluded.resolved_ordinal,
  void_reason = excluded.void_reason;

insert into public.topic_resolution_source(
  id,
  topic_id,
  source_type,
  source_label,
  source_url,
  source_published_at,
  quoted_excerpt,
  created_by,
  created_at
)
values
  ('00000000-0000-0000-0000-000000000951'::uuid, (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), 'official_statement', 'Releve final du congres regional', 'https://politicoresto.test/sources/congres-social-democrate-releve-final', '2026-03-19 08:45:00+00', 'La ligne territoriale est retenue comme orientation majoritaire.', '00000000-0000-0000-0000-000000000111'::uuid, '2026-03-19 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000952'::uuid, (select id from public.topic where slug = 'taux-adoption-amendements-compromis'), 'official_result', 'Tableau officiel des amendements adoptes', 'https://politicoresto.test/sources/amendements-compromis-tableau', '2026-03-17 07:40:00+00', 'Le taux de 61 pour cent est retenu pour les amendements de compromis.', '00000000-0000-0000-0000-000000000112'::uuid, '2026-03-17 08:05:00+00'),
  ('00000000-0000-0000-0000-000000000953'::uuid, (select id from public.topic where slug = 'suspension-arrete-logement-paris'), 'court_document', 'Decision de suspension en referes', 'https://politicoresto.test/sources/suspension-arrete-logement', '2026-03-04 07:55:00+00', 'La suspension demeure le point central du contentieux observe.', '00000000-0000-0000-0000-000000000105'::uuid, '2026-03-04 08:10:00+00'),
  ('00000000-0000-0000-0000-000000000954'::uuid, (select id from public.topic where slug = 'date-publication-rapport-procedural-region'), 'official_statement', 'Publication regionale du rapport procedural', 'https://politicoresto.test/sources/rapport-procedural-region', '2026-03-29 21:00:00+00', 'Le rapport a ete rendu public le 29 mars en fin de journee.', '00000000-0000-0000-0000-000000000105'::uuid, '2026-03-30 07:40:00+00')
on conflict (id) do update
set
  topic_id = excluded.topic_id,
  source_type = excluded.source_type,
  source_label = excluded.source_label,
  source_url = excluded.source_url,
  source_published_at = excluded.source_published_at,
  quoted_excerpt = excluded.quoted_excerpt,
  created_by = excluded.created_by,
  created_at = excluded.created_at;

insert into public.prediction_score_event(
  id,
  topic_id,
  submission_id,
  user_id,
  raw_score,
  normalized_score,
  score_method,
  scored_at
)
values
  ('00000000-0000-0000-0000-000000000971'::uuid, (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), '00000000-0000-0000-0000-000000000828'::uuid, '00000000-0000-0000-0000-000000000111'::uuid, 1, 1.0, 'exact_match', '2026-03-19 09:20:00+00'),
  ('00000000-0000-0000-0000-000000000972'::uuid, (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), '00000000-0000-0000-0000-000000000829'::uuid, '00000000-0000-0000-0000-000000000109'::uuid, 1, 1.0, 'exact_match', '2026-03-19 09:21:00+00'),
  ('00000000-0000-0000-0000-000000000973'::uuid, (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), '00000000-0000-0000-0000-000000000830'::uuid, '00000000-0000-0000-0000-000000000110'::uuid, 0, 0.0, 'exact_match', '2026-03-19 09:21:30+00'),
  ('00000000-0000-0000-0000-000000000974'::uuid, (select id from public.topic where slug = 'taux-adoption-amendements-compromis'), '00000000-0000-0000-0000-000000000831'::uuid, '00000000-0000-0000-0000-000000000102'::uuid, 0.97, 0.97, 'normalized_absolute_error', '2026-03-17 08:12:00+00'),
  ('00000000-0000-0000-0000-000000000975'::uuid, (select id from public.topic where slug = 'taux-adoption-amendements-compromis'), '00000000-0000-0000-0000-000000000832'::uuid, '00000000-0000-0000-0000-000000000112'::uuid, 0.99, 0.99, 'normalized_absolute_error', '2026-03-17 08:12:30+00'),
  ('00000000-0000-0000-0000-000000000976'::uuid, (select id from public.topic where slug = 'taux-adoption-amendements-compromis'), '00000000-0000-0000-0000-000000000833'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 1.00, 1.00, 'normalized_absolute_error', '2026-03-17 08:13:00+00'),
  ('00000000-0000-0000-0000-000000000977'::uuid, (select id from public.topic where slug = 'suspension-arrete-logement-paris'), '00000000-0000-0000-0000-000000000850'::uuid, '00000000-0000-0000-0000-000000000105'::uuid, 1, 1.0, 'exact_match', '2026-03-04 08:25:00+00'),
  ('00000000-0000-0000-0000-000000000978'::uuid, (select id from public.topic where slug = 'suspension-arrete-logement-paris'), '00000000-0000-0000-0000-000000000851'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 1, 1.0, 'exact_match', '2026-03-04 08:26:00+00'),
  ('00000000-0000-0000-0000-000000000979'::uuid, (select id from public.topic where slug = 'date-publication-rapport-procedural-region'), '00000000-0000-0000-0000-000000000852'::uuid, '00000000-0000-0000-0000-000000000105'::uuid, 0.99, 0.99, 'date_distance', '2026-03-30 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000980'::uuid, (select id from public.topic where slug = 'date-publication-rapport-procedural-region'), '00000000-0000-0000-0000-000000000853'::uuid, '00000000-0000-0000-0000-000000000111'::uuid, 1.00, 1.00, 'date_distance', '2026-03-30 08:00:30+00')
on conflict (submission_id) do update
set
  topic_id = excluded.topic_id,
  user_id = excluded.user_id,
  raw_score = excluded.raw_score,
  normalized_score = excluded.normalized_score,
  score_method = excluded.score_method,
  scored_at = excluded.scored_at;

insert into public.user_card_inventory(
  id,
  user_id,
  card_id,
  quantity,
  first_granted_at,
  last_granted_at
)
values
  ('00000000-0000-0000-0000-000000000981'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, (select id from public.card_catalog where slug = 'paris-observer'), 1, '2026-03-15 10:00:00+00', '2026-03-15 10:00:00+00'),
  ('00000000-0000-0000-0000-000000000982'::uuid, '00000000-0000-0000-0000-000000000103'::uuid, (select id from public.card_catalog where slug = 'marseille-watch'), 1, '2026-03-18 12:00:00+00', '2026-03-18 12:00:00+00'),
  ('00000000-0000-0000-0000-000000000983'::uuid, '00000000-0000-0000-0000-000000000106'::uuid, (select id from public.card_catalog where slug = 'european-watcher'), 1, '2026-03-20 08:00:00+00', '2026-03-20 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000984'::uuid, '00000000-0000-0000-0000-000000000105'::uuid, (select id from public.card_catalog where slug = 'procedure-reader'), 1, '2026-03-25 08:10:00+00', '2026-03-25 08:10:00+00'),
  ('00000000-0000-0000-0000-000000000985'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, (select id from public.card_catalog where slug = 'consensus-shift'), 1, '2026-03-31 09:00:00+00', '2026-03-31 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000986'::uuid, '00000000-0000-0000-0000-000000000108'::uuid, (select id from public.card_catalog where slug = 'municipal-cycle'), 1, '2026-03-30 11:30:00+00', '2026-03-30 11:30:00+00')
on conflict (user_id, card_id) do update
set
  quantity = excluded.quantity,
  first_granted_at = excluded.first_granted_at,
  last_granted_at = excluded.last_granted_at;

insert into public.card_grant_event(
  id,
  user_id,
  card_id,
  reason_type,
  reason_detail,
  granted_by,
  granted_at
)
values
  ('00000000-0000-0000-0000-000000000991'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, (select id from public.card_catalog where slug = 'paris-observer'), 'participation', 'Participation visible repetee sur des sujets parisiens.', null, '2026-03-15 10:00:00+00'),
  ('00000000-0000-0000-0000-000000000992'::uuid, '00000000-0000-0000-0000-000000000103'::uuid, (select id from public.card_catalog where slug = 'marseille-watch'), 'participation', 'Lecture recurrente des recompositions marseillaises.', null, '2026-03-18 12:00:00+00'),
  ('00000000-0000-0000-0000-000000000993'::uuid, '00000000-0000-0000-0000-000000000106'::uuid, (select id from public.card_catalog where slug = 'european-watcher'), 'exploration', 'Participation visible sur des sujets europeens.', null, '2026-03-20 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000994'::uuid, '00000000-0000-0000-0000-000000000105'::uuid, (select id from public.card_catalog where slug = 'procedure-reader'), 'prediction_performance', 'Attention procedurale utile sur les sujets judiciaires.', null, '2026-03-25 08:10:00+00'),
  ('00000000-0000-0000-0000-000000000995'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, (select id from public.card_catalog where slug = 'consensus-shift'), 'special_event', 'Bon timing sur un sujet dont le consensus a bouge.', null, '2026-03-31 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000996'::uuid, '00000000-0000-0000-0000-000000000108'::uuid, (select id from public.card_catalog where slug = 'municipal-cycle'), 'participation', 'Participation repetee sur de grandes sequences municipales.', null, '2026-03-30 11:30:00+00')
on conflict (id) do update
set
  user_id = excluded.user_id,
  card_id = excluded.card_id,
  reason_type = excluded.reason_type,
  reason_detail = excluded.reason_detail,
  granted_by = excluded.granted_by,
  granted_at = excluded.granted_at;

insert into public.reputation_ledger(
  id,
  user_id,
  event_type,
  delta,
  reference_entity_type,
  reference_entity_id,
  created_at
)
values
  ('00000000-0000-0000-0000-000000001001'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'topic_participation', 4, 'topic', (select id from public.topic where slug = 'union-droite-printemps-2027'), '2026-03-31 10:30:00+00'),
  ('00000000-0000-0000-0000-000000001002'::uuid, '00000000-0000-0000-0000-000000000102'::uuid, 'topic_participation', 4, 'topic', (select id from public.topic where slug = 'motion-censure-avant-automne'), '2026-03-31 07:50:00+00'),
  ('00000000-0000-0000-0000-000000001003'::uuid, '00000000-0000-0000-0000-000000000103'::uuid, 'topic_participation', 4, 'topic', (select id from public.topic where slug = 'remaniement-marseille-date'), '2026-03-30 09:10:00+00'),
  ('00000000-0000-0000-0000-000000001004'::uuid, '00000000-0000-0000-0000-000000000104'::uuid, 'topic_participation', 4, 'topic', (select id from public.topic where slug = 'score-alliance-ecologiste-lyon'), '2026-03-30 09:25:00+00'),
  ('00000000-0000-0000-0000-000000001005'::uuid, '00000000-0000-0000-0000-000000000105'::uuid, 'prediction_accuracy', 8, 'topic', (select id from public.topic where slug = 'suspension-arrete-logement-paris'), '2026-03-04 08:25:00+00'),
  ('00000000-0000-0000-0000-000000001006'::uuid, '00000000-0000-0000-0000-000000000105'::uuid, 'prediction_accuracy', 8, 'topic', (select id from public.topic where slug = 'date-publication-rapport-procedural-region'), '2026-03-30 08:00:00+00'),
  ('00000000-0000-0000-0000-000000001007'::uuid, '00000000-0000-0000-0000-000000000111'::uuid, 'prediction_accuracy', 9, 'topic', (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), '2026-03-19 09:20:00+00'),
  ('00000000-0000-0000-0000-000000001008'::uuid, '00000000-0000-0000-0000-000000000112'::uuid, 'prediction_accuracy', 9, 'topic', (select id from public.topic where slug = 'taux-adoption-amendements-compromis'), '2026-03-17 08:12:30+00'),
  ('00000000-0000-0000-0000-000000001009'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'card_bonus', 3, 'card_grant', '00000000-0000-0000-0000-000000000995'::uuid, '2026-03-31 09:00:00+00'),
  ('00000000-0000-0000-0000-000000001010'::uuid, '00000000-0000-0000-0000-000000000103'::uuid, 'card_bonus', 2, 'card_grant', '00000000-0000-0000-0000-000000000992'::uuid, '2026-03-18 12:00:00+00'),
  ('00000000-0000-0000-0000-000000001011'::uuid, '00000000-0000-0000-0000-000000000106'::uuid, 'card_bonus', 2, 'card_grant', '00000000-0000-0000-0000-000000000993'::uuid, '2026-03-20 08:00:00+00'),
  ('00000000-0000-0000-0000-000000001012'::uuid, '00000000-0000-0000-0000-000000000105'::uuid, 'card_bonus', 2, 'card_grant', '00000000-0000-0000-0000-000000000994'::uuid, '2026-03-25 08:10:00+00'),
  ('00000000-0000-0000-0000-000000001013'::uuid, '00000000-0000-0000-0000-000000000109'::uuid, 'post_participation', 2, 'post', '00000000-0000-0000-0000-000000000622'::uuid, '2026-03-30 08:20:00+00'),
  ('00000000-0000-0000-0000-000000001014'::uuid, '00000000-0000-0000-0000-000000000110'::uuid, 'topic_participation', 3, 'topic', (select id from public.topic where slug = 'primaire-centre-reformiste-regionale'), '2026-03-27 09:40:00+00'),
  ('00000000-0000-0000-0000-000000001015'::uuid, '00000000-0000-0000-0000-000000000102'::uuid, 'post_participation', 2, 'post', '00000000-0000-0000-0000-000000000630'::uuid, '2026-03-31 09:10:00+00'),
  ('00000000-0000-0000-0000-000000001016'::uuid, '00000000-0000-0000-0000-000000000104'::uuid, 'topic_participation', 3, 'topic', (select id from public.topic where slug = 'adhesion-pacte-metropolitain-idf'), '2026-03-31 17:00:00+00')
on conflict (id) do update
set
  user_id = excluded.user_id,
  event_type = excluded.event_type,
  delta = excluded.delta,
  reference_entity_type = excluded.reference_entity_type,
  reference_entity_id = excluded.reference_entity_id,
  created_at = excluded.created_at;

insert into public.prediction_submission_history(
  id,
  submission_id,
  topic_id,
  user_id,
  submission_status,
  answer_boolean,
  answer_date,
  answer_numeric,
  answer_option_id,
  answer_ordinal,
  recorded_at
)
values
  ('00000000-0000-0000-0000-000000000901'::uuid, '00000000-0000-0000-0000-000000000801'::uuid, (select id from public.topic where slug = 'union-droite-printemps-2027'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'union-droite-printemps-2027') and slug = 'maire-grande-ville'), null, '2026-03-28 10:00:00+00'),
  ('00000000-0000-0000-0000-000000000902'::uuid, '00000000-0000-0000-0000-000000000808'::uuid, (select id from public.topic where slug = 'budget-paris-defections-2026'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, null, 3, null, null, '2026-03-24 20:00:00+00'),
  ('00000000-0000-0000-0000-000000000903'::uuid, '00000000-0000-0000-0000-000000000808'::uuid, (select id from public.topic where slug = 'budget-paris-defections-2026'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, null, 4, null, null, '2026-03-26 21:00:00+00'),
  ('00000000-0000-0000-0000-000000000904'::uuid, '00000000-0000-0000-0000-000000000822'::uuid, (select id from public.topic where slug = 'tension-cmp-texte-institutionnel'), '00000000-0000-0000-0000-000000000102'::uuid, 'active', null, null, null, null, 4, '2026-03-29 11:00:00+00')
on conflict (id) do update
set
  submission_id = excluded.submission_id,
  topic_id = excluded.topic_id,
  user_id = excluded.user_id,
  submission_status = excluded.submission_status,
  answer_boolean = excluded.answer_boolean,
  answer_date = excluded.answer_date,
  answer_numeric = excluded.answer_numeric,
  answer_option_id = excluded.answer_option_id,
  answer_ordinal = excluded.answer_ordinal,
  recorded_at = excluded.recorded_at;

insert into public.prediction_submission(
  id,
  topic_id,
  user_id,
  submission_status,
  answer_boolean,
  answer_date,
  answer_numeric,
  answer_option_id,
  answer_ordinal,
  submitted_at,
  updated_at,
  source_context
)
values
  ('00000000-0000-0000-0000-000000000825'::uuid, (select id from public.topic where slug = 'renvoi-metropole-marches-publics'), '00000000-0000-0000-0000-000000000105'::uuid, 'active', true, null, null, null, null, '2026-03-22 14:00:00+00', '2026-03-24 08:05:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000826'::uuid, (select id from public.topic where slug = 'renvoi-metropole-marches-publics'), '00000000-0000-0000-0000-000000000103'::uuid, 'active', true, null, null, null, null, '2026-03-24 09:00:00+00', '2026-03-25 07:50:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000827'::uuid, (select id from public.topic where slug = 'renvoi-metropole-marches-publics'), '00000000-0000-0000-0000-000000000108'::uuid, 'active', false, null, null, null, null, '2026-03-23 17:20:00+00', '2026-03-23 17:20:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000828'::uuid, (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), '00000000-0000-0000-0000-000000000111'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate') and slug = 'ligne-territoriale'), null, '2026-03-10 09:00:00+00', '2026-03-10 09:00:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000829'::uuid, (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), '00000000-0000-0000-0000-000000000109'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate') and slug = 'ligne-territoriale'), null, '2026-03-12 17:20:00+00', '2026-03-12 17:20:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000830'::uuid, (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate'), '00000000-0000-0000-0000-000000000110'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'ligne-majoritaire-congres-social-democrate') and slug = 'ligne-sociale'), null, '2026-03-09 10:10:00+00', '2026-03-09 10:10:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000831'::uuid, (select id from public.topic where slug = 'taux-adoption-amendements-compromis'), '00000000-0000-0000-0000-000000000102'::uuid, 'active', null, null, 58, null, null, '2026-03-10 10:00:00+00', '2026-03-10 10:00:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000832'::uuid, (select id from public.topic where slug = 'taux-adoption-amendements-compromis'), '00000000-0000-0000-0000-000000000112'::uuid, 'active', null, null, 62, null, null, '2026-03-11 09:30:00+00', '2026-03-11 09:30:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000833'::uuid, (select id from public.topic where slug = 'taux-adoption-amendements-compromis'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, null, 61, null, null, '2026-03-11 12:45:00+00', '2026-03-11 12:45:00+00', 'homepage'),
  ('00000000-0000-0000-0000-000000000834'::uuid, (select id from public.topic where slug = 'stabilite-coalition-lille'), '00000000-0000-0000-0000-000000000105'::uuid, 'active', null, null, null, null, 2, '2026-02-05 09:00:00+00', '2026-02-05 09:00:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000835'::uuid, (select id from public.topic where slug = 'stabilite-coalition-lille'), '00000000-0000-0000-0000-000000000111'::uuid, 'active', null, null, null, null, 3, '2026-02-06 11:15:00+00', '2026-02-06 11:15:00+00', 'archive'),
  ('00000000-0000-0000-0000-000000000836'::uuid, (select id from public.topic where slug = 'primaire-centre-reformiste-regionale'), '00000000-0000-0000-0000-000000000110'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'primaire-centre-reformiste-regionale') and slug = 'maire-regionale'), null, '2026-03-26 12:00:00+00', '2026-03-28 07:30:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000837'::uuid, (select id from public.topic where slug = 'primaire-centre-reformiste-regionale'), '00000000-0000-0000-0000-000000000109'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'primaire-centre-reformiste-regionale') and slug = 'executif-sortant'), null, '2026-03-25 16:20:00+00', '2026-03-25 16:20:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000838'::uuid, (select id from public.topic where slug = 'primaire-centre-reformiste-regionale'), '00000000-0000-0000-0000-000000000111'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'primaire-centre-reformiste-regionale') and slug = 'maire-regionale'), null, '2026-03-27 09:40:00+00', '2026-03-27 09:40:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000839'::uuid, (select id from public.topic where slug = 'retour-mediatique-figure-gouvernementale'), '00000000-0000-0000-0000-000000000109'::uuid, 'active', null, '2026-05-03', null, null, null, '2026-03-30 08:10:00+00', '2026-03-30 08:10:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000840'::uuid, (select id from public.topic where slug = 'retour-mediatique-figure-gouvernementale'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, '2026-05-07', null, null, null, '2026-03-31 07:05:00+00', '2026-03-31 07:05:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000841'::uuid, (select id from public.topic where slug = 'centralite-retour-ancien-premier-ministre'), '00000000-0000-0000-0000-000000000109'::uuid, 'active', false, null, null, null, null, '2026-02-20 09:00:00+00', '2026-02-20 09:00:00+00', 'archive'),
  ('00000000-0000-0000-0000-000000000842'::uuid, (select id from public.topic where slug = 'centralite-retour-ancien-premier-ministre'), '00000000-0000-0000-0000-000000000110'::uuid, 'active', true, null, null, null, null, '2026-02-18 17:00:00+00', '2026-02-18 17:00:00+00', 'archive'),
  ('00000000-0000-0000-0000-000000000843'::uuid, (select id from public.topic where slug = 'bloc-central-candidature-2027'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', true, null, null, null, null, '2026-03-30 09:30:00+00', '2026-03-30 09:30:00+00', 'homepage'),
  ('00000000-0000-0000-0000-000000000844'::uuid, (select id from public.topic where slug = 'bloc-central-candidature-2027'), '00000000-0000-0000-0000-000000000102'::uuid, 'active', false, null, null, null, null, '2026-03-31 10:15:00+00', '2026-03-31 10:15:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000845'::uuid, (select id from public.topic where slug = 'bloc-central-candidature-2027'), '00000000-0000-0000-0000-000000000109'::uuid, 'active', true, null, null, null, null, '2026-03-31 12:25:00+00', '2026-03-31 12:25:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000846'::uuid, (select id from public.topic where slug = 'premiere-declaration-programmatique-2027'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, '2026-03-30', null, null, null, '2026-03-27 14:00:00+00', '2026-03-28 08:10:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000847'::uuid, (select id from public.topic where slug = 'premiere-declaration-programmatique-2027'), '00000000-0000-0000-0000-000000000110'::uuid, 'active', null, '2026-04-01', null, null, null, '2026-03-28 09:10:00+00', '2026-03-28 09:10:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000848'::uuid, (select id from public.topic where slug = 'lille-liste-union-premier-tour'), '00000000-0000-0000-0000-000000000105'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'lille-liste-union-premier-tour') and slug = 'liste-union-technique'), null, '2026-03-29 11:30:00+00', '2026-03-29 11:30:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000849'::uuid, (select id from public.topic where slug = 'lille-liste-union-premier-tour'), '00000000-0000-0000-0000-000000000111'::uuid, 'active', null, null, null, (select id from public.prediction_option where topic_id = (select id from public.topic where slug = 'lille-liste-union-premier-tour') and slug = 'liste-union-technique'), null, '2026-03-29 18:00:00+00', '2026-03-29 18:00:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000850'::uuid, (select id from public.topic where slug = 'suspension-arrete-logement-paris'), '00000000-0000-0000-0000-000000000105'::uuid, 'active', true, null, null, null, null, '2026-02-18 11:00:00+00', '2026-02-18 11:00:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000851'::uuid, (select id from public.topic where slug = 'suspension-arrete-logement-paris'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', true, null, null, null, null, '2026-02-19 09:50:00+00', '2026-02-19 09:50:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000852'::uuid, (select id from public.topic where slug = 'date-publication-rapport-procedural-region'), '00000000-0000-0000-0000-000000000105'::uuid, 'active', null, '2026-03-28', null, null, null, '2026-03-20 12:00:00+00', '2026-03-20 12:00:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000853'::uuid, (select id from public.topic where slug = 'date-publication-rapport-procedural-region'), '00000000-0000-0000-0000-000000000111'::uuid, 'active', null, '2026-03-29', null, null, null, '2026-03-22 08:00:00+00', '2026-03-22 08:00:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000854'::uuid, (select id from public.topic where slug = 'articles-retenus-texte-decentralisation'), '00000000-0000-0000-0000-000000000102'::uuid, 'active', null, null, 64, null, null, '2026-03-31 09:20:00+00', '2026-03-31 09:20:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000855'::uuid, (select id from public.topic where slug = 'articles-retenus-texte-decentralisation'), '00000000-0000-0000-0000-000000000112'::uuid, 'active', null, null, 59, null, null, '2026-03-30 11:00:00+00', '2026-03-30 11:00:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000856'::uuid, (select id from public.topic where slug = 'part-etats-favorables-defense-europe'), '00000000-0000-0000-0000-000000000106'::uuid, 'active', null, null, 68, null, null, '2026-03-31 06:20:00+00', '2026-03-31 06:20:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000857'::uuid, (select id from public.topic where slug = 'part-etats-favorables-defense-europe'), '00000000-0000-0000-0000-000000000112'::uuid, 'active', null, null, 63, null, null, '2026-03-30 08:10:00+00', '2026-03-30 08:10:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000858'::uuid, (select id from public.topic where slug = 'part-etats-favorables-defense-europe'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, null, 71, null, null, '2026-03-31 12:30:00+00', '2026-03-31 12:30:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000859'::uuid, (select id from public.topic where slug = 'volume-participation-congres-ecologiste'), '00000000-0000-0000-0000-000000000111'::uuid, 'active', null, null, 46000, null, null, '2026-03-28 10:45:00+00', '2026-03-28 10:45:00+00', 'topic'),
  ('00000000-0000-0000-0000-000000000860'::uuid, (select id from public.topic where slug = 'volume-participation-congres-ecologiste'), '00000000-0000-0000-0000-000000000109'::uuid, 'active', null, null, 51000, null, null, '2026-03-29 09:10:00+00', '2026-03-29 09:10:00+00', 'space'),
  ('00000000-0000-0000-0000-000000000861'::uuid, (select id from public.topic where slug = 'adhesion-pacte-metropolitain-idf'), '00000000-0000-0000-0000-000000000101'::uuid, 'active', null, null, 57, null, null, '2026-03-31 08:50:00+00', '2026-03-31 08:50:00+00', 'feed'),
  ('00000000-0000-0000-0000-000000000862'::uuid, (select id from public.topic where slug = 'adhesion-pacte-metropolitain-idf'), '00000000-0000-0000-0000-000000000102'::uuid, 'active', null, null, 61, null, null, '2026-04-01 07:40:00+00', '2026-04-01 07:40:00+00', 'homepage'),
  ('00000000-0000-0000-0000-000000000863'::uuid, (select id from public.topic where slug = 'adhesion-pacte-metropolitain-idf'), '00000000-0000-0000-0000-000000000104'::uuid, 'active', null, null, 54, null, null, '2026-03-31 17:00:00+00', '2026-03-31 17:00:00+00', 'space')
on conflict (id) do update
set
  topic_id = excluded.topic_id,
  user_id = excluded.user_id,
  submission_status = excluded.submission_status,
  answer_boolean = excluded.answer_boolean,
  answer_date = excluded.answer_date,
  answer_numeric = excluded.answer_numeric,
  answer_option_id = excluded.answer_option_id,
  answer_ordinal = excluded.answer_ordinal,
  submitted_at = excluded.submitted_at,
  updated_at = excluded.updated_at,
  source_context = excluded.source_context;

-- --------------------------------------------------------------------------
-- Polls
-- --------------------------------------------------------------------------

insert into public.poll(id, space_id, topic_id, created_by, title, description, poll_status, visibility, open_at, close_at, created_at)
values
  ('00000000-0000-0000-0000-000000000401'::uuid, null, (select id from public.topic where slug = 'union-droite-printemps-2027'), '00000000-0000-0000-0000-000000000101'::uuid, 'Quel profil parait le plus rassembleur ?', 'Poll lie au sujet presidentiel pour distinguer perception et prediction.', 'open', 'public', '2026-03-20 09:00:00+00', '2026-04-10 20:00:00+00', '2026-03-20 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000402'::uuid, null, (select id from public.topic where slug = 'budget-paris-defections-2026'), '00000000-0000-0000-0000-000000000101'::uuid, 'Quel facteur comptera le plus dans le decompte final ?', 'Poll de contexte sur le budget parisien.', 'closed', 'public', '2026-03-20 09:00:00+00', '2026-03-27 18:00:00+00', '2026-03-20 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000403'::uuid, (select id from public.space where slug = 'municipales-grandes-villes'), null, '00000000-0000-0000-0000-000000000103'::uuid, 'Le climat municipal se stabilise-t-il ?', 'Poll de perception espace pour grandes villes.', 'open', 'public', '2026-03-24 09:00:00+00', '2026-04-15 18:00:00+00', '2026-03-24 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000404'::uuid, null, (select id from public.topic where slug = 'renvoi-metropole-marches-publics'), '00000000-0000-0000-0000-000000000105'::uuid, 'Quelle source sera la plus utile pour suivre la procedure ?', 'Poll d''orientation documentaire sur le sujet judiciaire.', 'open', 'public', '2026-03-23 09:00:00+00', '2026-04-08 18:00:00+00', '2026-03-23 09:00:00+00')
on conflict (id) do update
set
  space_id = excluded.space_id,
  topic_id = excluded.topic_id,
  created_by = excluded.created_by,
  title = excluded.title,
  description = excluded.description,
  poll_status = excluded.poll_status,
  visibility = excluded.visibility,
  open_at = excluded.open_at,
  close_at = excluded.close_at,
  created_at = excluded.created_at;

-- --------------------------------------------------------------------------
-- Additional topics to reach a full minimal UX corpus
-- --------------------------------------------------------------------------

with extra_topic_seed (
  id,
  space_slug,
  slug,
  title,
  description,
  topic_status,
  created_by,
  open_at,
  close_at,
  resolve_deadline_at,
  primary_country_code,
  primary_territory_code,
  is_sensitive,
  locked_reason
) as (
  values
    ('00000000-0000-0000-0000-000000000316'::uuid, 'presidentielle-2027', 'bloc-central-candidature-2027', 'Le bloc central trouvera-t-il une candidature de synthese avant l''ete 2026 ?', 'Sujet national binaire sur la capacite du centre gouvernemental a converger vers une offre lisible.', 'open'::public.topic_status, '00000000-0000-0000-0000-000000000101'::uuid, '2026-03-14 08:00:00+00', '2026-04-25 18:00:00+00', '2026-05-02 18:00:00+00', 'FR', 'france', false, null),
    ('00000000-0000-0000-0000-000000000317'::uuid, 'presidentielle-2027', 'premiere-declaration-programmatique-2027', 'A quelle date interviendra la premiere declaration programmatique commune du bloc de droite ?', 'Sujet national de calendrier, clos et en attente de consolidation politique.', 'locked'::public.topic_status, '00000000-0000-0000-0000-000000000110'::uuid, '2026-02-18 08:00:00+00', '2026-03-29 18:00:00+00', '2026-04-06 18:00:00+00', 'FR', 'france', false, 'Cloture atteinte, publication finale encore attendue.'),
    ('00000000-0000-0000-0000-000000000318'::uuid, 'municipales-grandes-villes', 'lille-liste-union-premier-tour', 'Quel type de liste dominera les discussions d''union a Lille au premier tour ?', 'Sujet municipal ferme pour tester un verrouillage avant cloture sur option fermee.', 'locked'::public.topic_status, '00000000-0000-0000-0000-000000000105'::uuid, '2026-03-18 08:00:00+00', '2026-04-18 18:00:00+00', '2026-04-25 18:00:00+00', 'FR', '59350', false, 'Fenetre de saisie suspendue le temps d''une sequence locale.'),
    ('00000000-0000-0000-0000-000000000319'::uuid, 'justice-affaires', 'suspension-arrete-logement-paris', 'La suspension de l''arrete logement parisien restera-t-elle le point central du contentieux ?', 'Sujet judiciaire deja resolu puis archive, utile pour la lecture historique du feed.', 'resolved'::public.topic_status, '00000000-0000-0000-0000-000000000105'::uuid, '2025-12-12 08:00:00+00', '2026-02-22 18:00:00+00', '2026-03-01 18:00:00+00', 'FR', '75', false, null),
    ('00000000-0000-0000-0000-000000000320'::uuid, 'justice-affaires', 'date-publication-rapport-procedural-region', 'A quelle date le rapport procedural regional sera-t-il rendu public ?', 'Sujet regional resolu, utile pour les cartes et les payloads date.', 'resolved'::public.topic_status, '00000000-0000-0000-0000-000000000105'::uuid, '2026-01-16 08:00:00+00', '2026-03-24 18:00:00+00', '2026-03-31 18:00:00+00', 'FR', '32', false, null),
    ('00000000-0000-0000-0000-000000000321'::uuid, 'gouvernement-institutions', 'articles-retenus-texte-decentralisation', 'Combien d''articles du texte de decentralisation seront conserves en commission mixte ?', 'Sujet numerique national verrouille avant cloture pour tester l''etat locked futur.', 'locked'::public.topic_status, '00000000-0000-0000-0000-000000000102'::uuid, '2026-03-20 08:00:00+00', '2026-04-16 18:00:00+00', '2026-04-23 18:00:00+00', 'FR', 'france', false, 'Saisie suspendue en attendant la CMP.'),
    ('00000000-0000-0000-0000-000000000322'::uuid, 'geopolitique-europe', 'part-etats-favorables-defense-europe', 'Quelle part des Etats membres soutiendra un compromis sur la defense europeenne au prochain sommet ?', 'Sujet geostrategique de pourcentage, ouvert et recent.', 'open'::public.topic_status, '00000000-0000-0000-0000-000000000106'::uuid, '2026-03-21 08:00:00+00', '2026-04-26 18:00:00+00', '2026-05-03 18:00:00+00', 'ZZ', 'europe', false, null),
    ('00000000-0000-0000-0000-000000000323'::uuid, 'partis-congres', 'volume-participation-congres-ecologiste', 'Quel volume de participation militante au congres ecologiste de printemps ?', 'Sujet de volume borne sur un congres partisan ouvert mais plus lent.', 'open'::public.topic_status, '00000000-0000-0000-0000-000000000111'::uuid, '2026-03-12 08:00:00+00', '2026-04-29 18:00:00+00', '2026-05-06 18:00:00+00', 'FR', '11', false, null),
    ('00000000-0000-0000-0000-000000000324'::uuid, 'ile-de-france-politique', 'adhesion-pacte-metropolitain-idf', 'Quel taux d''adhesion politique au pacte metropolitain en Ile-de-France ?', 'Sujet regional dense, utile pour faire remonter un topic territorial ouvert dans le top feed.', 'open'::public.topic_status, '00000000-0000-0000-0000-000000000101'::uuid, '2026-03-22 08:00:00+00', '2026-04-21 18:00:00+00', '2026-04-28 18:00:00+00', 'FR', '11', false, null)
)
insert into public.topic(
  id,
  space_id,
  slug,
  title,
  description,
  topic_status,
  visibility,
  created_by,
  open_at,
  close_at,
  resolve_deadline_at,
  primary_territory_id,
  is_sensitive,
  locked_reason
)
select
  ets.id,
  s.id,
  ets.slug,
  ets.title,
  ets.description,
  ets.topic_status,
  'public'::public.visibility_level,
  ets.created_by,
  ets.open_at::timestamptz,
  ets.close_at::timestamptz,
  ets.resolve_deadline_at::timestamptz,
  tr.id,
  ets.is_sensitive,
  ets.locked_reason
from extra_topic_seed ets
join public.space s on s.slug = ets.space_slug
join public.territory_reference tr
  on tr.country_code = ets.primary_country_code
 and tr.territory_code = ets.primary_territory_code
on conflict (slug) do update
set
  space_id = excluded.space_id,
  title = excluded.title,
  description = excluded.description,
  topic_status = excluded.topic_status,
  visibility = excluded.visibility,
  created_by = excluded.created_by,
  open_at = excluded.open_at,
  close_at = excluded.close_at,
  resolve_deadline_at = excluded.resolve_deadline_at,
  primary_territory_id = excluded.primary_territory_id,
  is_sensitive = excluded.is_sensitive,
  locked_reason = excluded.locked_reason;

with extra_topic_term_seed(topic_slug, axis_slug, term_slug, is_primary) as (
  values
    ('bloc-central-candidature-2027', 'topic_nature', 'electoral', true),
    ('bloc-central-candidature-2027', 'institution_election', 'presidential', false),
    ('bloc-central-candidature-2027', 'geographic_scope', 'national', false),
    ('premiere-declaration-programmatique-2027', 'topic_nature', 'electoral', true),
    ('premiere-declaration-programmatique-2027', 'institution_election', 'presidential', false),
    ('premiere-declaration-programmatique-2027', 'geographic_scope', 'national', false),
    ('lille-liste-union-premier-tour', 'topic_nature', 'local-municipal', true),
    ('lille-liste-union-premier-tour', 'institution_election', 'municipal', false),
    ('lille-liste-union-premier-tour', 'geographic_scope', 'communal', false),
    ('suspension-arrete-logement-paris', 'topic_nature', 'judicial', true),
    ('suspension-arrete-logement-paris', 'geographic_scope', 'departmental', false),
    ('date-publication-rapport-procedural-region', 'topic_nature', 'judicial', true),
    ('date-publication-rapport-procedural-region', 'geographic_scope', 'regional', false),
    ('articles-retenus-texte-decentralisation', 'topic_nature', 'institutional', true),
    ('articles-retenus-texte-decentralisation', 'topic_nature', 'parliamentary', false),
    ('articles-retenus-texte-decentralisation', 'geographic_scope', 'national', false),
    ('part-etats-favorables-defense-europe', 'topic_nature', 'geopolitical', true),
    ('part-etats-favorables-defense-europe', 'geographic_scope', 'international', false),
    ('volume-participation-congres-ecologiste', 'topic_nature', 'partisan-internal', true),
    ('volume-participation-congres-ecologiste', 'geographic_scope', 'regional', false),
    ('adhesion-pacte-metropolitain-idf', 'topic_nature', 'local-municipal', true),
    ('adhesion-pacte-metropolitain-idf', 'geographic_scope', 'regional', false)
)
insert into public.topic_taxonomy_link(topic_id, taxonomy_term_id, is_primary)
select
  t.id,
  tt.id,
  etts.is_primary
from extra_topic_term_seed etts
join public.topic t on t.slug = etts.topic_slug
join public.taxonomy_axis ta on ta.slug = etts.axis_slug
join public.taxonomy_term tt on tt.axis_id = ta.id and tt.slug = etts.term_slug
on conflict (topic_id, taxonomy_term_id) do update
set is_primary = excluded.is_primary;

with extra_topic_territory_seed(topic_slug, country_code, territory_code, is_primary) as (
  values
    ('bloc-central-candidature-2027', 'FR', 'france', true),
    ('premiere-declaration-programmatique-2027', 'FR', 'france', true),
    ('lille-liste-union-premier-tour', 'FR', '59350', true),
    ('suspension-arrete-logement-paris', 'FR', '75', true),
    ('suspension-arrete-logement-paris', 'FR', '75056', false),
    ('date-publication-rapport-procedural-region', 'FR', '32', true),
    ('articles-retenus-texte-decentralisation', 'FR', 'france', true),
    ('part-etats-favorables-defense-europe', 'ZZ', 'europe', true),
    ('volume-participation-congres-ecologiste', 'FR', '11', true),
    ('adhesion-pacte-metropolitain-idf', 'FR', '11', true)
)
insert into public.topic_territory_link(topic_id, territory_id, is_primary)
select
  t.id,
  tr.id,
  etts.is_primary
from extra_topic_territory_seed etts
join public.topic t on t.slug = etts.topic_slug
join public.territory_reference tr
  on tr.country_code = etts.country_code
 and tr.territory_code = etts.territory_code
on conflict (topic_id, territory_id) do update
set is_primary = excluded.is_primary;

with extra_question_seed(
  topic_slug,
  prediction_type,
  title,
  unit_label,
  min_numeric_value,
  max_numeric_value,
  min_date_value,
  max_date_value,
  ordinal_min,
  ordinal_max,
  scoring_method,
  aggregation_method,
  allow_submission_update
) as (
  values
    ('bloc-central-candidature-2027', 'binary'::public.prediction_type, 'Une candidature de synthese sera-t-elle visible avant l''ete ?', null, null, null, null, null, null, null, 'exact_match'::public.prediction_scoring_method, 'binary_split'::public.prediction_aggregation_method, true),
    ('premiere-declaration-programmatique-2027', 'date_value'::public.prediction_type, 'Date attendue de la premiere declaration commune', null, null, null, '2026-03-10'::date, '2026-05-10'::date, null, null, 'date_distance'::public.prediction_scoring_method, 'median_distribution'::public.prediction_aggregation_method, false),
    ('lille-liste-union-premier-tour', 'categorical_closed'::public.prediction_type, 'Quel type de liste dominera les discussions finales ?', null, null, null, null, null, null, null, 'exact_match'::public.prediction_scoring_method, 'option_distribution'::public.prediction_aggregation_method, false),
    ('suspension-arrete-logement-paris', 'binary'::public.prediction_type, 'Le contentieux restera-t-il centre sur la suspension ?', null, null, null, null, null, null, null, 'exact_match'::public.prediction_scoring_method, 'binary_split'::public.prediction_aggregation_method, false),
    ('date-publication-rapport-procedural-region', 'date_value'::public.prediction_type, 'Date de publication attendue du rapport procedural', null, null, null, '2026-03-20'::date, '2026-04-05'::date, null, null, 'date_distance'::public.prediction_scoring_method, 'median_distribution'::public.prediction_aggregation_method, false),
    ('articles-retenus-texte-decentralisation', 'bounded_integer'::public.prediction_type, 'Nombre d''articles retenus', 'articles', 20, 120, null, null, null, null, 'normalized_absolute_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, false),
    ('part-etats-favorables-defense-europe', 'bounded_percentage'::public.prediction_type, 'Part attendue des Etats favorables', '%', 0, 100, null, null, null, null, 'normalized_absolute_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, true),
    ('volume-participation-congres-ecologiste', 'bounded_volume'::public.prediction_type, 'Volume total de participation militante', 'participants', 10000, 120000, null, null, null, null, 'normalized_relative_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, true),
    ('adhesion-pacte-metropolitain-idf', 'bounded_percentage'::public.prediction_type, 'Part de responsables locaux favorables', '%', 0, 100, null, null, null, null, 'normalized_absolute_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, true)
)
insert into public.prediction_question(
  topic_id,
  prediction_type,
  title,
  unit_label,
  min_numeric_value,
  max_numeric_value,
  min_date_value,
  max_date_value,
  ordinal_min,
  ordinal_max,
  scoring_method,
  aggregation_method,
  allow_submission_update
)
select
  t.id,
  eqs.prediction_type,
  eqs.title,
  eqs.unit_label,
  eqs.min_numeric_value,
  eqs.max_numeric_value,
  eqs.min_date_value,
  eqs.max_date_value,
  eqs.ordinal_min,
  eqs.ordinal_max,
  eqs.scoring_method,
  eqs.aggregation_method,
  eqs.allow_submission_update
from extra_question_seed eqs
join public.topic t on t.slug = eqs.topic_slug
on conflict (topic_id) do update
set
  prediction_type = excluded.prediction_type,
  title = excluded.title,
  unit_label = excluded.unit_label,
  min_numeric_value = excluded.min_numeric_value,
  max_numeric_value = excluded.max_numeric_value,
  min_date_value = excluded.min_date_value,
  max_date_value = excluded.max_date_value,
  ordinal_min = excluded.ordinal_min,
  ordinal_max = excluded.ordinal_max,
  scoring_method = excluded.scoring_method,
  aggregation_method = excluded.aggregation_method,
  allow_submission_update = excluded.allow_submission_update;

with extra_option_seed(topic_slug, slug, label, sort_order) as (
  values
    ('lille-liste-union-premier-tour', 'liste-maire-sortant', 'Liste du maire sortant', 10),
    ('lille-liste-union-premier-tour', 'liste-union-technique', 'Liste d''union technique', 20),
    ('lille-liste-union-premier-tour', 'liste-accord-partiel', 'Liste d''accord partiel', 30)
)
insert into public.prediction_option(topic_id, slug, label, sort_order, is_active)
select
  t.id,
  eos.slug,
  eos.label,
  eos.sort_order,
  true
from extra_option_seed eos
join public.topic t on t.slug = eos.topic_slug
on conflict (topic_id, slug) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- --------------------------------------------------------------------------
-- Final topic states and extra posts
-- --------------------------------------------------------------------------

with topic_state_seed(topic_slug, topic_status, locked_reason) as (
  values
    ('union-droite-printemps-2027', 'open'::public.topic_status, null),
    ('motion-censure-avant-automne', 'open'::public.topic_status, null),
    ('budget-paris-defections-2026', 'locked'::public.topic_status, 'Vote clos, decompte consolide attendu.'),
    ('remaniement-marseille-date', 'open'::public.topic_status, null),
    ('score-alliance-ecologiste-lyon', 'open'::public.topic_status, null),
    ('participation-consultation-toulouse', 'open'::public.topic_status, null),
    ('compromis-elargissement-octobre', 'locked'::public.topic_status, 'Saisie suspendue pendant la sequence diplomatique.'),
    ('tension-cmp-texte-institutionnel', 'open'::public.topic_status, null),
    ('renvoi-metropole-marches-publics', 'locked'::public.topic_status, 'Cloture atteinte, source procedurale finale attendue.'),
    ('ligne-majoritaire-congres-social-democrate', 'resolved'::public.topic_status, null),
    ('taux-adoption-amendements-compromis', 'resolved'::public.topic_status, null),
    ('stabilite-coalition-lille', 'archived'::public.topic_status, null),
    ('primaire-centre-reformiste-regionale', 'locked'::public.topic_status, 'Derniers bureaux regionaux encore en consolidation.'),
    ('retour-mediatique-figure-gouvernementale', 'locked'::public.topic_status, 'Sequence de veille, nouvelles saisies suspendues.'),
    ('centralite-retour-ancien-premier-ministre', 'archived'::public.topic_status, null),
    ('bloc-central-candidature-2027', 'open'::public.topic_status, null),
    ('premiere-declaration-programmatique-2027', 'locked'::public.topic_status, 'Publication commune non encore formalisee.'),
    ('lille-liste-union-premier-tour', 'locked'::public.topic_status, 'Sequence locale encore en observation.'),
    ('suspension-arrete-logement-paris', 'resolved'::public.topic_status, null),
    ('date-publication-rapport-procedural-region', 'resolved'::public.topic_status, null),
    ('articles-retenus-texte-decentralisation', 'locked'::public.topic_status, 'Saisie suspendue en attendant la CMP.'),
    ('part-etats-favorables-defense-europe', 'open'::public.topic_status, null),
    ('volume-participation-congres-ecologiste', 'open'::public.topic_status, null),
    ('adhesion-pacte-metropolitain-idf', 'open'::public.topic_status, null)
)
update public.topic t
set
  topic_status = tss.topic_status,
  locked_reason = tss.locked_reason
from topic_state_seed tss
where t.slug = tss.topic_slug;

insert into public.post(
  id,
  space_id,
  topic_id,
  author_user_id,
  post_type,
  post_status,
  title,
  body_markdown,
  body_plaintext,
  created_at
)
values
  ('00000000-0000-0000-0000-000000000625'::uuid, (select id from public.space where slug = 'presidentielle-2027'), (select id from public.topic where slug = 'bloc-central-candidature-2027'), '00000000-0000-0000-0000-000000000101'::uuid, 'analysis', 'visible', 'Une synthese reste possible mais tardive', 'La fenetre de synthese existe encore, mais elle depend d''une articulation entre profils gouvernementaux et maires de grande ville.', 'La synthese reste possible mais tardive.', '2026-03-30 09:20:00+00'),
  ('00000000-0000-0000-0000-000000000626'::uuid, (select id from public.space where slug = 'presidentielle-2027'), (select id from public.topic where slug = 'premiere-declaration-programmatique-2027'), '00000000-0000-0000-0000-000000000110'::uuid, 'moderation', 'visible', 'Attente de declaration commune', 'Le sujet est clos. Une publication commune a ete annoncee mais pas encore documentee de maniere stable.', 'Declaration commune encore attendue.', '2026-03-31 08:40:00+00'),
  ('00000000-0000-0000-0000-000000000627'::uuid, (select id from public.space where slug = 'municipales-grandes-villes'), (select id from public.topic where slug = 'lille-liste-union-premier-tour'), '00000000-0000-0000-0000-000000000105'::uuid, 'local', 'visible', 'Les discussions d''union restent tres techniques', 'Le centre de gravite s''est deplace vers une liste d''union technique plutot qu''une fusion pleine et simple.', 'Les discussions d union restent techniques.', '2026-03-29 11:00:00+00'),
  ('00000000-0000-0000-0000-000000000628'::uuid, (select id from public.space where slug = 'justice-affaires'), (select id from public.topic where slug = 'suspension-arrete-logement-paris'), '00000000-0000-0000-0000-000000000105'::uuid, 'resolution_justification', 'visible', 'Resolution archivee', 'La sequence a confirme que la suspension de l''arrete etait bien restee le coeur du contentieux observe.', 'Resolution archivee sur une sequence contentieuse parisienne.', '2026-03-05 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000629'::uuid, (select id from public.space where slug = 'justice-affaires'), (select id from public.topic where slug = 'date-publication-rapport-procedural-region'), '00000000-0000-0000-0000-000000000105'::uuid, 'resolution_justification', 'visible', 'Le rapport a finalement ete publie en fin de semaine', 'La publication regionale est intervenue apres plusieurs annonces contradictoires mais dans la fenetre observee.', 'Le rapport procedural regional a fini par etre publie en fin de semaine.', '2026-03-30 07:55:00+00'),
  ('00000000-0000-0000-0000-000000000630'::uuid, (select id from public.space where slug = 'gouvernement-institutions'), (select id from public.topic where slug = 'articles-retenus-texte-decentralisation'), '00000000-0000-0000-0000-000000000102'::uuid, 'analysis', 'visible', 'La negotiation se resserre sur un noyau d''articles', 'Le sujet porte sur le nombre reel d''articles qui survivront a la commission mixte, pas sur le bruit de seance.', 'La negotiation se resserre sur un noyau d articles.', '2026-03-31 09:10:00+00'),
  ('00000000-0000-0000-0000-000000000631'::uuid, (select id from public.space where slug = 'geopolitique-europe'), (select id from public.topic where slug = 'part-etats-favorables-defense-europe'), '00000000-0000-0000-0000-000000000106'::uuid, 'analysis', 'visible', 'Le compromis defense reste conditionne a quelques capitales', 'Le niveau de soutien reste assez large mais encore fragile autour de trois Etats charnieres.', 'Le compromis defense depend de quelques capitales charnieres.', '2026-03-31 06:50:00+00'),
  ('00000000-0000-0000-0000-000000000632'::uuid, (select id from public.space where slug = 'partis-congres'), (select id from public.topic where slug = 'volume-participation-congres-ecologiste'), '00000000-0000-0000-0000-000000000111'::uuid, 'analysis', 'visible', 'Le congres devrait mobiliser au-dela du coeur militant habituel', 'Les federations urbaines semblent capables de hausser le niveau de participation au-dela des cycles ordinaires.', 'Le congres pourrait mobiliser au-dela du coeur militant habituel.', '2026-03-30 13:15:00+00'),
  ('00000000-0000-0000-0000-000000000633'::uuid, (select id from public.space where slug = 'ile-de-france-politique'), (select id from public.topic where slug = 'adhesion-pacte-metropolitain-idf'), '00000000-0000-0000-0000-000000000101'::uuid, 'local', 'visible', 'Le pacte metropolitain provoque des adhesions selectives', 'Le sujet oppose surtout des communes deja cooperatives a des executifs plus prudents en grande couronne.', 'Le pacte metropolitain provoque des adhesions selectives.', '2026-03-31 08:45:00+00'),
  ('00000000-0000-0000-0000-000000000634'::uuid, (select id from public.space where slug = 'ile-de-france-politique'), (select id from public.topic where slug = 'adhesion-pacte-metropolitain-idf'), '00000000-0000-0000-0000-000000000102'::uuid, 'discussion', 'visible', 'Le sujet depasse le seul centre parisien', 'Les signaux de soutien ne viennent pas seulement du coeur metropolitain mais aussi d''elus de premiere couronne.', 'Les signaux de soutien depassent Paris intra muros.', '2026-04-01 07:35:00+00'),
  ('00000000-0000-0000-0000-000000000635'::uuid, (select id from public.space where slug = 'personnalites-strategies'), (select id from public.topic where slug = 'centralite-retour-ancien-premier-ministre'), '00000000-0000-0000-0000-000000000109'::uuid, 'analysis', 'visible', 'Une hypothese finalement moins tenace qu''annonce', 'Le sujet archive montre surtout une baisse de centralite mediatique une fois la sequence locale passee.', 'Le sujet archive montre une baisse de centralite mediatique.', '2026-03-01 09:10:00+00')
on conflict (id) do update
set
  space_id = excluded.space_id,
  topic_id = excluded.topic_id,
  author_user_id = excluded.author_user_id,
  post_type = excluded.post_type,
  post_status = excluded.post_status,
  title = excluded.title,
  body_markdown = excluded.body_markdown,
  body_plaintext = excluded.body_plaintext,
  created_at = excluded.created_at;
