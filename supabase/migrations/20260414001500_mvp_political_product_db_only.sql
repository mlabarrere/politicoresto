begin;

alter table public.space
  add column if not exists is_user_facing boolean not null default true,
  add column if not exists deprecation_reason text;

alter table public.territory_reference
  add column if not exists is_user_facing boolean not null default true,
  add column if not exists deprecation_reason text;

alter table public.card_family
  add column if not exists is_user_facing boolean not null default true,
  add column if not exists deprecation_reason text;

alter table public.card_catalog
  add column if not exists is_user_facing boolean not null default true,
  add column if not exists deprecation_reason text;

alter table public.user_private_political_profile
  add column if not exists profile_payload jsonb not null default '{}'::jsonb;

alter table public.user_declared_vote_record
  add column if not exists location_label text,
  add column if not exists polling_station_label text,
  add column if not exists vote_context jsonb not null default '{}'::jsonb;

alter table public.poll_response
  add column if not exists first_submitted_at timestamptz;

update public.poll_response
set first_submitted_at = coalesce(first_submitted_at, submitted_at, timezone('utc', now()))
where first_submitted_at is null;

alter table public.poll_response
  alter column first_submitted_at set not null;

create table if not exists public.political_bloc_definition (
  entity_id uuid primary key references public.political_entity(id) on delete cascade,
  short_label text not null,
  sidebar_summary text not null,
  member_parties_label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.parliamentary_group_reference (
  code text primary key,
  name text not null,
  principal_party_name text,
  principal_party_slug citext,
  member_count integer not null default 0 check (member_count >= 0),
  bloc_entity_id uuid references public.political_entity(id) on delete set null,
  sidebar_summary text,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.parliamentary_group_party_map (
  group_code text not null references public.parliamentary_group_reference(code) on delete cascade,
  party_code text not null,
  party_name text,
  membership_role text not null default 'member',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint parliamentary_group_party_map_pkey primary key (group_code, party_code),
  constraint parliamentary_group_party_map_role_chk check (membership_role in ('primary', 'member'))
);

create table if not exists public.poll_response_settings (
  poll_id uuid primary key references public.poll(id) on delete cascade,
  edit_window_minutes integer not null default 30 check (edit_window_minutes between 0 and 10080),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_profile(user_id) on delete set null,
  event_name text not null,
  page_path text,
  entity_type text,
  entity_id uuid,
  session_id text,
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint analytics_events_event_name_chk check (char_length(btrim(event_name)) > 0)
);

create index if not exists political_bloc_definition_sort_idx on public.political_bloc_definition(sort_order);
create index if not exists parliamentary_group_reference_bloc_idx on public.parliamentary_group_reference(bloc_entity_id, sort_order);
create index if not exists parliamentary_group_party_map_group_idx on public.parliamentary_group_party_map(group_code, sort_order);
create index if not exists analytics_events_user_idx on public.analytics_events(user_id, occurred_at desc);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name, occurred_at desc);
create index if not exists analytics_events_entity_idx on public.analytics_events(entity_type, entity_id, occurred_at desc);

drop trigger if exists political_bloc_definition_touch_updated_at on public.political_bloc_definition;
create trigger political_bloc_definition_touch_updated_at
before update on public.political_bloc_definition
for each row execute function public.touch_updated_at();

drop trigger if exists parliamentary_group_reference_touch_updated_at on public.parliamentary_group_reference;
create trigger parliamentary_group_reference_touch_updated_at
before update on public.parliamentary_group_reference
for each row execute function public.touch_updated_at();

drop trigger if exists poll_response_settings_touch_updated_at on public.poll_response_settings;
create trigger poll_response_settings_touch_updated_at
before update on public.poll_response_settings
for each row execute function public.touch_updated_at();

alter table public.political_bloc_definition enable row level security;
alter table public.parliamentary_group_reference enable row level security;
alter table public.parliamentary_group_party_map enable row level security;
alter table public.poll_response_settings enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists political_bloc_definition_public_read on public.political_bloc_definition;
create policy political_bloc_definition_public_read
on public.political_bloc_definition
for select to anon, authenticated
using (is_active);

drop policy if exists political_bloc_definition_admin_write on public.political_bloc_definition;
create policy political_bloc_definition_admin_write
on public.political_bloc_definition
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists parliamentary_group_reference_public_read on public.parliamentary_group_reference;
create policy parliamentary_group_reference_public_read
on public.parliamentary_group_reference
for select to anon, authenticated
using (is_active);

drop policy if exists parliamentary_group_reference_admin_write on public.parliamentary_group_reference;
create policy parliamentary_group_reference_admin_write
on public.parliamentary_group_reference
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists parliamentary_group_party_map_public_read on public.parliamentary_group_party_map;
create policy parliamentary_group_party_map_public_read
on public.parliamentary_group_party_map
for select to anon, authenticated
using (true);

drop policy if exists parliamentary_group_party_map_admin_write on public.parliamentary_group_party_map;
create policy parliamentary_group_party_map_admin_write
on public.parliamentary_group_party_map
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists poll_response_settings_admin_write on public.poll_response_settings;
create policy poll_response_settings_admin_write
on public.poll_response_settings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists analytics_events_admin_select on public.analytics_events;
create policy analytics_events_admin_select
on public.analytics_events
for select to authenticated
using (public.is_admin());

with bloc_seed(slug, name, short_label, sidebar_summary, member_parties_label, sort_order) as (
  values
    ('gauche-radicale-gauche', 'Gauche radicale a gauche', 'Gauche radicale', 'LFI, PCF et allies. Bloc de rupture, conflictuel, tres mobilise.', 'LFI, PCF et assimiles', 1),
    ('gauche-centre-gauche', 'Gauche a centre gauche', 'Gauche sociale', 'PS, ecologistes, radicaux et sociaux-democrates.', 'PS, EELV, PRG, DVG et assimiles', 2),
    ('centre-gauche-centre-droit', 'Centre gauche a centre droit', 'Bloc central', 'Renaissance, MoDem, Horizons et allies de gouvernement ou de centre.', 'RE, MoDem, PRV, DVC, Horizons et assimiles', 3),
    ('centre-droit-droite', 'Centre droit a droite', 'Droite parlementaire', 'LR, UDI et diverses droites institutionnelles.', 'LR, UDI, DVD et assimiles', 4),
    ('droite-extreme-droite', 'Droite a extreme droite', 'Droite dure', 'RN, Reconquete, DLF, UDR et allies souverainistes ou identitaires.', 'RN, REC, DLF, UDR et assimiles', 5)
),
upsert_entities as (
  insert into public.political_entity(type, slug, name, metadata)
  select
    'bloc'::public.political_entity_type,
    slug,
    name,
    jsonb_build_object('taxonomy_kind', 'mvp_sidebar_bloc', 'member_parties_label', member_parties_label)
  from bloc_seed
  on conflict (slug) do update
  set name = excluded.name,
      metadata = public.political_entity.metadata || excluded.metadata,
      updated_at = timezone('utc', now())
  returning id, slug
)
insert into public.political_bloc_definition(entity_id, short_label, sidebar_summary, member_parties_label, sort_order)
select pe.id, bs.short_label, bs.sidebar_summary, bs.member_parties_label, bs.sort_order
from bloc_seed bs
join public.political_entity pe on pe.slug = bs.slug
on conflict (entity_id) do update
set short_label = excluded.short_label,
    sidebar_summary = excluded.sidebar_summary,
    member_parties_label = excluded.member_parties_label,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = timezone('utc', now());
with group_seed(code, name, principal_party_name, principal_party_slug, member_count, bloc_slug, sidebar_summary, sort_order, metadata) as (
  values
    ('RN', 'Rassemblement national', 'Rassemblement national', 'rn', 123, 'droite-extreme-droite', 'Groupe principal de la droite nationale a l''Assemblee.', 1, jsonb_build_object('other_party_codes', jsonb_build_array('LAF', 'IDL'))),
    ('EPR', 'Ensemble pour la Republique', 'Renaissance', 'renaissance', 94, 'centre-gauche-centre-droit', 'Coalition centrale pro-gouvernement.', 2, jsonb_build_object('other_party_codes', jsonb_build_array('GNC', 'D&P', 'Tapura', 'PRV', 'AC', 'Agir'))),
    ('LFI-NFP', 'La France insoumise - Nouveau Front populaire', 'La France insoumise', 'lfi', 71, 'gauche-radicale-gauche', 'Pole parlementaire insoumis et rupture.', 3, jsonb_build_object('other_party_codes', jsonb_build_array('Peyi-A', 'POI', 'RE974', 'REV', 'GES', 'PEPS', 'SSDAC'))),
    ('SOC', 'Socialistes et apparentes', 'Parti socialiste', 'ps', 69, 'gauche-centre-gauche', 'Gauche sociale-democrate et apparentes.', 4, jsonb_build_object('other_party_codes', jsonb_build_array('Peyi-A', 'PP', 'PPDG', 'DVG'))),
    ('DR', 'Droite republicaine', 'Les Republicains', 'lr', 49, 'centre-droit-droite', 'Bloc LR et apparentes de droite parlementaire.', 5, jsonb_build_object('other_party_codes', jsonb_build_array('SL', 'NE', 'OLF', 'NF', 'DVD'))),
    ('EcoS', 'Ecologiste et social', 'Les Ecologistes', 'ecologistes', 38, 'gauche-centre-gauche', 'Groupe ecologiste a dominante sociale.', 6, jsonb_build_object('other_party_codes', jsonb_build_array('G.s', 'L''AP', 'D!', 'GE', 'T44'))),
    ('Dem', 'Les Democrates', 'Mouvement democrate', 'modem', 36, 'centre-gauche-centre-droit', 'Centre democrate allie du bloc central.', 7, jsonb_build_object('other_party_codes', jsonb_build_array('RE', 'RSM', 'PRG'))),
    ('HOR', 'Horizons et independants', 'Horizons', 'horizons', 33, 'centre-gauche-centre-droit', 'Centre droit gouvernemental autour d''Horizons.', 8, jsonb_build_object('other_party_codes', jsonb_build_array('LFA', 'CCB', 'LC', 'DVD', 'AC'))),
    ('LIOT', 'Libertes, independants, outre-mer et territoires', 'Utiles', 'utiles', 23, 'centre-gauche-centre-droit', 'Groupe charniere heterogene et independant.', 9, jsonb_build_object('other_party_codes', jsonb_build_array('UDI', 'AD', 'AHIP', 'FaC', 'LC', 'PNC', 'DVG', 'DVD', 'R&PS', 'OLF'))),
    ('GDR', 'Gauche democrate et republicaine', 'Parti communiste francais', 'pcf', 17, 'gauche-radicale-gauche', 'Groupe communiste et gauche republicaine.', 10, jsonb_build_object('other_party_codes', jsonb_build_array('Peyi-A', 'FLNKS-UC', 'GRS', 'MDES', 'PLR', 'Progres', 'Tavini', 'DVG'))),
    ('UDR', 'UDR', 'UDR', 'udr', 16, 'droite-extreme-droite', 'Pole souverainiste de droite dure.', 11, jsonb_build_object('other_party_codes', jsonb_build_array())),
    ('NI', 'Non-inscrits', null, null, 11, null, 'Deputes hors groupes constitues, ensemble heterogene.', 12, jsonb_build_object('other_party_codes', jsonb_build_array('AC', 'DC', 'DVC', 'DVD', 'EC', 'EXD', 'NE'), 'mixed', true))
)
insert into public.parliamentary_group_reference(code, name, principal_party_name, principal_party_slug, member_count, bloc_entity_id, sidebar_summary, sort_order, metadata)
select
  gs.code,
  gs.name,
  gs.principal_party_name,
  gs.principal_party_slug,
  gs.member_count,
  pe.id,
  gs.sidebar_summary,
  gs.sort_order,
  gs.metadata
from group_seed gs
left join public.political_entity pe on pe.slug = gs.bloc_slug
on conflict (code) do update
set name = excluded.name,
    principal_party_name = excluded.principal_party_name,
    principal_party_slug = excluded.principal_party_slug,
    member_count = excluded.member_count,
    bloc_entity_id = excluded.bloc_entity_id,
    sidebar_summary = excluded.sidebar_summary,
    sort_order = excluded.sort_order,
    metadata = excluded.metadata,
    is_active = true,
    updated_at = timezone('utc', now());

with map_seed(group_code, party_code, party_name, membership_role, sort_order) as (
  values
    ('RN', 'RN', 'Rassemblement national', 'primary', 1),
    ('RN', 'LAF', 'L''Avenir francais', 'member', 2),
    ('RN', 'IDL', 'Identite-Libertes', 'member', 3),
    ('EPR', 'RE', 'Renaissance', 'primary', 1),
    ('EPR', 'GNC', 'GNC', 'member', 2),
    ('EPR', 'D&P', 'Democrates et progressistes', 'member', 3),
    ('EPR', 'Tapura', 'Tapura', 'member', 4),
    ('EPR', 'PRV', 'Parti radical', 'member', 5),
    ('EPR', 'AC', 'Alliance centriste', 'member', 6),
    ('EPR', 'Agir', 'Agir', 'member', 7),
    ('LFI-NFP', 'LFI', 'La France insoumise', 'primary', 1),
    ('LFI-NFP', 'Peyi-A', 'Peyi-A', 'member', 2),
    ('LFI-NFP', 'POI', 'Parti ouvrier independant', 'member', 3),
    ('LFI-NFP', 'RE974', 'RE974', 'member', 4),
    ('LFI-NFP', 'REV', 'Revolution ecologique pour le vivant', 'member', 5),
    ('LFI-NFP', 'GES', 'Gauche ecosocialiste', 'member', 6),
    ('LFI-NFP', 'PEPS', 'Pour une ecologie populaire et sociale', 'member', 7),
    ('LFI-NFP', 'SSDAC', 'SSDAC', 'member', 8),
    ('SOC', 'PS', 'Parti socialiste', 'primary', 1),
    ('SOC', 'Peyi-A', 'Peyi-A', 'member', 2),
    ('SOC', 'PP', 'Place publique', 'member', 3),
    ('SOC', 'PPDG', 'PPDG', 'member', 4),
    ('SOC', 'DVG', 'Divers gauche', 'member', 5),
    ('DR', 'LR', 'Les Republicains', 'primary', 1),
    ('DR', 'SL', 'Soyons libres', 'member', 2),
    ('DR', 'NE', 'Nouvelle Energie', 'member', 3),
    ('DR', 'OLF', 'Oser la France', 'member', 4),
    ('DR', 'NF', 'Nous France', 'member', 5),
    ('DR', 'DVD', 'Divers droite', 'member', 6),
    ('EcoS', 'EELV', 'Les Ecologistes', 'primary', 1),
    ('EcoS', 'G.s', 'Generation.s', 'member', 2),
    ('EcoS', 'L''AP', 'L''APRES', 'member', 3),
    ('EcoS', 'D!', 'Debout !', 'member', 4),
    ('EcoS', 'GE', 'Generation ecologie', 'member', 5),
    ('EcoS', 'T44', 'T44', 'member', 6),
    ('Dem', 'MoDem', 'Mouvement democrate', 'primary', 1),
    ('Dem', 'RE', 'Renaissance', 'member', 2),
    ('Dem', 'RSM', 'RSM', 'member', 3),
    ('Dem', 'PRG', 'Parti radical de gauche', 'member', 4),
    ('HOR', 'HOR', 'Horizons', 'primary', 1),
    ('HOR', 'LFA', 'La France audacieuse', 'member', 2),
    ('HOR', 'CCB', 'CCB', 'member', 3),
    ('HOR', 'LC', 'Les Centristes', 'member', 4),
    ('HOR', 'DVD', 'Divers droite', 'member', 5),
    ('HOR', 'AC', 'Alliance centriste', 'member', 6),
    ('LIOT', 'Utiles', 'Utiles', 'primary', 1),
    ('LIOT', 'UDI', 'Union des democrates et independants', 'member', 2),
    ('LIOT', 'AD', 'AD', 'member', 3),
    ('LIOT', 'AHIP', 'AHIP', 'member', 4),
    ('LIOT', 'FaC', 'FaC', 'member', 5),
    ('LIOT', 'LC', 'Les Centristes', 'member', 6),
    ('LIOT', 'PNC', 'PNC', 'member', 7),
    ('LIOT', 'DVG', 'Divers gauche', 'member', 8),
    ('LIOT', 'DVD', 'Divers droite', 'member', 9),
    ('LIOT', 'R&PS', 'R&PS', 'member', 10),
    ('LIOT', 'OLF', 'Oser la France', 'member', 11),
    ('GDR', 'PCF', 'Parti communiste francais', 'primary', 1),
    ('GDR', 'Peyi-A', 'Peyi-A', 'member', 2),
    ('GDR', 'FLNKS-UC', 'FLNKS-UC', 'member', 3),
    ('GDR', 'GRS', 'Gauche republicaine et socialiste', 'member', 4),
    ('GDR', 'MDES', 'MDES', 'member', 5),
    ('GDR', 'PLR', 'PLR', 'member', 6),
    ('GDR', 'Progres', 'Progres', 'member', 7),
    ('GDR', 'Tavini', 'Tavini', 'member', 8),
    ('GDR', 'DVG', 'Divers gauche', 'member', 9),
    ('UDR', 'UDR', 'UDR', 'primary', 1),
    ('NI', 'AC', 'Alliance centriste', 'member', 1),
    ('NI', 'DC', 'DC', 'member', 2),
    ('NI', 'DVC', 'Divers centre', 'member', 3),
    ('NI', 'DVD', 'Divers droite', 'member', 4),
    ('NI', 'EC', 'En commun', 'member', 5),
    ('NI', 'EXD', 'Extreme droite', 'member', 6),
    ('NI', 'NE', 'Nouvelle Energie', 'member', 7)
)
insert into public.parliamentary_group_party_map(group_code, party_code, party_name, membership_role, sort_order)
select group_code, party_code, party_name, membership_role, sort_order
from map_seed
on conflict (group_code, party_code) do update
set party_name = excluded.party_name,
    membership_role = excluded.membership_role,
    sort_order = excluded.sort_order;

update public.space s
set is_user_facing = (coalesce(s.space_role, 'legacy') in ('global', 'bloc')),
    deprecation_reason = case
      when coalesce(s.space_role, 'legacy') in ('global', 'bloc') then null
      else 'Deprecated from MVP navigation. Use bloc taxonomy and thread feeds instead.'
    end,
    updated_at = timezone('utc', now())
where s.is_user_facing is distinct from (coalesce(s.space_role, 'legacy') in ('global', 'bloc'))
   or s.deprecation_reason is distinct from case
     when coalesce(s.space_role, 'legacy') in ('global', 'bloc') then null
     else 'Deprecated from MVP navigation. Use bloc taxonomy and thread feeds instead.'
   end;

update public.territory_reference
set is_user_facing = false,
    deprecation_reason = 'Deprecated from MVP user-facing navigation.'
where is_user_facing is distinct from false
   or deprecation_reason is distinct from 'Deprecated from MVP user-facing navigation.';

update public.card_family
set is_user_facing = false,
    deprecation_reason = 'Deprecated from MVP user-facing navigation.'
where is_user_facing is distinct from false
   or deprecation_reason is distinct from 'Deprecated from MVP user-facing navigation.';

update public.card_catalog
set is_user_facing = false,
    deprecation_reason = 'Deprecated from MVP user-facing navigation.'
where is_user_facing is distinct from false
   or deprecation_reason is distinct from 'Deprecated from MVP user-facing navigation.';
create or replace view public.v_political_bloc_sidebar as
select
  pbd.entity_id as bloc_id,
  pe.slug as bloc_slug,
  pe.name as bloc_name,
  pbd.short_label,
  pbd.sidebar_summary,
  pbd.member_parties_label,
  pbd.sort_order,
  s.id as space_id,
  s.slug as space_slug,
  s.name as space_name,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'code', pgr.code,
        'name', pgr.name,
        'principal_party_name', pgr.principal_party_name,
        'principal_party_slug', pgr.principal_party_slug,
        'member_count', pgr.member_count,
        'sidebar_summary', pgr.sidebar_summary,
        'party_map', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'party_code', pgpm.party_code,
              'party_name', pgpm.party_name,
              'membership_role', pgpm.membership_role
            )
            order by pgpm.sort_order, pgpm.party_code
          )
          from public.parliamentary_group_party_map pgpm
          where pgpm.group_code = pgr.code
        ), '[]'::jsonb)
      )
      order by pgr.sort_order, pgr.code
    )
    from public.parliamentary_group_reference pgr
    where pgr.bloc_entity_id = pbd.entity_id
      and pgr.is_active
  ), '[]'::jsonb) as parliamentary_groups
