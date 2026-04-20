begin;

-- ─────────────────────────────────────────
-- 1. Partis politiques (complétion du seed)
--    'renaissance', 'rn', 'lfi', 'lr', 'ecologistes' existent déjà
-- ─────────────────────────────────────────
insert into public.political_entity (type, slug, name, metadata) values
  ('party', 'ps',                   'Parti socialiste',                                 '{"acronyme":"PS","dirigeant":"Olivier Faure","positionnement":"centre gauche / social-democratie","date_creation":"1969-05-04"}'::jsonb),
  ('party', 'modem',                'Mouvement democrate',                              '{"acronyme":"MoDem","dirigeant":"Francois Bayrou","positionnement":"centre","date_creation":"2007-12-01"}'::jsonb),
  ('party', 'horizons',             'Horizons',                                         '{"acronyme":"HOR","dirigeant":"Edouard Philippe","positionnement":"centre droit","date_creation":"2021-10-09"}'::jsonb),
  ('party', 'pcf',                  'Parti communiste francais',                        '{"acronyme":"PCF","dirigeant":"Fabien Roussel","positionnement":"gauche / communiste","date_creation":"1920-12-29"}'::jsonb),
  ('party', 'reconquete',           'Reconquete',                                       '{"acronyme":"REC","dirigeant":"Eric Zemmour","positionnement":"extreme droite / national-conservateur","date_creation":"2021-12-05"}'::jsonb),
  ('party', 'udi',                  'Union des democrates et independants',             '{"acronyme":"UDI","dirigeant":"Herve Marseille","positionnement":"centre droit","date_creation":"2012-10-21"}'::jsonb),
  ('party', 'parti-radical',        'Parti radical',                                    '{"acronyme":"PRV","dirigeant":"Nathalie Delattre","positionnement":"centre / centre droit","date_creation":"1901-06-23"}'::jsonb),
  ('party', 'les-centristes',       'Les Centristes',                                   '{"acronyme":"LC","dirigeant":"Herve Morin","positionnement":"centre droit","date_creation":"2007-05-29"}'::jsonb),
  ('party', 'dlf',                  'Debout la France',                                 '{"acronyme":"DLF","dirigeant":"Nicolas Dupont-Aignan","positionnement":"souverainiste","date_creation":"1999-11-20"}'::jsonb),
  ('party', 'place-publique',       'Place publique',                                   '{"acronyme":"PP","dirigeant":"Raphael Glucksmann","positionnement":"centre gauche / pro-europeen","date_creation":"2018-11-01"}'::jsonb),
  ('party', 'generations',          'Generation.s',                                     '{"acronyme":"G.s","dirigeant":"Benoit Hamon","positionnement":"gauche","date_creation":"2017-07-01"}'::jsonb),
  ('party', 'parti-animaliste',     'Parti animaliste',                                 '{"acronyme":"PA","dirigeant":"Helene Thouy","positionnement":"animaliste, transpartisan","date_creation":"2016-11-01"}'::jsonb),
  ('party', 'upr',                  'Union populaire republicaine',                     '{"acronyme":"UPR","dirigeant":"Francois Asselineau","positionnement":"souverainiste / eurosceptique","date_creation":"2007-03-25"}'::jsonb),
  ('party', 'resistons',            'Resistons !',                                      '{"acronyme":"R!","dirigeant":"Jean Lassalle","positionnement":"ruraliste / souverainiste","date_creation":"2016-11-18"}'::jsonb),
  ('party', 'les-patriotes',        'Les Patriotes',                                    '{"acronyme":"LP","dirigeant":"Florian Philippot","positionnement":"souverainiste / extreme droite","date_creation":"2017-06-29"}'::jsonb),
  ('party', 'npa-anticapitaliste',  'Nouveau Parti anticapitaliste - L''Anticapitaliste','{"acronyme":"NPA-A","positionnement":"extreme gauche","date_creation":"2022-12-10"}'::jsonb),
  ('party', 'npa-revolutionnaires', 'Nouveau Parti anticapitaliste - Revolutionnaires', '{"acronyme":"NPA-R","positionnement":"extreme gauche","date_creation":"2022-12-10"}'::jsonb),
  ('party', 'lutte-ouvriere',       'Lutte ouvriere',                                   '{"acronyme":"LO","dirigeant":"Nathalie Arthaud","positionnement":"extreme gauche trotskiste","date_creation":"1968-01-01"}'::jsonb),
  ('party', 'parti-pirate',         'Parti pirate',                                     '{"acronyme":"PPir","positionnement":"numerique, democratie directe","date_creation":"2006-06-21"}'::jsonb),
  ('party', 'republique-souveraine','Republique souveraine',                            '{"acronyme":"RS","positionnement":"souverainiste","date_creation":"2018-01-01"}'::jsonb),
  ('party', 'equinoxe',             'Equinoxe',                                         '{"positionnement":"ecologie reformiste","date_creation":"2023-01-01"}'::jsonb),
  ('party', 'ecologie-positive',    'Ecologie positive',                                '{"positionnement":"ecologie moderee","date_creation":"2023-01-01"}'::jsonb),
  ('party', 'udmf',                 'Union des democrates musulmans francais',          '{"acronyme":"UDMF","dirigeant":"Nagib Azergui","positionnement":"conservatisme musulman / communautaire","date_creation":"2012-11-01"}'::jsonb),
  ('party', 'pace',                 'Parti des citoyens europeens',                     '{"acronyme":"PACE","positionnement":"federaliste europeen","date_creation":"2023-01-01"}'::jsonb),
  ('party', 'udr',                  'Union des droites pour la Republique',             '{"acronyme":"UDR","dirigeant":"Eric Ciotti","positionnement":"droite / droite dure","date_creation":"2024-01-01"}'::jsonb)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────
