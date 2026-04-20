begin;

-- ─────────────────────────────────────────────────────────────
-- Extension de l'historique electoral :
--   1. Nouveaux scrutins : Legislatives 2024 (dissolution) + Europeennes 2024
--   2. Seed des resultats par nuance/bloc pour les legislatives 2012/2017/2022/2024
--   3. Complement des resultats europeens 2024
--
-- Sources : archives-resultats-elections.interieur.gouv.fr
-- % des suffrages exprimes, France entiere, 1er tour pour les legislatives.
-- ─────────────────────────────────────────────────────────────

-- 1. Nouveaux scrutins
insert into public.election (slug, type, year, round, held_on, label, source_url) values
  ('legislatives-2024-t1', 'legislatives', 2024, 1, '2024-06-30', 'Legislatives 2024 - 1er tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/legislatives2024/ensemble_geographique/index.php'),
  ('legislatives-2024-t2', 'legislatives', 2024, 2, '2024-07-07', 'Legislatives 2024 - 2nd tour',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/legislatives2024/ensemble_geographique/index.php'),
  ('europeennes-2024',    'europeennes',   2024, null, '2024-06-09', 'Europeennes 2024',
   'https://www.archives-resultats-elections.interieur.gouv.fr/resultats/europeennes2024/ensemble_geographique/index.php')
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 2. Europeennes 2024 (listes principales, 1er tour unique)
-- ─────────────────────────────────────────────────────────────
insert into public.election_result (election_id, rank, candidate_name, list_label, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'europeennes-2024'),  1, 'Jordan Bardella',       'La France revient (Rassemblement national)',              'rn',          'RN',  31.37),
  ((select id from public.election where slug = 'europeennes-2024'),  2, 'Valerie Hayer',         'Besoin d''Europe (Renaissance - MoDem - Horizons)',       'renaissance', 'ENS', 14.60),
  ((select id from public.election where slug = 'europeennes-2024'),  3, 'Raphael Glucksmann',    'Reveiller l''Europe (PS - Place publique)',               'ps',          'SOC', 13.83),
  ((select id from public.election where slug = 'europeennes-2024'),  4, 'Manon Aubry',           'La France insoumise - Union populaire',                   'lfi',         'FI',   9.89),
  ((select id from public.election where slug = 'europeennes-2024'),  5, 'Francois-Xavier Bellamy','La droite pour faire entendre la voix de la France',     'lr',          'LR',   7.25),
  ((select id from public.election where slug = 'europeennes-2024'),  6, 'Marie Toussaint',       'Europe Ecologie',                                         'ecologistes', 'ECO',  5.50),
  ((select id from public.election where slug = 'europeennes-2024'),  7, 'Marion Marechal',       'La France fiere (Reconquete)',                            'reconquete',  'REC',  5.47),
  ((select id from public.election where slug = 'europeennes-2024'),  8, 'Leon Deffontaines',     'Gauche unie pour le monde du travail (PCF)',              'pcf',         'COM',  2.36),
  ((select id from public.election where slug = 'europeennes-2024'),  9, 'Helene Thouy',          'Parti animaliste',                                        'parti-animaliste', 'DIV', 2.04),
  ((select id from public.election where slug = 'europeennes-2024'), 10, 'Francois Asselineau',   'Union populaire republicaine',                            'upr',         'EXD',  1.18)
on conflict (election_id, rank) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 3. Legislatives 2024 T1 (blocs nationaux)
-- ─────────────────────────────────────────────────────────────
insert into public.election_result (election_id, rank, candidate_name, list_label, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'legislatives-2024-t1'), 1, null, 'Rassemblement national et alliés (Union Extrême Droite)', 'rn',          'UXD', 33.42),
  ((select id from public.election where slug = 'legislatives-2024-t1'), 2, null, 'Nouveau Front populaire',                                 'lfi',         'UG',  28.84),
  ((select id from public.election where slug = 'legislatives-2024-t1'), 3, null, 'Ensemble pour la Republique',                             'renaissance', 'ENS', 21.80),
  ((select id from public.election where slug = 'legislatives-2024-t1'), 4, null, 'Les Republicains + UDI + Divers droite',                  'lr',          'UDC',  8.49),
  ((select id from public.election where slug = 'legislatives-2024-t1'), 5, null, 'Divers droite',                                           null,          'DVD',  3.61),
  ((select id from public.election where slug = 'legislatives-2024-t1'), 6, null, 'Divers gauche',                                           null,          'DVG',  1.37),
  ((select id from public.election where slug = 'legislatives-2024-t1'), 7, null, 'Reconquete',                                              'reconquete',  'REC',  0.74),
  ((select id from public.election where slug = 'legislatives-2024-t1'), 8, null, 'Ecologistes',                                             'ecologistes', 'ECO',  0.38),
  ((select id from public.election where slug = 'legislatives-2024-t1'), 9, null, 'Extreme gauche',                                          'lutte-ouvriere','EXG',  0.25),
  ((select id from public.election where slug = 'legislatives-2024-t1'),10, null, 'Regionalistes',                                           null,          'REG',  0.56)