from public.political_bloc_definition pbd
join public.political_entity pe on pe.id = pbd.entity_id
left join public.space s
  on s.id = (
    select s2.id
    from public.space s2
    where s2.primary_entity_id = pbd.entity_id
      and coalesce(s2.is_user_facing, true)
    order by s2.created_at asc, s2.id asc
    limit 1
  )
where pbd.is_active
order by pbd.sort_order, pe.name;

create or replace view public.v_parliamentary_groups as
select
  pgr.code,
  pgr.name,
  pgr.principal_party_name,
  pgr.principal_party_slug,
  pgr.member_count,
  pe.id as bloc_id,
  pe.slug as bloc_slug,
  pe.name as bloc_name,
  pgr.sidebar_summary,
  pgr.sort_order,
  pgr.metadata,
  coalesce(jsonb_agg(
    jsonb_build_object(
      'party_code', pgpm.party_code,
      'party_name', pgpm.party_name,
      'membership_role', pgpm.membership_role
    )
    order by pgpm.sort_order, pgpm.party_code
  ) filter (where pgpm.group_code is not null), '[]'::jsonb) as party_map
from public.parliamentary_group_reference pgr
left join public.political_entity pe on pe.id = pgr.bloc_entity_id
left join public.parliamentary_group_party_map pgpm on pgpm.group_code = pgr.code
where pgr.is_active
group by pgr.code, pgr.name, pgr.principal_party_name, pgr.principal_party_slug, pgr.member_count, pe.id, pe.slug, pe.name, pgr.sidebar_summary, pgr.sort_order, pgr.metadata;