-- 2. Politiciens — gouvernement Lecornu + figures politiques
--    Note : apostrophes échappées '' dans les literals SQL
-- ─────────────────────────────────────────

-- Renaissance (gouvernement + figures)
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', v.slug, v.name,
       (select id from public.political_entity where political_entity.slug = 'renaissance' limit 1),
       v.meta::jsonb
from (values
  ('emmanuel-macron',       'Emmanuel Macron',       '{"poste":"President de la Republique"}'),
  ('sebastien-lecornu',     'Sebastien Lecornu',     '{"poste":"Premier ministre"}'),
  ('maud-bregeon',          'Maud Bregeon',          '{"poste":"Ministre deleguee, porte-parole du Gouvernement, chargee de l''Energie"}'),
  ('aurore-berge',          'Aurore Berge',          '{"poste":"Ministre deleguee chargee de l''Egalite femmes-hommes et de la lutte contre les discriminations"}'),
  ('laurent-nunez',         'Laurent Nunez',         '{"poste":"Ministre de l''Interieur"}'),
  ('catherine-vautrin',     'Catherine Vautrin',     '{"poste":"Ministre des Armees et des Anciens combattants"}'),
  ('mathieu-lefevre',       'Mathieu Lefevre',       '{"poste":"Ministre delegue charge de la Transition ecologique"}'),
  ('roland-lescure',        'Roland Lescure',        '{"poste":"Ministre de l''Economie, des Finances et de la Souverainete industrielle"}'),
  ('benjamin-haddad',       'Benjamin Haddad',       '{"poste":"Ministre delegue charge de l''Europe"}'),
  ('eleonore-caroit',       'Eleonore Caroit',       '{"poste":"Ministre deleguee chargee de la Francophonie et des Francais de l''etranger"}'),
  ('stephanie-rist',        'Stephanie Rist',        '{"poste":"Ministre de la Sante, des Familles, de l''Autonomie et des Personnes handicapees"}'),
  ('camille-galliard-minier','Camille Galliard-Minier','{"poste":"Ministre deleguee chargee de l''Autonomie et des Personnes handicapees"}'),
  ('david-amiel',           'David Amiel',           '{"poste":"Ministre de l''Action et des Comptes publics"}'),
  ('yael-braun-pivet',      'Yael Braun-Pivet',      '{"poste":"Presidente de l''Assemblee nationale"}'),
  ('gabriel-attal',         'Gabriel Attal',         '{"poste":"President du groupe EPR a l''Assemblee nationale ; secretaire general de Renaissance ; ancien Premier ministre"}'),
  ('elisabeth-borne',       'Elisabeth Borne',       '{"poste":"Ancienne Premiere ministre"}'),
  ('renaud-muselier',       'Renaud Muselier',       '{"poste":"President de la region Provence-Alpes-Cote d''Azur"}')
) as v(slug, name, meta)
on conflict (slug) do nothing;

