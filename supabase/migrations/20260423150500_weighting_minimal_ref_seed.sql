begin;

-- ─────────────────────────────────────────────────────────────
-- Weighting worker — phase 1b, migration 2/4
--
-- MINIMAL reference data so the pipeline runs end-to-end locally.
-- This is NOT the production seed — the real INSEE / Ministère de
-- l'Intérieur / geo.api.gouv.fr data lands in a dedicated Python
-- seed script before phase 3 (worker pipeline).
--
-- What's in here:
--   • A single as_of='2022-04-15' row so current_valid_reference_date()
--     returns something plausible.
--   • Placeholder national marginals for age_bucket, sex, region, csp,
--     education, past_vote_pr1_2022. Sources cited; numbers deliberately
--     rounded — they exist to validate the pipeline's shape, not to
--     produce defensible estimates.
--   • A tiny region_by_postal stub (one row per métropole département
--     prefix, 13 regions) so derive_region() works in tests.
--
-- All inserts are idempotent via `on conflict do nothing`.
-- ─────────────────────────────────────────────────────────────

-- ── survey_ref_marginal (placeholder, INSEE RP 2022 approximate) ──
insert into public.survey_ref_marginal (as_of, dimension, category, share, source_label, source_url)
values
  ('2022-04-15', 'age_bucket', '18_24',   0.107, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'age_bucket', '25_34',   0.161, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'age_bucket', '35_49',   0.240, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'age_bucket', '50_64',   0.247, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'age_bucket', '65_plus', 0.245, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'age_bucket', 'unknown', 0.000, 'K-1a unknown bucket',         null),

  ('2022-04-15', 'sex',        'F',       0.521, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'sex',        'M',       0.479, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'sex',        'other',   0.000, 'K-1a unknown bucket',         null),
  ('2022-04-15', 'sex',        'unknown', 0.000, 'K-1a unknown bucket',         null),

  -- Education — INSEE simplified 4-ladder (approximate share 18+)
  ('2022-04-15', 'education',  'none',      0.280, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'education',  'bac',       0.260, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'education',  'bac2',      0.180, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'education',  'bac3_plus', 0.280, 'INSEE RP 2022 (placeholder)', 'https://www.insee.fr/fr/statistiques/'),
  ('2022-04-15', 'education',  'unknown',   0.000, 'K-1a unknown bucket',         null),

  -- Past vote at PR1 2022 — Ministère de l'Intérieur (approximate share of registered voters)
  ('2022-04-15', 'past_vote_pr1_2022', 'Macron',       0.217, 'Ministère de l''Intérieur 2022 T1', 'https://www.data.gouv.fr/fr/datasets/elections-presidentielles-2022-resultats/'),
  ('2022-04-15', 'past_vote_pr1_2022', 'Le Pen',       0.169, 'Ministère de l''Intérieur 2022 T1', 'https://www.data.gouv.fr/fr/datasets/elections-presidentielles-2022-resultats/'),
  ('2022-04-15', 'past_vote_pr1_2022', 'Mélenchon',    0.169, 'Ministère de l''Intérieur 2022 T1', 'https://www.data.gouv.fr/fr/datasets/elections-presidentielles-2022-resultats/'),
  ('2022-04-15', 'past_vote_pr1_2022', 'Zemmour',      0.056, 'Ministère de l''Intérieur 2022 T1', 'https://www.data.gouv.fr/fr/datasets/elections-presidentielles-2022-resultats/'),
  ('2022-04-15', 'past_vote_pr1_2022', 'Pécresse',     0.036, 'Ministère de l''Intérieur 2022 T1', 'https://www.data.gouv.fr/fr/datasets/elections-presidentielles-2022-resultats/'),
  ('2022-04-15', 'past_vote_pr1_2022', 'Jadot',        0.036, 'Ministère de l''Intérieur 2022 T1', 'https://www.data.gouv.fr/fr/datasets/elections-presidentielles-2022-resultats/'),
  ('2022-04-15', 'past_vote_pr1_2022', 'other',        0.055, 'Ministère de l''Intérieur 2022 T1', 'https://www.data.gouv.fr/fr/datasets/elections-presidentielles-2022-resultats/'),
  ('2022-04-15', 'past_vote_pr1_2022', 'abstention',   0.262, 'Ministère de l''Intérieur 2022 T1', 'https://www.data.gouv.fr/fr/datasets/elections-presidentielles-2022-resultats/'),
  ('2022-04-15', 'past_vote_pr1_2022', 'unknown',      0.000, 'K-1a unknown bucket',               null)
on conflict (as_of, dimension, category) do nothing;

-- ── region_by_postal (minimal métropole stub: 1 canonical postal code per région) ──
-- The real table gets ~35 000 rows from geo.api.gouv.fr in a later seed.
insert into public.region_by_postal (postal_code, region_code, region_label)
values
  ('75001', '11', 'Île-de-France'),
  ('33000', '75', 'Nouvelle-Aquitaine'),
  ('69001', '84', 'Auvergne-Rhône-Alpes'),
  ('13001', '93', 'Provence-Alpes-Côte d''Azur'),
  ('59000', '32', 'Hauts-de-France'),
  ('67000', '44', 'Grand Est'),
  ('44000', '52', 'Pays de la Loire'),
  ('35000', '53', 'Bretagne'),
  ('31000', '76', 'Occitanie'),
  ('21000', '27', 'Bourgogne-Franche-Comté'),
  ('14000', '28', 'Normandie'),
  ('45000', '24', 'Centre-Val de Loire'),
  ('20000', '94', 'Corse')
on conflict (postal_code) do nothing;

commit;