create or replace function public.rpc_get_private_political_profile()
returns public.user_private_political_profile
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.user_private_political_profile%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_private_political_profile(user_id)
  values (public.current_user_id())
  on conflict (user_id) do nothing;

  select *
  into result_row
  from public.user_private_political_profile
  where user_id = public.current_user_id();

  return result_row;
end;
$$;

create or replace function public.rpc_upsert_private_political_profile(
  p_declared_partisan_term_id uuid default null,
  p_declared_ideology_term_id uuid default null,
  p_political_interest_level integer default null,
  p_notes_private text default null,
  p_profile_payload jsonb default '{}'::jsonb
)
returns public.user_private_political_profile
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.user_private_political_profile%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  if p_political_interest_level is not null and (p_political_interest_level < 1 or p_political_interest_level > 5) then
    raise exception 'Political interest level must be between 1 and 5';
  end if;

  insert into public.user_private_political_profile(
    user_id,
    declared_partisan_term_id,
    declared_ideology_term_id,
    political_interest_level,
    notes_private,
    profile_payload
  )
  values (
    public.current_user_id(),
    p_declared_partisan_term_id,
    p_declared_ideology_term_id,
    p_political_interest_level,
    p_notes_private,
    coalesce(p_profile_payload, '{}'::jsonb)
  )
  on conflict (user_id) do update
  set declared_partisan_term_id = excluded.declared_partisan_term_id,
      declared_ideology_term_id = excluded.declared_ideology_term_id,
      political_interest_level = excluded.political_interest_level,
      notes_private = excluded.notes_private,
      profile_payload = excluded.profile_payload
  returning * into result_row;

  perform public.log_audit_event('profile', public.current_user_id(), 'upsert_private_political_profile', jsonb_build_object('has_payload', jsonb_typeof(coalesce(p_profile_payload, '{}'::jsonb)) = 'object'));
  return result_row;