-- MoDem
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', v.slug, v.name,
       (select id from public.political_entity where political_entity.slug = 'modem' limit 1),
       v.meta::jsonb
from (values
  ('marie-pierre-vedrenne','Marie-Pierre Vedrenne','{"poste":"Ministre deleguee chargee de la Citoyennete"}'),
  ('jean-noel-barrot',     'Jean-Noel Barrot',     '{"poste":"Ministre de l''Europe et des Affaires etrangeres"}'),
  ('marina-ferrari',       'Marina Ferrari',       '{"poste":"Ministre des Sports, de la Jeunesse et de la Vie associative"}'),
  ('francois-bayrou',      'Francois Bayrou',      '{"poste":"President du MoDem ; maire de Pau ; ancien Premier ministre"}')
) as v(slug, name, meta)
on conflict (slug) do nothing;

-- Horizons
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', v.slug, v.name,
       (select id from public.political_entity where political_entity.slug = 'horizons' limit 1),
       v.meta::jsonb
from (values
  ('edouard-philippe', 'Edouard Philippe', '{"poste":"President d''Horizons ; maire du Havre ; ancien Premier ministre"}'),
  ('christophe-bechu', 'Christophe Bechu', '{"poste":"Secretaire general d''Horizons ; maire d''Angers"}'),
  ('claude-malhuret',  'Claude Malhuret',  '{"poste":"President du groupe Les Independants au Senat"}'),
  ('anne-le-henanff',  'Anne Le Henanff',  '{"poste":"Ministre deleguee chargee de l''Intelligence artificielle et du Numerique"}'),
  ('naima-moutchou',   'Naima Moutchou',   '{"poste":"Ministre des Outre-mer"}'),
  ('franck-leroy',     'Franck Leroy',     '{"poste":"President de la region Grand Est"}')
) as v(slug, name, meta)
on conflict (slug) do nothing;

-- LR
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', v.slug, v.name,
       (select id from public.political_entity where political_entity.slug = 'lr' limit 1),
       v.meta::jsonb
from (values
  ('jean-didier-berger',      'Jean-Didier Berger',      '{"poste":"Ministre delegue aupres du ministre de l''Interieur"}'),
  ('annie-genevard',          'Annie Genevard',          '{"poste":"Ministre de l''Agriculture, de l''Agroalimentaire et de la Souverainete alimentaire"}'),
  ('nicolas-forissier',       'Nicolas Forissier',       '{"poste":"Ministre delegue charge du Commerce exterieur et de l''Attractivite"}'),
  ('philippe-tabarot',        'Philippe Tabarot',        '{"poste":"Ministre des Transports"}'),
  ('vincent-jeanbrun',        'Vincent Jeanbrun',        '{"poste":"Ministre de la Ville et du Logement"}'),
  ('gerard-larcher',          'Gerard Larcher',          '{"poste":"President du Senat"}'),
  ('bruno-retailleau',        'Bruno Retailleau',        '{"poste":"President des Republicains"}'),
  ('francois-xavier-bellamy', 'Francois-Xavier Bellamy', '{"poste":"Vice-president / figure dirigeante LR ; depute europeen"}'),
  ('michel-barnier',          'Michel Barnier',          '{"poste":"Ancien Premier ministre"}'),
  ('rachida-dati',            'Rachida Dati',            '{"poste":"Ancienne Ministre de la Culture ; figure nationale de la droite"}'),
  ('valerie-pecresse',        'Valerie Pecresse',        '{"poste":"Presidente de la region Ile-de-France"}'),
  ('laurent-wauquiez',        'Laurent Wauquiez',        '{"poste":"President de la region Auvergne-Rhone-Alpes"}'),
  ('xavier-bertrand',         'Xavier Bertrand',         '{"poste":"President de la region Hauts-de-France"}'),
  ('jean-luc-moudenc',        'Jean-Luc Moudenc',        '{"poste":"Maire de Toulouse ; president de Toulouse Metropole"}'),
  ('nicolas-sarkozy',         'Nicolas Sarkozy',         '{"poste":"Ancien president de la Republique"}')
) as v(slug, name, meta)
on conflict (slug) do nothing;

