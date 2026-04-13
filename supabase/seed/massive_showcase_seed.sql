begin;

-- Politicoresto massive showcase seed
--
-- Expected prerequisites:
-- 1. minimal_reference_data.sql
-- 2. minimal_ux_seed.sql
--
-- This file adds the large editorial layer used for preproduction UX:
-- - 196 showcase topics
-- - 1176 visible posts
-- - 4900 prediction submissions
-- - pending and resolved outcomes
--
-- It intentionally reuses existing spaces, territories, taxonomy terms,
-- and public profiles created by the minimal layer.

create temp table showcase_seed on commit drop as
with space_cycle as (
  select *
  from (values
    (1, 'barometre-local'),
    (2, 'coalitions-nationales'),
    (3, 'conseils-regionaux'),
    (4, 'contentieux-publics'),
    (5, 'departements-en-campagne'),
    (6, 'europe-et-defense'),
    (7, 'geopolitique-europe'),
    (8, 'gouvernement-institutions'),
    (9, 'grandes-metropoles-nord'),
    (10, 'grandes-metropoles-sud'),
    (11, 'ile-de-france-politique'),
    (12, 'justice-affaires'),
    (13, 'mairies-en-observation'),
    (14, 'municipales-grandes-villes'),
    (15, 'partis-congres'),
    (16, 'personnalites-et-ambitions'),
    (17, 'personnalites-strategies'),
    (18, 'presidentielle-2027'),
    (19, 'primaires-et-congres-plus'),
    (20, 'votes-et-textes')
  ) as t(ord, space_slug)
),
territory_cycle as (
  select *
  from (values
    (1, 'Europe', 'macro'),
    (2, 'France', 'country'),
    (3, 'Ile-de-France', 'region'),
    (4, 'Hauts-de-France', 'region'),
    (5, 'Paris', 'department'),
    (6, 'Bouches-du-Rhone', 'department'),
    (7, 'Rhone', 'department'),
    (8, 'Haute-Garonne', 'department'),
    (9, 'Nord', 'department'),
    (10, 'Paris', 'commune'),
    (11, 'Marseille', 'commune'),
    (12, 'Lyon', 'commune'),
    (13, 'Toulouse', 'commune'),
    (14, 'Lille', 'commune')
  ) as t(ord, territory_name, territory_level)
),
type_cycle as (
  select *
  from (values
    (1, 'binary'::public.prediction_type, 'exact_match'::public.prediction_scoring_method, 'binary_split'::public.prediction_aggregation_method, 'electoral'),
    (2, 'date_value'::public.prediction_type, 'date_distance'::public.prediction_scoring_method, 'median_distribution'::public.prediction_aggregation_method, 'institutional'),
    (3, 'categorical_closed'::public.prediction_type, 'exact_match'::public.prediction_scoring_method, 'option_distribution'::public.prediction_aggregation_method, 'judicial'),
    (4, 'bounded_percentage'::public.prediction_type, 'normalized_absolute_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, 'local-municipal'),
    (5, 'bounded_volume'::public.prediction_type, 'normalized_relative_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, 'geopolitical'),
    (6, 'bounded_integer'::public.prediction_type, 'normalized_absolute_error'::public.prediction_scoring_method, 'numeric_summary'::public.prediction_aggregation_method, 'media'),
    (7, 'ordinal_scale'::public.prediction_type, 'ordinal_distance'::public.prediction_scoring_method, 'ordinal_summary'::public.prediction_aggregation_method, 'partisan-internal')
  ) as t(ord, prediction_type, scoring_method, aggregation_method, taxonomy_slug)
)
select
  gs as idx,
  ('showcase-topic-' || lpad(gs::text, 3, '0'))::text as topic_slug,
  sc.space_slug,
  tc.territory_name,
  tc.territory_level,
  ty.prediction_type,
  ty.scoring_method,
  ty.aggregation_method,
  ty.taxonomy_slug,
  case
    when gs <= 77 then 'open'::public.topic_status
    when gs <= 137 then 'locked'::public.topic_status
    when gs <= 177 then 'resolved'::public.topic_status
    else 'archived'::public.topic_status
  end as final_status,
  case
    when ty.prediction_type = 'binary' then 'Une coalition locale basculera-t-elle avant la prochaine seance ?'
    when ty.prediction_type = 'date_value' then 'A quelle date interviendra la prochaine annonce de compromis ?'
    when ty.prediction_type = 'categorical_closed' then 'Quelle issue sera retenue a l issue de la sequence ?'
    when ty.prediction_type = 'bounded_percentage' then 'Quelle part de soutien sera observee sur la sequence ?'
    when ty.prediction_type = 'bounded_volume' then 'Quel volume de participation sera constate ?'
    when ty.prediction_type = 'bounded_integer' then 'Combien d articles ou de voix seront retenus ?'
    else 'Quel niveau de tension sera percu ?'
  end || ' #' || lpad(gs::text, 3, '0') as topic_title,
  'Sujet de demonstration volumineux pour pre-production, avec densite editoriale et territoriale.'::text as topic_description,
  (select user_id from public.app_profile order by created_at, user_id limit 1 offset ((gs - 1) % 25)) as created_by,
  (timestamp with time zone '2026-02-01 08:00:00+00' + make_interval(days := gs - 1)) as created_at,
  (timestamp with time zone '2026-02-02 08:00:00+00' + make_interval(days := gs - 1)) as open_at,
  case
    when gs <= 77 then (timestamp with time zone '2026-04-08 18:00:00+00' + make_interval(days := ((gs - 1) % 14)))
    when gs <= 137 then (timestamp with time zone '2026-03-29 18:00:00+00' - make_interval(days := ((gs - 78) % 10)))
    when gs <= 177 then (timestamp with time zone '2026-03-18 18:00:00+00' - make_interval(days := ((gs - 138) % 14)))
    else (timestamp with time zone '2026-03-01 18:00:00+00' - make_interval(days := ((gs - 178) % 21)))
  end as close_at
from generate_series(1, 196) gs
join space_cycle sc on sc.ord = 1 + ((gs - 1) % 20)
join territory_cycle tc on tc.ord = 1 + ((gs - 1) % 14)
join type_cycle ty on ty.ord = 1 + ((gs - 1) % 7);

insert into public.topic(
  id, space_id, slug, title, description, topic_status, visibility, created_by,
  created_at, updated_at, open_at, close_at, resolve_deadline_at, primary_territory_id,
  is_sensitive, locked_reason
)
select
  ('00000000-0000-0000-0000-' || lpad((700000 + ss.idx)::text, 12, '0'))::uuid,
  s.id,
  ss.topic_slug,
  ss.topic_title,
  ss.topic_description,
  'open'::public.topic_status,
  'public'::public.visibility_level,
  ss.created_by,
  ss.created_at,
  ss.created_at,
  ss.open_at,
  ss.close_at,
  ss.close_at + interval '3 days',
  tr.id,
  false,
  null
from showcase_seed ss
join public.space s on s.slug = ss.space_slug
join public.territory_reference tr
  on tr.name = ss.territory_name
 and tr.territory_level::text = ss.territory_level
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  visibility = excluded.visibility,
  updated_at = timezone('utc', now()),
  open_at = excluded.open_at,
  close_at = excluded.close_at,
  resolve_deadline_at = excluded.resolve_deadline_at,
  primary_territory_id = excluded.primary_territory_id;

insert into public.prediction_question(
  topic_id, prediction_type, title, unit_label, min_numeric_value, max_numeric_value,
  min_date_value, max_date_value, ordinal_min, ordinal_max, scoring_method,
  aggregation_method, allow_submission_update, created_at
)
select
  t.id,
  ss.prediction_type,
  ss.topic_title,
  case
    when ss.prediction_type = 'bounded_percentage' then 'pour cent'
    when ss.prediction_type = 'bounded_volume' then 'participations'
    when ss.prediction_type = 'bounded_integer' then 'voix'
    when ss.prediction_type = 'ordinal_scale' then 'niveau'
    else null
  end,
  case
    when ss.prediction_type = 'bounded_percentage' then 0
    when ss.prediction_type = 'bounded_volume' then 100
    when ss.prediction_type = 'bounded_integer' then 10
    else null
  end,
  case
    when ss.prediction_type = 'bounded_percentage' then 100
    when ss.prediction_type = 'bounded_volume' then 1000
    when ss.prediction_type = 'bounded_integer' then 120
    else null
  end,
  case when ss.prediction_type = 'date_value' then date '2026-03-01' else null end,
  case when ss.prediction_type = 'date_value' then date '2026-06-30' else null end,
  case when ss.prediction_type = 'ordinal_scale' then 1 else null end,
  case when ss.prediction_type = 'ordinal_scale' then 5 else null end,
  ss.scoring_method,
  ss.aggregation_method,
  true,
  ss.created_at
from showcase_seed ss
join public.topic t on t.slug = ss.topic_slug
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
  aggregation_method = excluded.aggregation_method;

insert into public.topic_taxonomy_link(topic_id, taxonomy_term_id, is_primary)
select t.id, tt.id, true
from showcase_seed ss
join public.topic t on t.slug = ss.topic_slug
join public.taxonomy_term tt on tt.slug = ss.taxonomy_slug
where not exists (
  select 1 from public.topic_taxonomy_link existing
  where existing.topic_id = t.id and existing.taxonomy_term_id = tt.id
);

insert into public.topic_territory_link(topic_id, territory_id, is_primary)
select t.id, tr.id, true
from showcase_seed ss
join public.topic t on t.slug = ss.topic_slug
join public.territory_reference tr
  on tr.name = ss.territory_name
 and tr.territory_level::text = ss.territory_level
where not exists (
  select 1 from public.topic_territory_link existing
  where existing.topic_id = t.id and existing.territory_id = tr.id
);

insert into public.prediction_option(id, topic_id, slug, label, sort_order, is_active, created_at)
select
  ('00000000-0000-0000-0000-' || lpad((710000 + ss.idx * 10 + opt.sort_order)::text, 12, '0'))::uuid,
  t.id,
  ('showcase-option-' || lpad(ss.idx::text, 3, '0') || '-' || opt.sort_order)::text,
  opt.label,
  opt.sort_order,
  true,
  ss.created_at
from showcase_seed ss
join public.topic t on t.slug = ss.topic_slug
cross join (values (1, 'Option A'), (2, 'Option B'), (3, 'Option C')) as opt(sort_order, label)
where ss.prediction_type = 'categorical_closed'
on conflict (id) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

with post_templates as (
  select *
  from (values
    (1, 'news'::public.post_type, 'Point de situation', 'Le sujet reste actif avec un calendrier public deja identifiable.'),
    (2, 'analysis'::public.post_type, 'Ce qu il faut surveiller', 'Le noeud principal reste un compromis, un vote ou une publication encore en attente.'),
    (3, 'discussion'::public.post_type, 'Lecture du moment', 'La discussion publique reste ouverte, avec des signaux encore partiellement contradictoires.'),
    (4, 'local'::public.post_type, 'Signal territorial', 'Le territoire principal continue de donner le tempo de la sequence.'),
    (5, 'analysis'::public.post_type, 'Pourquoi le sujet remonte', 'Le sujet combine densite de participation, calendrier et attente de clarification.'),
    (6, 'discussion'::public.post_type, 'En bref', 'Le sujet reste lisible pour un retour rapide sans perdre le contexte.')
  ) as x(seq, post_type, title, body)
)
insert into public.post(
  id, space_id, topic_id, author_user_id, post_type, post_status, title,
  body_markdown, body_plaintext, created_at, updated_at
)
select
  ('00000000-0000-0000-0000-' || lpad((720000 + ss.idx * 10 + pt.seq)::text, 12, '0'))::uuid,
  s.id,
  t.id,
  (select user_id from public.app_profile order by created_at, user_id limit 1 offset (((ss.idx - 1) * 6 + pt.seq - 1) % 25)),
  case when pt.seq = 6 and ss.final_status in ('resolved', 'archived') then 'resolution_justification'::public.post_type else pt.post_type end,
  'visible'::public.post_status,
  pt.title,
  ss.topic_title || E'\n\n' || pt.body,
  pt.body,
  ss.created_at + make_interval(days := pt.seq - 1),
  ss.created_at + make_interval(days := pt.seq - 1, hours := 1)
from showcase_seed ss
join public.topic t on t.slug = ss.topic_slug
join public.space s on s.slug = ss.space_slug
cross join post_templates pt
on conflict (id) do update
set
  post_type = excluded.post_type,
  post_status = excluded.post_status,
  title = excluded.title,
  body_markdown = excluded.body_markdown,
  body_plaintext = excluded.body_plaintext,
  updated_at = excluded.updated_at;

with submission_users as (
  select row_number() over (order by created_at, user_id) as rn, user_id
  from public.app_profile
  order by created_at, user_id
  limit 25
)
insert into public.prediction_submission(
  id, topic_id, user_id, submission_status, answer_boolean, answer_date, answer_numeric,
  answer_option_id, answer_ordinal, submitted_at, updated_at, source_context
)
select
  ('00000000-0000-0000-0000-' || lpad((800000 + ss.idx * 100 + su.rn)::text, 12, '0'))::uuid,
  t.id,
  su.user_id,
  'active'::public.submission_status,
  case when ss.prediction_type = 'binary' then (su.rn % 2 = 0) else null end,
  case when ss.prediction_type = 'date_value' then (date '2026-04-10' + ((ss.idx + su.rn) % 35))::date else null end,
  case
    when ss.prediction_type = 'bounded_percentage' then 20 + ((ss.idx * 3 + su.rn * 2) % 61)
    when ss.prediction_type = 'bounded_volume' then 160 + ((ss.idx * 13 + su.rn * 11) % 520)
    when ss.prediction_type = 'bounded_integer' then 18 + ((ss.idx + su.rn) % 73)
    else null
  end,
  case when ss.prediction_type = 'categorical_closed'
    then ('00000000-0000-0000-0000-' || lpad((710000 + ss.idx * 10 + (1 + (su.rn % 3)))::text, 12, '0'))::uuid
    else null
  end,
  case when ss.prediction_type = 'ordinal_scale' then 1 + ((ss.idx + su.rn) % 5) else null end,
  ss.open_at + make_interval(hours := su.rn * 4),
  ss.open_at + make_interval(hours := su.rn * 4 + 1),
  'massive_showcase_seed'
from showcase_seed ss
join public.topic t on t.slug = ss.topic_slug
cross join submission_users su
on conflict (id) do update
set
  submission_status = excluded.submission_status,
  answer_boolean = excluded.answer_boolean,
  answer_date = excluded.answer_date,
  answer_numeric = excluded.answer_numeric,
  answer_option_id = excluded.answer_option_id,
  answer_ordinal = excluded.answer_ordinal,
  updated_at = excluded.updated_at,
  source_context = excluded.source_context;

with submission_users as (
  select row_number() over (order by created_at, user_id) as rn, user_id
  from public.app_profile
  order by created_at, user_id
  limit 25
)
insert into public.prediction_submission_history(
  id, submission_id, topic_id, user_id, submission_status, answer_boolean, answer_date,
  answer_numeric, answer_option_id, answer_ordinal, recorded_at
)
select
  ('00000000-0000-0000-0000-' || lpad((900000 + ss.idx * 100 + su.rn)::text, 12, '0'))::uuid,
  ('00000000-0000-0000-0000-' || lpad((800000 + ss.idx * 100 + su.rn)::text, 12, '0'))::uuid,
  t.id,
  su.user_id,
  'active'::public.submission_status,
  case when ss.prediction_type = 'binary' then (su.rn % 2 = 0) else null end,
  case when ss.prediction_type = 'date_value' then (date '2026-04-10' + ((ss.idx + su.rn) % 35))::date else null end,
  case
    when ss.prediction_type = 'bounded_percentage' then 20 + ((ss.idx * 3 + su.rn * 2) % 61)
    when ss.prediction_type = 'bounded_volume' then 160 + ((ss.idx * 13 + su.rn * 11) % 520)
    when ss.prediction_type = 'bounded_integer' then 18 + ((ss.idx + su.rn) % 73)
    else null
  end,
  case when ss.prediction_type = 'categorical_closed'
    then ('00000000-0000-0000-0000-' || lpad((710000 + ss.idx * 10 + (1 + (su.rn % 3)))::text, 12, '0'))::uuid
    else null
  end,
  case when ss.prediction_type = 'ordinal_scale' then 1 + ((ss.idx + su.rn) % 5) else null end,
  ss.open_at + make_interval(hours := su.rn * 4 + 1)
from showcase_seed ss
join public.topic t on t.slug = ss.topic_slug
cross join submission_users su
on conflict (id) do update
set
  submission_status = excluded.submission_status,
  answer_boolean = excluded.answer_boolean,
  answer_date = excluded.answer_date,
  answer_numeric = excluded.answer_numeric,
  answer_option_id = excluded.answer_option_id,
  answer_ordinal = excluded.answer_ordinal,
  recorded_at = excluded.recorded_at;

insert into public.topic_resolution(
  topic_id, resolution_status, resolved_by, resolved_at, resolution_note,
  resolved_boolean, resolved_date, resolved_numeric, resolved_option_id,
  resolved_ordinal, void_reason
)
select
  t.id,
  case when ss.final_status in ('resolved', 'archived') then 'resolved'::public.resolution_status else 'pending'::public.resolution_status end,
  ss.created_by,
  case when ss.final_status in ('resolved', 'archived') then ss.close_at + interval '1 day' else null end,
  case when ss.final_status in ('resolved', 'archived') then 'Resolution fictive de preproduction consolidee.' else 'Resolution en attente de confirmation publique.' end,
  case when ss.prediction_type = 'binary' and ss.final_status in ('resolved', 'archived') then true else null end,
  case when ss.prediction_type = 'date_value' and ss.final_status in ('resolved', 'archived') then (date '2026-04-20' + (ss.idx % 20))::date else null end,
  case
    when ss.prediction_type = 'bounded_percentage' and ss.final_status in ('resolved', 'archived') then 42 + (ss.idx % 31)
    when ss.prediction_type = 'bounded_volume' and ss.final_status in ('resolved', 'archived') then 280 + ((ss.idx * 7) % 260)
    when ss.prediction_type = 'bounded_integer' and ss.final_status in ('resolved', 'archived') then 24 + (ss.idx % 46)
    else null
  end,
  case when ss.prediction_type = 'categorical_closed' and ss.final_status in ('resolved', 'archived')
    then ('00000000-0000-0000-0000-' || lpad((710000 + ss.idx * 10 + 2)::text, 12, '0'))::uuid
    else null
  end,
  case when ss.prediction_type = 'ordinal_scale' and ss.final_status in ('resolved', 'archived') then 2 + (ss.idx % 3) else null end,
  null
from showcase_seed ss
join public.topic t on t.slug = ss.topic_slug
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
  resolved_ordinal = excluded.resolved_ordinal;

insert into public.topic_resolution_source(
  id, topic_id, source_type, source_label, source_url, source_published_at,
  quoted_excerpt, created_by, created_at
)
select
  ('00000000-0000-0000-0000-' || lpad((950000 + ss.idx)::text, 12, '0'))::uuid,
  t.id,
  case when ss.final_status in ('resolved', 'archived') then 'official_result'::public.resolution_source_type else 'official_statement'::public.resolution_source_type end,
  case when ss.final_status in ('resolved', 'archived') then 'Publication officielle fictive' else 'Calendrier officiel fictif' end,
  'https://example.org/' || ss.topic_slug,
  case when ss.final_status in ('resolved', 'archived') then ss.close_at + interval '1 day' else null end,
  case when ss.final_status in ('resolved', 'archived') then 'Extrait fictif de publication utilise pour la preproduction.' else 'Extrait fictif indiquant qu une confirmation reste attendue.' end,
  ss.created_by,
  ss.close_at
from showcase_seed ss
join public.topic t on t.slug = ss.topic_slug
on conflict (id) do update
set
  source_type = excluded.source_type,
  source_label = excluded.source_label,
  source_url = excluded.source_url,
  source_published_at = excluded.source_published_at,
  quoted_excerpt = excluded.quoted_excerpt,
  created_by = excluded.created_by,
  created_at = excluded.created_at;

update public.topic t
set
  topic_status = ss.final_status,
  locked_reason = case when ss.final_status = 'locked' then 'Saisie suspendue en attente de consolidation publique.' else null end
from showcase_seed ss
where t.slug = ss.topic_slug;

select public.refresh_public_read_models();

commit;