end;
$$;

create or replace function public.rpc_delete_private_political_profile()
returns public.user_private_political_profile
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_row public.user_private_political_profile%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.user_private_political_profile
  where user_id = public.current_user_id()
  returning * into deleted_row;

  perform public.log_audit_event('profile', public.current_user_id(), 'delete_private_political_profile', '{}'::jsonb);
  return deleted_row;
end;
$$;
create or replace function public.rpc_list_private_vote_history()
returns setof public.user_declared_vote_record
language sql
security definer
set search_path = public
as $$
  select uvr.*
  from public.user_declared_vote_record uvr
  where uvr.user_id = public.current_user_id()
  order by coalesce(uvr.declared_at, uvr.created_at) desc, uvr.created_at desc;
$$;

create or replace function public.rpc_upsert_private_vote_record(
  p_vote_record_id uuid default null,
  p_election_term_id uuid default null,
  p_territory_id uuid default null,
  p_vote_round integer default null,
  p_declared_option_label text default null,
  p_declared_party_term_id uuid default null,
  p_declared_candidate_name text default null,
  p_location_label text default null,
  p_polling_station_label text default null,
  p_vote_context jsonb default '{}'::jsonb
)
returns public.user_declared_vote_record
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.user_declared_vote_record%rowtype;
  current_row public.user_declared_vote_record%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  if nullif(btrim(coalesce(p_declared_option_label, '')), '') is null then
    raise exception 'Declared option label is required';
  end if;

  if p_vote_record_id is null then
    insert into public.user_declared_vote_record(
      user_id,
      election_term_id,
      territory_id,
      vote_round,
      declared_option_label,
      declared_party_term_id,
      declared_candidate_name,
      visibility,
      location_label,
      polling_station_label,
      vote_context
    )
    values (
      public.current_user_id(),
      p_election_term_id,
      p_territory_id,
      p_vote_round,
      btrim(p_declared_option_label),
      p_declared_party_term_id,
      nullif(btrim(coalesce(p_declared_candidate_name, '')), ''),
      'private',
      nullif(btrim(coalesce(p_location_label, '')), ''),
      nullif(btrim(coalesce(p_polling_station_label, '')), ''),
      coalesce(p_vote_context, '{}'::jsonb)
    )
    returning * into result_row;
  else
    select * into current_row
    from public.user_declared_vote_record
    where id = p_vote_record_id;

    if current_row.id is null then
      raise exception 'Vote record not found';
    end if;

    if current_row.user_id <> public.current_user_id() then
      raise exception 'Vote record not owned by current user';
    end if;

    update public.user_declared_vote_record
    set election_term_id = p_election_term_id,
        territory_id = p_territory_id,
        vote_round = p_vote_round,
        declared_option_label = btrim(p_declared_option_label),
        declared_party_term_id = p_declared_party_term_id,
        declared_candidate_name = nullif(btrim(coalesce(p_declared_candidate_name, '')), ''),
        visibility = 'private',
        location_label = nullif(btrim(coalesce(p_location_label, '')), ''),
        polling_station_label = nullif(btrim(coalesce(p_polling_station_label, '')), ''),
        vote_context = coalesce(p_vote_context, '{}'::jsonb)
    where id = p_vote_record_id
    returning * into result_row;
  end if;

  perform public.log_audit_event('profile', public.current_user_id(), 'upsert_private_vote_record', jsonb_build_object('vote_record_id', result_row.id));
  return result_row;