-- UDI
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', 'francoise-gatel', 'Francoise Gatel',
       (select id from public.political_entity where slug = 'udi' limit 1),
       '{"poste":"Ministre de l''Amenagement du territoire et de la Decentralisation"}'::jsonb
on conflict (slug) do nothing;

-- RN
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', v.slug, v.name,
       (select id from public.political_entity where political_entity.slug = 'rn' limit 1),
       v.meta::jsonb
from (values
  ('jordan-bardella',    'Jordan Bardella',    '{"poste":"President du Rassemblement national ; depute europeen"}'),
  ('marine-le-pen',      'Marine Le Pen',      '{"poste":"Presidente du groupe RN a l''Assemblee nationale ; deputee"}'),
  ('louis-aliot',        'Louis Aliot',        '{"poste":"Maire de Perpignan ; premier vice-president du RN"}'),
  ('sebastien-chenu',    'Sebastien Chenu',    '{"poste":"Vice-president du RN ; depute"}'),
  ('philippe-ballard',   'Philippe Ballard',   '{"poste":"Porte-parole du RN ; depute"}'),
  ('edwige-diaz',        'Edwige Diaz',        '{"poste":"Vice-presidente du RN ; deputee"}'),
  ('laurent-jacobelli',  'Laurent Jacobelli',  '{"poste":"Porte-parole du RN ; depute"}'),
  ('laure-lavalette',    'Laure Lavalette',    '{"poste":"Deputee"}'),
  ('jean-philippe-tanguy','Jean-Philippe Tanguy','{"poste":"Depute"}'),
  ('julien-odoul',       'Julien Odoul',       '{"poste":"Porte-parole ; depute"}'),
  ('thierry-mariani',    'Thierry Mariani',    '{"poste":"Depute europeen"}'),
  ('jean-paul-garraud',  'Jean-Paul Garraud',  '{"poste":"President de la delegation RN au Parlement europeen"}')
) as v(slug, name, meta)
on conflict (slug) do nothing;

-- LFI
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', v.slug, v.name,
       (select id from public.political_entity where political_entity.slug = 'lfi' limit 1),
       v.meta::jsonb
from (values
  ('manuel-bompard',    'Manuel Bompard',    '{"poste":"Coordinateur national de LFI"}'),
  ('jean-luc-melenchon','Jean-Luc Melenchon','{"poste":"Fondateur et chef de file historique de LFI"}'),
  ('mathilde-panot',    'Mathilde Panot',    '{"poste":"Presidente du groupe LFI a l''Assemblee nationale"}'),
  ('clemence-guette',   'Clemence Guette',   '{"poste":"Deputee ; figure dirigeante LFI"}'),
  ('daniele-obono',     'Daniele Obono',     '{"poste":"Deputee ; figure nationale LFI"}'),
  ('rima-hassan',       'Rima Hassan',       '{"poste":"Deputee europeenne LFI"}')
) as v(slug, name, meta)
on conflict (slug) do nothing;

-- PS
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', v.slug, v.name,
       (select id from public.political_entity where political_entity.slug = 'ps' limit 1),
       v.meta::jsonb
