begin;

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
values
  (
    'region',
    'FR',
    '11',
    'Ile-de-France',
    'ile-de-france',
    (select id from public.territory_reference where country_code = 'FR' and territory_code = 'france'),
    '11',
    null,
    null
  )
on conflict (country_code, territory_code) do update
set name = excluded.name,
    normalized_name = excluded.normalized_name,
    parent_id = excluded.parent_id,
    region_code = excluded.region_code,
    department_code = excluded.department_code,
    commune_code = excluded.commune_code;

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
values
  (
    'department',
    'FR',
    '75',
    'Paris',
    'paris',
    (select id from public.territory_reference where country_code = 'FR' and territory_code = '11'),
    '11',
    '75',
    null
  )
on conflict (country_code, territory_code) do update
set name = excluded.name,
    normalized_name = excluded.normalized_name,
    parent_id = excluded.parent_id,
    region_code = excluded.region_code,
    department_code = excluded.department_code,
    commune_code = excluded.commune_code;

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
values
  (
    'commune',
    'FR',
    '75056',
    'Paris',
    'paris',
    (select id from public.territory_reference where country_code = 'FR' and territory_code = '75'),
    '11',
    '75',
    '75056'
  )
on conflict (country_code, territory_code) do update
set name = excluded.name,
    normalized_name = excluded.normalized_name,
    parent_id = excluded.parent_id,
    region_code = excluded.region_code,
    department_code = excluded.department_code,
    commune_code = excluded.commune_code;

select public.refresh_territory_closure();

commit;