end;
$$;

create or replace function public.rpc_delete_private_vote_record(
  p_vote_record_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_id uuid;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.user_declared_vote_record
  where id = p_vote_record_id
    and user_id = public.current_user_id()
  returning id into deleted_id;

  if deleted_id is not null then
    perform public.log_audit_event('profile', public.current_user_id(), 'delete_private_vote_record', jsonb_build_object('vote_record_id', deleted_id));
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.rpc_list_sensitive_consents()
returns setof public.user_consent
language sql
security definer
set search_path = public
as $$
  select uc.*
  from public.user_consent uc
  where uc.user_id = public.current_user_id()
    and uc.consent_type in ('political_sensitive_data', 'analytics_participation', 'public_profile_visibility')
  order by uc.captured_at desc, uc.id desc;
$$;

create or replace function public.rpc_upsert_sensitive_consent(
  p_consent_type public.consent_type,
  p_consent_status public.consent_status,
  p_policy_version text,
  p_source text default 'vault'
)
returns public.user_consent
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_consent_type not in ('political_sensitive_data', 'analytics_participation', 'public_profile_visibility') then
    raise exception 'Consent type is not managed by this RPC';
  end if;

  return public.rpc_record_consent(p_consent_type, p_consent_status, p_policy_version, p_source);
end;
$$;

create or replace function public.rpc_delete_sensitive_consent(
  p_consent_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_id uuid;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.user_consent
  where id = p_consent_id
    and user_id = public.current_user_id()
    and consent_type in ('political_sensitive_data', 'analytics_participation', 'public_profile_visibility')
  returning id into deleted_id;

  if deleted_id is not null then
    perform public.log_audit_event('profile', public.current_user_id(), 'delete_sensitive_consent', jsonb_build_object('consent_id', deleted_id));
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.rpc_update_thread_post(
  p_thread_post_id uuid,
  p_title text default null,
  p_content text default null,
  p_metadata jsonb default null
)
returns public.thread_post
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.thread_post%rowtype;
  result_row public.thread_post%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_row
  from public.thread_post
  where id = p_thread_post_id;

  if current_row.id is null then
    raise exception 'Thread post not found';
  end if;

  if current_row.created_by <> public.current_user_id() then
    raise exception 'Thread post not owned by current user';
  end if;

  if current_row.status = 'archived' then
    return current_row;
  end if;

  update public.thread_post
  set title = coalesce(p_title, title),
      content = coalesce(p_content, content),
      metadata = case when p_metadata is null then metadata else p_metadata end
  where id = p_thread_post_id
  returning * into result_row;

  if result_row.type = 'poll' then
    update public.poll
    set title = coalesce(p_title, title),
        description = coalesce(p_content, description)
    where thread_post_id = result_row.id;
  elsif result_row.type = 'market' then
    update public.prediction_question
    set title = coalesce(p_title, title)
    where thread_post_id = result_row.id;
  end if;

  perform public.log_audit_event('post', result_row.id, 'update_thread_post', jsonb_build_object('thread_id', result_row.thread_id));
  return result_row;
end;
$$;
create or replace function public.rpc_delete_thread_post(
  p_thread_post_id uuid
)
returns public.thread_post
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.thread_post%rowtype;
  result_row public.thread_post%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_row
  from public.thread_post
  where id = p_thread_post_id;

  if current_row.id is null then
    raise exception 'Thread post not found';
  end if;

  if current_row.created_by <> public.current_user_id() then
    raise exception 'Thread post not owned by current user';
  end if;

  update public.thread_post
  set status = 'archived',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('archived_at', timezone('utc', now()))
  where id = p_thread_post_id
  returning * into result_row;

  if result_row.type = 'poll' then
    update public.poll
    set poll_status = 'archived'
    where thread_post_id = result_row.id
      and poll_status <> 'archived';
  end if;

  perform public.log_audit_event('post', result_row.id, 'delete_thread_post', jsonb_build_object('thread_id', result_row.thread_id));
  return result_row;
end;
$$;

create or replace function public.rpc_update_comment(
  p_comment_id uuid,
  p_body_markdown text
)
returns public.post
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.post%rowtype;
  result_row public.post%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  if nullif(btrim(coalesce(p_body_markdown, '')), '') is null then
    raise exception 'Comment body is required';
  end if;

  select * into current_row
  from public.post
  where id = p_comment_id;

  if current_row.id is null or current_row.thread_post_id is null then
    raise exception 'Comment not found';
  end if;

  if current_row.author_user_id <> public.current_user_id() then
    raise exception 'Comment not owned by current user';
  end if;

  update public.post
  set body_markdown = p_body_markdown,
      body_plaintext = p_body_markdown,
      edited_at = timezone('utc', now())
  where id = p_comment_id
  returning * into result_row;

  perform public.log_audit_event('post', result_row.id, 'update_comment', jsonb_build_object('thread_post_id', result_row.thread_post_id));
  return result_row;
end;
$$;

create or replace function public.rpc_delete_comment(
  p_comment_id uuid
)
returns public.post
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.post%rowtype;
  result_row public.post%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_row
  from public.post
  where id = p_comment_id;

  if current_row.id is null or current_row.thread_post_id is null then
    raise exception 'Comment not found';
  end if;

  if current_row.author_user_id <> public.current_user_id() then
    raise exception 'Comment not owned by current user';
  end if;

  update public.post
  set post_status = 'removed',
      title = null,
      body_markdown = '',
      body_plaintext = '',
      removed_at = timezone('utc', now()),
      edited_at = timezone('utc', now())
  where id = p_comment_id
  returning * into result_row;

  perform public.log_audit_event('post', result_row.id, 'delete_comment', jsonb_build_object('thread_post_id', result_row.thread_post_id));
  return result_row;
end;
$$;

create or replace function public.rpc_set_poll_response_edit_window(
  p_poll_id uuid,
  p_edit_window_minutes integer
)
returns public.poll_response_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.poll_response_settings%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_admin() then
    raise exception 'Admin privileges required';
  end if;

  if p_edit_window_minutes is null or p_edit_window_minutes < 0 or p_edit_window_minutes > 10080 then
    raise exception 'Edit window must be between 0 and 10080 minutes';
  end if;

  insert into public.poll_response_settings(poll_id, edit_window_minutes)
  values (p_poll_id, p_edit_window_minutes)
  on conflict (poll_id) do update
  set edit_window_minutes = excluded.edit_window_minutes
  returning * into result_row;

  perform public.log_audit_event('poll', p_poll_id, 'set_poll_response_edit_window', jsonb_build_object('edit_window_minutes', p_edit_window_minutes));
  return result_row;
end;
$$;
create or replace function public.vote_poll(
  p_poll_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  poll_row public.poll%rowtype;
  question_row public.poll_question%rowtype;
  existing_row public.poll_response%rowtype;
  settings_row public.poll_response_settings%rowtype;
  answer_data jsonb;
  response_count integer := 0;
  inserted_count integer := 0;
  had_existing_responses boolean := false;
  selected_option uuid;
  ordinal_answer integer;
  edit_deadline timestamptz;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select * into poll_row
  from public.poll
  where id = p_poll_id;

  if poll_row.id is null or not public.can_read_poll(poll_row) then
    raise exception 'Poll is not readable';
  end if;

  if poll_row.poll_status <> 'open' then
    raise exception 'Poll is not open';
  end if;

  select *
  into settings_row
  from public.poll_response_settings
  where poll_id = p_poll_id;

  if settings_row.poll_id is null then
    settings_row.edit_window_minutes := 30;
  end if;

  select exists(
    select 1
    from public.poll_response pr
    where pr.poll_id = p_poll_id
      and pr.user_id = public.current_user_id()
  )
  into had_existing_responses;

  for answer_data in
    select value
    from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    selected_option := (answer_data ->> 'selected_option_id')::uuid;
    ordinal_answer := (answer_data ->> 'ordinal_value')::integer;

    select *
    into question_row
    from public.poll_question
    where id = (answer_data ->> 'poll_question_id')::uuid
      and poll_id = p_poll_id;

    if question_row.id is null then
      raise exception 'Poll question not found';
    end if;

    if question_row.question_type in ('single_choice', 'multiple_choice') then
      if selected_option is null then
        raise exception 'Selected option is required';
      end if;

      if not exists (
        select 1
        from public.poll_option po
        where po.id = selected_option
          and po.poll_question_id = question_row.id
      ) then
        raise exception 'Selected option is invalid for this question';
      end if;
    end if;

    select *
    into existing_row
    from public.poll_response
    where poll_question_id = question_row.id
      and user_id = public.current_user_id();

    if existing_row.id is not null then
      edit_deadline := existing_row.first_submitted_at + make_interval(mins => settings_row.edit_window_minutes);
      if timezone('utc', now()) > edit_deadline then
        raise exception 'Poll response edit window has expired';
      end if;

      update public.poll_response
      set selected_option_id = selected_option,
          ordinal_value = ordinal_answer,
          weight = 1,
          submitted_at = timezone('utc', now())
      where id = existing_row.id;
    else
      insert into public.poll_response(
        poll_id,
        poll_question_id,
        user_id,
        selected_option_id,
        ordinal_value,
        weight,
        submitted_at,
        first_submitted_at
      )
      values (
        p_poll_id,
        question_row.id,
        public.current_user_id(),
        selected_option,
        ordinal_answer,
        1,
        timezone('utc', now()),
        timezone('utc', now())
      );
      inserted_count := inserted_count + 1;
    end if;

    response_count := response_count + 1;
  end loop;

  if response_count = 0 then
    raise exception 'At least one answer is required';
  end if;

  if not had_existing_responses and inserted_count > 0 then
    insert into public.reputation_ledger(user_id, event_type, delta, reference_entity_type, reference_entity_id)
    values (public.current_user_id(), 'post_participation', 1, 'poll', p_poll_id);
  end if;

  perform public.compute_scores(public.current_user_id());
  perform public.log_audit_event('poll', p_poll_id, 'vote_poll', jsonb_build_object('response_count', response_count, 'edit_window_minutes', settings_row.edit_window_minutes));

  return jsonb_build_object(
    'poll_id', p_poll_id,
    'response_count', response_count,
    'edit_window_minutes', settings_row.edit_window_minutes,
    'status', 'recorded'
  );
end;
$$;

create or replace function public.rpc_record_analytics_event(
  p_event_name text,
  p_page_path text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_session_id text default null,
  p_event_payload jsonb default '{}'::jsonb
)
returns public.analytics_events
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.analytics_events%rowtype;
begin
  if nullif(btrim(coalesce(p_event_name, '')), '') is null then
    raise exception 'Event name is required';
  end if;

  insert into public.analytics_events(
    user_id,
    event_name,
    page_path,
    entity_type,
    entity_id,
    session_id,
    event_payload
  )
  values (
    public.current_user_id(),
    left(btrim(p_event_name), 120),
    nullif(left(coalesce(p_page_path, ''), 300), ''),
    nullif(left(coalesce(p_entity_type, ''), 120), ''),
    p_entity_id,
    nullif(left(coalesce(p_session_id, ''), 200), ''),
    coalesce(p_event_payload, '{}'::jsonb)
  )
  returning * into result_row;

  return result_row;
end;
$$;

revoke select, insert, update, delete on public.user_private_political_profile from authenticated;
revoke select, insert, update, delete on public.user_declared_vote_record from authenticated;
revoke select, insert, update, delete on public.user_consent from authenticated;

grant select on public.political_bloc_definition, public.parliamentary_group_reference, public.parliamentary_group_party_map, public.v_political_bloc_sidebar, public.v_parliamentary_groups to anon, authenticated;

revoke all on function public.rpc_get_private_political_profile() from public, anon, authenticated;
revoke all on function public.rpc_upsert_private_political_profile(uuid, uuid, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.rpc_delete_private_political_profile() from public, anon, authenticated;
revoke all on function public.rpc_list_private_vote_history() from public, anon, authenticated;
revoke all on function public.rpc_upsert_private_vote_record(uuid, uuid, uuid, integer, text, uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.rpc_delete_private_vote_record(uuid) from public, anon, authenticated;
revoke all on function public.rpc_list_sensitive_consents() from public, anon, authenticated;
revoke all on function public.rpc_upsert_sensitive_consent(public.consent_type, public.consent_status, text, text) from public, anon, authenticated;
revoke all on function public.rpc_delete_sensitive_consent(uuid) from public, anon, authenticated;
revoke all on function public.rpc_update_thread_post(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.rpc_delete_thread_post(uuid) from public, anon, authenticated;
revoke all on function public.rpc_update_comment(uuid, text) from public, anon, authenticated;
revoke all on function public.rpc_delete_comment(uuid) from public, anon, authenticated;
revoke all on function public.rpc_set_poll_response_edit_window(uuid, integer) from public, anon, authenticated;
revoke all on function public.vote_poll(uuid, jsonb) from public, anon;
revoke all on function public.rpc_record_analytics_event(text, text, text, uuid, text, jsonb) from public, anon, authenticated;

grant execute on function public.rpc_get_private_political_profile() to authenticated;
grant execute on function public.rpc_upsert_private_political_profile(uuid, uuid, integer, text, jsonb) to authenticated;
grant execute on function public.rpc_delete_private_political_profile() to authenticated;
grant execute on function public.rpc_list_private_vote_history() to authenticated;
grant execute on function public.rpc_upsert_private_vote_record(uuid, uuid, uuid, integer, text, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.rpc_delete_private_vote_record(uuid) to authenticated;
grant execute on function public.rpc_list_sensitive_consents() to authenticated;
grant execute on function public.rpc_upsert_sensitive_consent(public.consent_type, public.consent_status, text, text) to authenticated;
grant execute on function public.rpc_delete_sensitive_consent(uuid) to authenticated;
grant execute on function public.rpc_update_thread_post(uuid, text, text, jsonb) to authenticated;
grant execute on function public.rpc_delete_thread_post(uuid) to authenticated;
grant execute on function public.rpc_update_comment(uuid, text) to authenticated;
grant execute on function public.rpc_delete_comment(uuid) to authenticated;
grant execute on function public.rpc_set_poll_response_edit_window(uuid, integer) to authenticated;
grant execute on function public.vote_poll(uuid, jsonb) to authenticated;
grant execute on function public.rpc_record_analytics_event(text, text, text, uuid, text, jsonb) to anon, authenticated;

commit;