from (values
  ('olivier-faure',        'Olivier Faure',        '{"poste":"Premier secretaire du PS"}'),
  ('boris-vallaud',        'Boris Vallaud',        '{"poste":"Depute ; figure dirigeante PS"}'),
  ('pierre-jouvet',        'Pierre Jouvet',        '{"poste":"Secretaire general du PS"}'),
  ('francois-hollande',    'Francois Hollande',    '{"poste":"Ancien president de la Republique"}'),
  ('carole-delga',         'Carole Delga',         '{"poste":"Presidente de la region Occitanie"}'),
  ('alain-rousset',        'Alain Rousset',        '{"poste":"President de la region Nouvelle-Aquitaine"}'),
  ('loig-chesnais-girard', 'Loig Chesnais-Girard', '{"poste":"President de la region Bretagne"}'),
  ('marie-guite-dufay',    'Marie-Guite Dufay',    '{"poste":"Presidente de la region Bourgogne-Franche-Comte"}'),
  ('emmanuel-gregoire',    'Emmanuel Gregoire',    '{"poste":"Maire de Paris"}'),
  ('benoit-payan',         'Benoit Payan',         '{"poste":"Maire de Marseille"}')
) as v(slug, name, meta)
on conflict (slug) do nothing;

-- Place publique
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', 'raphael-glucksmann', 'Raphael Glucksmann',
       (select id from public.political_entity where slug = 'place-publique' limit 1),
       '{"poste":"Depute europeen ; figure de Place publique-PS"}'::jsonb
on conflict (slug) do nothing;

-- Les Ecologistes
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', v.slug, v.name,
       (select id from public.political_entity where political_entity.slug = 'ecologistes' limit 1),
       v.meta::jsonb
from (values
  ('marine-tondelier',    'Marine Tondelier',    '{"poste":"Secretaire nationale des Ecologistes"}'),
  ('sandrine-rousseau',   'Sandrine Rousseau',   '{"poste":"Deputee ; figure nationale des Ecologistes"}'),
  ('yannick-jadot',       'Yannick Jadot',       '{"poste":"Senateur ; ancien candidat presidentiel"}'),
  ('eric-piolle',         'Eric Piolle',         '{"poste":"Maire de Grenoble"}'),
  ('pierre-hurmic',       'Pierre Hurmic',       '{"poste":"Maire de Bordeaux"}'),
  ('julie-laernoes',      'Julie Laernoes',      '{"poste":"Deputee ; figure ecologiste"}'),
  ('leonore-moncondnhuy', 'Leonore Moncond''huy','{"poste":"Maire de Poitiers"}'),
  ('gregory-doucet',      'Gregory Doucet',      '{"poste":"Maire de Lyon"}')
) as v(slug, name, meta)
on conflict (slug) do nothing;

-- Reconquete
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', v.slug, v.name,
       (select id from public.political_entity where political_entity.slug = 'reconquete' limit 1),
       v.meta::jsonb
from (values
  ('eric-zemmour',    'Eric Zemmour',    '{"poste":"President de Reconquete"}'),
  ('marion-marechal', 'Marion Marechal', '{"poste":"Figure dirigeante ; deputee europeenne"}'),
  ('sarah-knafo',     'Sarah Knafo',     '{"poste":"Vice-presidente / figure dirigeante ; deputee europeenne"}')
) as v(slug, name, meta)
on conflict (slug) do nothing;

-- UDR
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', 'eric-ciotti', 'Eric Ciotti',
       (select id from public.political_entity where slug = 'udr' limit 1),
       '{"poste":"President de l''UDR"}'::jsonb
on conflict (slug) do nothing;

-- Les Centristes
insert into public.political_entity (type, slug, name, parent_entity_id, metadata)
select 'candidate', 'herve-morin', 'Herve Morin',
       (select id from public.political_entity where slug = 'les-centristes' limit 1),
       '{"poste":"President de la region Normandie"}'::jsonb
on conflict (slug) do nothing;

-- Sans etiquette / divers
insert into public.political_entity (type, slug, name, metadata) values
  ('candidate', 'gerald-darmanin',       'Gerald Darmanin',       '{"poste":"Garde des Sceaux, ministre de la Justice","parti":"DVD"}'::jsonb),
  ('candidate', 'jean-castex',           'Jean Castex',           '{"poste":"Ancien Premier ministre ; PDG de la RATP","parti":"divers centre"}'::jsonb),
  ('candidate', 'dominique-de-villepin', 'Dominique de Villepin', '{"poste":"Ancien Premier ministre","parti":"independant"}'::jsonb)
on conflict (slug) do nothing;

commit;