on conflict (election_id, rank) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 4. Legislatives 2022 T1 (blocs nationaux)
-- ─────────────────────────────────────────────────────────────
insert into public.election_result (election_id, rank, candidate_name, list_label, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'legislatives-2022-t1'), 1, null, 'Ensemble (majorité présidentielle)',                      'renaissance', 'ENS', 25.75),
  ((select id from public.election where slug = 'legislatives-2022-t1'), 2, null, 'Nouvelle Union populaire écologique et sociale (NUPES)',  'lfi',         'NUP', 25.66),
  ((select id from public.election where slug = 'legislatives-2022-t1'), 3, null, 'Rassemblement national',                                  'rn',          'RN',  18.68),
  ((select id from public.election where slug = 'legislatives-2022-t1'), 4, null, 'Union de la droite et du centre (LR + UDI + DVD)',        'lr',          'UDC', 11.29),
  ((select id from public.election where slug = 'legislatives-2022-t1'), 5, null, 'Reconquete',                                              'reconquete',  'REC',  4.24),
  ((select id from public.election where slug = 'legislatives-2022-t1'), 6, null, 'Divers gauche',                                           null,          'DVG',  3.26),
  ((select id from public.election where slug = 'legislatives-2022-t1'), 7, null, 'Divers droite',                                           null,          'DVD',  3.13),
  ((select id from public.election where slug = 'legislatives-2022-t1'), 8, null, 'Divers souverainiste',                                    'dlf',         'DSV',  1.27),
  ((select id from public.election where slug = 'legislatives-2022-t1'), 9, null, 'Ecologistes (hors NUPES)',                                'ecologistes', 'ECO',  1.09),
  ((select id from public.election where slug = 'legislatives-2022-t1'),10, null, 'Extreme gauche',                                          'lutte-ouvriere','EXG',  0.77),
  ((select id from public.election where slug = 'legislatives-2022-t1'),11, null, 'Regionalistes',                                           null,          'REG',  1.23)
on conflict (election_id, rank) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 5. Legislatives 2017 T1 (blocs nationaux - rappel)
-- ─────────────────────────────────────────────────────────────
insert into public.election_result (election_id, rank, candidate_name, list_label, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'legislatives-2017-t1'), 1, null, 'La République en Marche + MoDem',                         'renaissance', 'REM', 32.33),
  ((select id from public.election where slug = 'legislatives-2017-t1'), 2, null, 'Les Républicains + UDI + DVD',                            'lr',          'LR',  21.56),
  ((select id from public.election where slug = 'legislatives-2017-t1'), 3, null, 'Front national',                                          'rn',          'FN',  13.20),
  ((select id from public.election where slug = 'legislatives-2017-t1'), 4, null, 'La France insoumise',                                     'lfi',         'FI',  11.03),
  ((select id from public.election where slug = 'legislatives-2017-t1'), 5, null, 'Parti socialiste + PRG',                                  'ps',          'SOC',  9.51),
  ((select id from public.election where slug = 'legislatives-2017-t1'), 6, null, 'Ecologistes (EELV)',                                      'ecologistes', 'ECO',  4.30),
  ((select id from public.election where slug = 'legislatives-2017-t1'), 7, null, 'Parti communiste',                                        'pcf',         'COM',  2.72),
  ((select id from public.election where slug = 'legislatives-2017-t1'), 8, null, 'Debout la France',                                        'dlf',         'DLF',  1.17),
  ((select id from public.election where slug = 'legislatives-2017-t1'), 9, null, 'Extreme gauche',                                          'lutte-ouvriere','EXG',  0.77),
  ((select id from public.election where slug = 'legislatives-2017-t1'),10, null, 'Divers',                                                  null,          'DIV',  3.41)
on conflict (election_id, rank) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 6. Legislatives 2012 T1 (blocs nationaux - rappel)
-- ─────────────────────────────────────────────────────────────
insert into public.election_result (election_id, rank, candidate_name, list_label, party_slug, nuance, pct_exprimes) values
  ((select id from public.election where slug = 'legislatives-2012-t1'), 1, null, 'Parti socialiste + PRG',                                  'ps',          'SOC', 29.35),
  ((select id from public.election where slug = 'legislatives-2012-t1'), 2, null, 'Union pour un Mouvement Populaire',                       'lr',          'UMP', 27.12),
  ((select id from public.election where slug = 'legislatives-2012-t1'), 3, null, 'Front national',                                          'rn',          'FN',  13.60),
  ((select id from public.election where slug = 'legislatives-2012-t1'), 4, null, 'Front de Gauche',                                         'pcf',         'FG',   6.91),
  ((select id from public.election where slug = 'legislatives-2012-t1'), 5, null, 'Europe Ecologie Les Verts',                               'ecologistes', 'ECO',  5.46),
  ((select id from public.election where slug = 'legislatives-2012-t1'), 6, null, 'Centre (MoDem + Nouveau Centre + Parti Radical)',         'modem',       'CEN',  3.40),
  ((select id from public.election where slug = 'legislatives-2012-t1'), 7, null, 'Debout la Republique',                                    'dlf',         'DLR',  0.56),
  ((select id from public.election where slug = 'legislatives-2012-t1'), 8, null, 'Extreme gauche',                                          'lutte-ouvriere','EXG',  0.98),
  ((select id from public.election where slug = 'legislatives-2012-t1'), 9, null, 'Divers droite',                                           null,          'DVD',  3.51),
  ((select id from public.election where slug = 'legislatives-2012-t1'),10, null, 'Divers gauche',                                           null,          'DVG',  3.40)
on conflict (election_id, rank) do nothing;

commit;
