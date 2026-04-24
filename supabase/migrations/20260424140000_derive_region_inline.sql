-- phase 3c fix: postal code → INSEE region code, via inline department map.
--
-- Why: `region_by_postal` was never seeded (the original design expected a
-- 50k-row data load we never committed). `derive_region()` therefore returned
-- null for every respondent, wiping the region calibration dimension.
--
-- This migration rewrites `derive_region()` to extract the department code
-- (first 2 chars of the metropolitan postal code, 3 chars for overseas prefixes
-- 971-976) and look it up in a 101-row static `insee_department_to_region`
-- table. INSEE region codes stable since the 2015 reform. No external data
-- needed — the mapping is public and immutable.
--
-- `region_by_postal` is kept to avoid breaking callers, but becomes vestigial.

-- ── 1. Static department → region mapping (101 rows: 96 métropole + DROM + COM)
create table if not exists public.insee_department_to_region (
  department_code text primary key,
  region_code     text not null,
  region_name     text not null
);

alter table public.insee_department_to_region enable row level security;
drop policy if exists insee_department_to_region_public_read
  on public.insee_department_to_region;
create policy insee_department_to_region_public_read
  on public.insee_department_to_region for select
  to authenticated, anon
  using (true);

-- Seed as a single idempotent upsert.
insert into public.insee_department_to_region (department_code, region_code, region_name) values
  -- 84 — Auvergne-Rhône-Alpes
  ('01','84','Auvergne-Rhône-Alpes'),
  ('03','84','Auvergne-Rhône-Alpes'),
  ('07','84','Auvergne-Rhône-Alpes'),
  ('15','84','Auvergne-Rhône-Alpes'),
  ('26','84','Auvergne-Rhône-Alpes'),
  ('38','84','Auvergne-Rhône-Alpes'),
  ('42','84','Auvergne-Rhône-Alpes'),
  ('43','84','Auvergne-Rhône-Alpes'),
  ('63','84','Auvergne-Rhône-Alpes'),
  ('69','84','Auvergne-Rhône-Alpes'),
  ('73','84','Auvergne-Rhône-Alpes'),
  ('74','84','Auvergne-Rhône-Alpes'),
  -- 27 — Bourgogne-Franche-Comté
  ('21','27','Bourgogne-Franche-Comté'),
  ('25','27','Bourgogne-Franche-Comté'),
  ('39','27','Bourgogne-Franche-Comté'),
  ('58','27','Bourgogne-Franche-Comté'),
  ('70','27','Bourgogne-Franche-Comté'),
  ('71','27','Bourgogne-Franche-Comté'),
  ('89','27','Bourgogne-Franche-Comté'),
  ('90','27','Bourgogne-Franche-Comté'),
  -- 53 — Bretagne
  ('22','53','Bretagne'),
  ('29','53','Bretagne'),
  ('35','53','Bretagne'),
  ('56','53','Bretagne'),
  -- 24 — Centre-Val de Loire
  ('18','24','Centre-Val de Loire'),
  ('28','24','Centre-Val de Loire'),
  ('36','24','Centre-Val de Loire'),
  ('37','24','Centre-Val de Loire'),
  ('41','24','Centre-Val de Loire'),
  ('45','24','Centre-Val de Loire'),
  -- 94 — Corse (département codes 2A, 2B)
  ('2A','94','Corse'),
  ('2B','94','Corse'),
  -- 44 — Grand Est
  ('08','44','Grand Est'),
  ('10','44','Grand Est'),
  ('51','44','Grand Est'),
  ('52','44','Grand Est'),
  ('54','44','Grand Est'),
  ('55','44','Grand Est'),
  ('57','44','Grand Est'),
  ('67','44','Grand Est'),
  ('68','44','Grand Est'),
  ('88','44','Grand Est'),
  -- 32 — Hauts-de-France
  ('02','32','Hauts-de-France'),
  ('59','32','Hauts-de-France'),
  ('60','32','Hauts-de-France'),
  ('62','32','Hauts-de-France'),
  ('80','32','Hauts-de-France'),
  -- 11 — Île-de-France
  ('75','11','Île-de-France'),
  ('77','11','Île-de-France'),
  ('78','11','Île-de-France'),
  ('91','11','Île-de-France'),
  ('92','11','Île-de-France'),
  ('93','11','Île-de-France'),
  ('94','11','Île-de-France'),
  ('95','11','Île-de-France'),
  -- 28 — Normandie
  ('14','28','Normandie'),
  ('27','28','Normandie'),
  ('50','28','Normandie'),
  ('61','28','Normandie'),
  ('76','28','Normandie'),
  -- 75 — Nouvelle-Aquitaine
  ('16','75','Nouvelle-Aquitaine'),
  ('17','75','Nouvelle-Aquitaine'),
  ('19','75','Nouvelle-Aquitaine'),
  ('23','75','Nouvelle-Aquitaine'),
  ('24','75','Nouvelle-Aquitaine'),
  ('33','75','Nouvelle-Aquitaine'),
  ('40','75','Nouvelle-Aquitaine'),
  ('47','75','Nouvelle-Aquitaine'),
  ('64','75','Nouvelle-Aquitaine'),
  ('79','75','Nouvelle-Aquitaine'),
  ('86','75','Nouvelle-Aquitaine'),
  ('87','75','Nouvelle-Aquitaine'),
  -- 76 — Occitanie
  ('09','76','Occitanie'),
  ('11','76','Occitanie'),
  ('12','76','Occitanie'),
  ('30','76','Occitanie'),
  ('31','76','Occitanie'),
  ('32','76','Occitanie'),
  ('34','76','Occitanie'),
  ('46','76','Occitanie'),
  ('48','76','Occitanie'),
  ('65','76','Occitanie'),
  ('66','76','Occitanie'),
  ('81','76','Occitanie'),
  ('82','76','Occitanie'),
  -- 52 — Pays de la Loire
  ('44','52','Pays de la Loire'),
  ('49','52','Pays de la Loire'),
  ('53','52','Pays de la Loire'),
  ('72','52','Pays de la Loire'),
  ('85','52','Pays de la Loire'),
  -- 93 — Provence-Alpes-Côte d'Azur
  ('04','93','Provence-Alpes-Côte d''Azur'),
  ('05','93','Provence-Alpes-Côte d''Azur'),
  ('06','93','Provence-Alpes-Côte d''Azur'),
  ('13','93','Provence-Alpes-Côte d''Azur'),
  ('83','93','Provence-Alpes-Côte d''Azur'),
  ('84','93','Provence-Alpes-Côte d''Azur'),
  -- Overseas (DROM)
  ('971','01','Guadeloupe'),
  ('972','02','Martinique'),
  ('973','03','Guyane'),
  ('974','04','La Réunion'),
  ('976','06','Mayotte')
on conflict (department_code) do update set
  region_code = excluded.region_code,
  region_name = excluded.region_name;

-- ── 2. Rewrite derive_region() to use the static map.
--
-- Metropolitan postal codes: first 2 chars = department code
--   (special cases: Corsica 2A/2B are encoded as 20 → fall back to 2A)
-- Overseas: first 3 chars ∈ {971..976}
create or replace function public.derive_region(p_postal text)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select m.region_code
  from public.insee_department_to_region m
  where m.department_code = (
    case
      when p_postal is null or length(p_postal) < 2 then null
      when substring(p_postal, 1, 3) in ('971','972','973','974','976')
        then substring(p_postal, 1, 3)
      when substring(p_postal, 1, 2) = '20'   -- Corse : 20xxx → 2A (default)
        then '2A'
      else substring(p_postal, 1, 2)
    end
  );
$$;

comment on function public.derive_region(text) is
  'Postal code → INSEE region code via department lookup. Metropolitan: first 2 chars = department. Overseas: first 3 chars. 75001 → 11 (Île-de-France).';
