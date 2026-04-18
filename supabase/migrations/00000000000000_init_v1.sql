begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists private;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'space_type') then
    create type public.space_type as enum ('geographic', 'institutional', 'thematic', 'editorial');
  end if;
  if not exists (select 1 from pg_type where typname = 'space_status') then
    create type public.space_status as enum ('active', 'archived', 'hidden', 'removed');
  end if;
  if not exists (select 1 from pg_type where typname = 'topic_status') then
    create type public.topic_status as enum ('draft', 'open', 'locked', 'resolved', 'archived', 'removed');
  end if;
  if not exists (select 1 from pg_type where typname = 'visibility_level') then
    create type public.visibility_level as enum ('public', 'authenticated', 'private', 'moderators_only');
  end if;
  if not exists (select 1 from pg_type where typname = 'post_type') then
    create type public.post_type as enum ('news', 'analysis', 'discussion', 'local', 'moderation', 'resolution_justification');
  end if;
  if not exists (select 1 from pg_type where typname = 'post_status') then
    create type public.post_status as enum ('visible', 'hidden', 'locked', 'removed');
  end if;
  if not exists (select 1 from pg_type where typname = 'prediction_type') then
    create type public.prediction_type as enum ('binary', 'date_value', 'categorical_closed', 'bounded_percentage', 'bounded_volume', 'bounded_integer', 'ordinal_scale');
  end if;
  if not exists (select 1 from pg_type where typname = 'prediction_scoring_method') then
    create type public.prediction_scoring_method as enum ('exact_match', 'normalized_absolute_error', 'normalized_relative_error', 'ordinal_distance', 'date_distance');
  end if;
  if not exists (select 1 from pg_type where typname = 'prediction_aggregation_method') then
    create type public.prediction_aggregation_method as enum ('binary_split', 'median_distribution', 'option_distribution', 'numeric_summary', 'ordinal_summary');
  end if;
  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type public.submission_status as enum ('active', 'superseded', 'withdrawn', 'invalidated');
  end if;
  if not exists (select 1 from pg_type where typname = 'resolution_status') then
    create type public.resolution_status as enum ('pending', 'resolved', 'reopened', 'voided');
  end if;
  if not exists (select 1 from pg_type where typname = 'resolution_source_type') then
    create type public.resolution_source_type as enum ('official_result', 'official_statement', 'press_article', 'court_document', 'internal_moderation_note', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'poll_status') then
    create type public.poll_status as enum ('draft', 'open', 'closed', 'archived', 'removed');
  end if;
  if not exists (select 1 from pg_type where typname = 'poll_question_type') then
    create type public.poll_question_type as enum ('single_choice', 'multiple_choice', 'ordinal_scale');
  end if;
  if not exists (select 1 from pg_type where typname = 'moderation_report_status') then
    create type public.moderation_report_status as enum ('open', 'triaged', 'resolved', 'dismissed');
  end if;
  if not exists (select 1 from pg_type where typname = 'moderation_target_type') then
    create type public.moderation_target_type as enum ('post', 'topic', 'poll', 'profile', 'prediction_submission');
  end if;
  if not exists (select 1 from pg_type where typname = 'moderation_action_type') then
    create type public.moderation_action_type as enum ('hide_content', 'lock_topic', 'unlock_topic', 'remove_content', 'restore_content', 'suspend_submission', 'void_resolution', 'warning', 'note');
  end if;
  if not exists (select 1 from pg_type where typname = 'audit_entity_type') then
    create type public.audit_entity_type as enum ('profile', 'space', 'topic', 'post', 'poll', 'prediction_submission', 'topic_resolution', 'card_grant', 'moderation_action');
  end if;
  if not exists (select 1 from pg_type where typname = 'consent_type') then
    create type public.consent_type as enum ('terms_of_service', 'privacy_policy', 'political_sensitive_data', 'public_profile_visibility', 'analytics_participation');
  end if;
  if not exists (select 1 from pg_type where typname = 'consent_status') then
    create type public.consent_status as enum ('granted', 'revoked');
  end if;
  if not exists (select 1 from pg_type where typname = 'profile_status') then
    create type public.profile_status as enum ('active', 'limited', 'suspended', 'deleted');
  end if;
  if not exists (select 1 from pg_type where typname = 'territory_level') then
    create type public.territory_level as enum ('macro', 'country', 'region', 'department', 'commune');
  end if;
  if not exists (select 1 from pg_type where typname = 'card_rarity') then
    create type public.card_rarity as enum ('common', 'uncommon', 'rare', 'epic', 'legendary');
  end if;
  if not exists (select 1 from pg_type where typname = 'card_family_type') then
    create type public.card_family_type as enum ('personality', 'archetype', 'territory', 'performance', 'event', 'exploration', 'seniority', 'role');
  end if;
  if not exists (select 1 from pg_type where typname = 'card_grant_reason_type') then
    create type public.card_grant_reason_type as enum ('participation', 'exploration', 'prediction_performance', 'seniority', 'special_event', 'moderation_manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'reputation_event_type') then
    create type public.reputation_event_type as enum ('topic_participation', 'post_participation', 'prediction_accuracy', 'moderation_penalty', 'card_bonus', 'manual_adjustment');
  end if;
  if not exists (select 1 from pg_type where typname = 'anti_abuse_signal_type') then
    create type public.anti_abuse_signal_type as enum ('burst_activity', 'territorial_farming', 'topic_spam', 'new_account_concentration', 'coordinated_pattern', 'reward_abuse');
  end if;
end
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', 'authenticated');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'moderator');
$$;

create or replace function public.visibility_rank(v public.visibility_level)
returns integer
language sql
immutable
as $$
  select case v
    when 'public' then 1
    when 'authenticated' then 2
    when 'private' then 3
    when 'moderators_only' then 4
  end;
$$;

create table if not exists public.taxonomy_axis (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.taxonomy_term (
  id uuid primary key default gen_random_uuid(),
  axis_id uuid not null references public.taxonomy_axis(id),
  parent_term_id uuid references public.taxonomy_term(id),
  slug citext not null,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint taxonomy_term_axis_slug_key unique (axis_id, slug)
);

create table if not exists public.territory_reference (
  id uuid primary key default gen_random_uuid(),
  territory_level public.territory_level not null,
  country_code text not null,
  territory_code text not null,
  name text not null,
  normalized_name text not null,
  parent_id uuid references public.territory_reference(id),
  region_code text,
  department_code text,
  commune_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint territory_reference_country_code_territory_code_key unique (country_code, territory_code),
  constraint territory_reference_level_codes_chk check (
    (territory_level = 'macro' and region_code is null and department_code is null and commune_code is null) or
    (territory_level = 'country' and region_code is null and department_code is null and commune_code is null) or
    (territory_level = 'region' and region_code is not null and department_code is null and commune_code is null) or
    (territory_level = 'department' and region_code is not null and department_code is not null and commune_code is null) or
    (territory_level = 'commune' and region_code is not null and department_code is not null and commune_code is not null)
  )
);

create table if not exists public.territory_closure (
  ancestor_id uuid not null references public.territory_reference(id),
  descendant_id uuid not null references public.territory_reference(id),
  depth integer not null check (depth >= 0),
  primary key (ancestor_id, descendant_id)
);

create table if not exists public.app_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username citext unique,
  display_name text not null,
  bio text,
  avatar_url text,
  public_territory_id uuid references public.territory_reference(id),
  profile_status public.profile_status not null default 'active',
  is_public_profile_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz
);

create table if not exists public.user_visibility_settings (
  user_id uuid primary key references public.app_profile(user_id) on delete cascade,
  display_name_visibility public.visibility_level not null default 'public',
  bio_visibility public.visibility_level not null default 'public',
  territory_visibility public.visibility_level not null default 'authenticated',
  political_affinity_visibility public.visibility_level not null default 'private',
  vote_history_visibility public.visibility_level not null default 'private',
  card_inventory_visibility public.visibility_level not null default 'public',
  prediction_history_visibility public.visibility_level not null default 'authenticated',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.user_visibility_settings add column if not exists territory_visibility public.visibility_level not null default 'authenticated';

create table if not exists public.user_consent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  consent_type public.consent_type not null,
  consent_status public.consent_status not null,
  policy_version text not null,
  captured_at timestamptz not null default timezone('utc', now()),
  source text not null
);

create table if not exists public.user_private_political_profile (
  user_id uuid primary key references public.app_profile(user_id) on delete cascade,
  declared_partisan_term_id uuid references public.taxonomy_term(id),
  declared_ideology_term_id uuid references public.taxonomy_term(id),
  political_interest_level integer check (political_interest_level between 1 and 5),
  notes_private text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_declared_vote_record (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  election_term_id uuid references public.taxonomy_term(id),
  territory_id uuid references public.territory_reference(id),
  vote_round integer check (vote_round is null or vote_round > 0),
  declared_option_label text not null,
  declared_party_term_id uuid references public.taxonomy_term(id),
  declared_candidate_name text,
  visibility public.visibility_level not null default 'private',
  declared_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.space (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  name text not null,
  description text,
  space_type public.space_type not null,
  space_status public.space_status not null default 'active',
  visibility public.visibility_level not null default 'public',
  created_by uuid references public.app_profile(user_id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.space_scope (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.space(id) on delete cascade,
  taxonomy_term_id uuid references public.taxonomy_term(id),
  territory_id uuid references public.territory_reference(id),
  is_primary boolean not null default false,
  constraint space_scope_target_chk check (taxonomy_term_id is not null or territory_id is not null),
  constraint space_scope_space_taxonomy_territory_key unique (space_id, taxonomy_term_id, territory_id)
);

create table if not exists public.topic (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.space(id),
  slug citext not null unique,
  title text not null,
  description text,
  topic_status public.topic_status not null default 'draft',
  visibility public.visibility_level not null default 'public',
  created_by uuid not null references public.app_profile(user_id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  open_at timestamptz not null default timezone('utc', now()),
  close_at timestamptz not null,
  resolve_deadline_at timestamptz,
  primary_territory_id uuid references public.territory_reference(id),
  is_sensitive boolean not null default false,
  locked_reason text,
  constraint topic_window_chk check (open_at < close_at),
  constraint topic_resolve_window_chk check (resolve_deadline_at is null or close_at <= resolve_deadline_at)
);

create table if not exists public.topic_taxonomy_link (
  topic_id uuid not null references public.topic(id) on delete cascade,
  taxonomy_term_id uuid not null references public.taxonomy_term(id),
  is_primary boolean not null default false,
  primary key (topic_id, taxonomy_term_id)
);

create table if not exists public.topic_territory_link (
  topic_id uuid not null references public.topic(id) on delete cascade,
  territory_id uuid not null references public.territory_reference(id),
  is_primary boolean not null default false,
  primary key (topic_id, territory_id)
);

create table if not exists public.post (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.space(id),
  topic_id uuid references public.topic(id),
  author_user_id uuid not null references public.app_profile(user_id),
  post_type public.post_type not null,
  post_status public.post_status not null default 'visible',
  title text,
  body_markdown text not null,
  body_plaintext text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz,
  removed_at timestamptz,
  constraint post_parent_chk check (topic_id is not null or space_id is not null),
  constraint resolution_post_topic_chk check (post_type <> 'resolution_justification' or topic_id is not null)
);

create table if not exists public.post_revision (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.post(id) on delete cascade,
  editor_user_id uuid not null references public.app_profile(user_id),
  body_markdown text not null,
  edited_at timestamptz not null default timezone('utc', now()),
  edit_reason text
);

create table if not exists public.prediction_question (
  topic_id uuid primary key references public.topic(id) on delete cascade,
  prediction_type public.prediction_type not null,
  title text not null,
  unit_label text,
  min_numeric_value numeric,
  max_numeric_value numeric,
  min_date_value date,
  max_date_value date,
  ordinal_min integer,
  ordinal_max integer,
  scoring_method public.prediction_scoring_method not null,
  aggregation_method public.prediction_aggregation_method not null,
  allow_submission_update boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint prediction_question_numeric_bounds_chk check (
    (min_numeric_value is null and max_numeric_value is null) or
    (min_numeric_value is not null and max_numeric_value is not null and min_numeric_value <= max_numeric_value)
  ),
  constraint prediction_question_date_bounds_chk check (
    (min_date_value is null and max_date_value is null) or
    (min_date_value is not null and max_date_value is not null and min_date_value <= max_date_value)
  ),
  constraint prediction_question_ordinal_bounds_chk check (
    (ordinal_min is null and ordinal_max is null) or
    (ordinal_min is not null and ordinal_max is not null and ordinal_min <= ordinal_max)
  )
);

create table if not exists public.prediction_option (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.prediction_question(topic_id) on delete cascade,
  slug citext not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint prediction_option_topic_slug_key unique (topic_id, slug)
);

create table if not exists public.prediction_submission (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topic(id) on delete cascade,
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  submission_status public.submission_status not null default 'active',
  answer_boolean boolean,
  answer_date date,
  answer_numeric numeric,
  answer_option_id uuid references public.prediction_option(id),
  answer_ordinal integer,
  submitted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  source_context text
);

create unique index if not exists prediction_submission_one_active_per_user_topic_idx
on public.prediction_submission (topic_id, user_id)
where submission_status = 'active';

create table if not exists public.prediction_submission_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.prediction_submission(id) on delete cascade,
  topic_id uuid not null references public.topic(id) on delete cascade,
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  submission_status public.submission_status not null,
  answer_boolean boolean,
  answer_date date,
  answer_numeric numeric,
  answer_option_id uuid references public.prediction_option(id),
  answer_ordinal integer,
  recorded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.topic_resolution (
  topic_id uuid primary key references public.topic(id) on delete cascade,
  resolution_status public.resolution_status not null default 'pending',
  resolved_by uuid references public.app_profile(user_id),
  resolved_at timestamptz,
  resolution_note text,
  resolved_boolean boolean,
  resolved_date date,
  resolved_numeric numeric,
  resolved_option_id uuid references public.prediction_option(id),
  resolved_ordinal integer,
  void_reason text
);

create table if not exists public.topic_resolution_source (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topic(id) on delete cascade,
  source_type public.resolution_source_type not null,
  source_label text not null,
  source_url text,
  source_published_at timestamptz,
  quoted_excerpt text,
  created_by uuid references public.app_profile(user_id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prediction_score_event (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topic(id) on delete cascade,
  submission_id uuid not null references public.prediction_submission(id) on delete cascade,
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  raw_score numeric not null,
  normalized_score numeric not null check (normalized_score >= 0 and normalized_score <= 1),
  score_method public.prediction_scoring_method not null,
  scored_at timestamptz not null default timezone('utc', now()),
  constraint prediction_score_event_submission_unique unique (submission_id)
);

create table if not exists public.poll (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.space(id),
  topic_id uuid references public.topic(id),
  created_by uuid not null references public.app_profile(user_id),
  title text not null,
  description text,
  poll_status public.poll_status not null default 'draft',
  visibility public.visibility_level not null default 'public',
  open_at timestamptz not null default timezone('utc', now()),
  close_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint poll_parent_chk check (space_id is not null or topic_id is not null),
  constraint poll_window_chk check (open_at < close_at)
);

create table if not exists public.poll_question (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.poll(id) on delete cascade,
  prompt text not null,
  question_type public.poll_question_type not null,
  sort_order integer not null default 0,
  ordinal_min integer,
  ordinal_max integer,
  constraint poll_question_ordinal_chk check (
    question_type <> 'ordinal_scale' or
    (ordinal_min is not null and ordinal_max is not null and ordinal_min <= ordinal_max)
  )
);

create table if not exists public.poll_option (
  id uuid primary key default gen_random_uuid(),
  poll_question_id uuid not null references public.poll_question(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.poll_response (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.poll(id) on delete cascade,
  poll_question_id uuid not null references public.poll_question(id) on delete cascade,
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  selected_option_id uuid references public.poll_option(id),
  ordinal_value integer,
  submitted_at timestamptz not null default timezone('utc', now()),
  constraint poll_response_one_per_question unique (poll_question_id, user_id)
);

create table if not exists public.moderation_report (
  id uuid primary key default gen_random_uuid(),
  reported_by uuid not null references public.app_profile(user_id),
  target_type public.moderation_target_type not null,
  target_id uuid not null,
  reason_code text not null,
  reason_detail text,
  report_status public.moderation_report_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table if not exists public.moderation_action (
  id uuid primary key default gen_random_uuid(),
  target_type public.moderation_target_type not null,
  target_id uuid not null,
  action_type public.moderation_action_type not null,
  actor_user_id uuid not null references public.app_profile(user_id),
  reason_note text not null,
  created_at timestamptz not null default timezone('utc', now()),
  reverted_at timestamptz
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type public.audit_entity_type not null,
  entity_id uuid not null,
  actor_user_id uuid references public.app_profile(user_id),
  action_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.anti_abuse_signal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_profile(user_id),
  signal_type public.anti_abuse_signal_type not null,
  scope_topic_id uuid references public.topic(id),
  scope_territory_id uuid references public.territory_reference(id),
  signal_score numeric not null,
  signal_payload jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reputation_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  event_type public.reputation_event_type not null,
  delta integer not null,
  reference_entity_type public.audit_entity_type,
  reference_entity_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.card_family (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  label text not null,
  family_type public.card_family_type not null,
  description text
);

create table if not exists public.card_catalog (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.card_family(id),
  slug citext not null unique,
  label text not null,
  description text,
  rarity public.card_rarity not null,
  is_stackable boolean not null default false,
  is_active boolean not null default true
);

create table if not exists public.card_rule (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.card_catalog(id) on delete cascade,
  trigger_event text not null,
  rule_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_card_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  card_id uuid not null references public.card_catalog(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  first_granted_at timestamptz not null default timezone('utc', now()),
  last_granted_at timestamptz not null default timezone('utc', now()),
  constraint user_card_inventory_user_card_key unique (user_id, card_id)
);

create table if not exists public.card_grant_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  card_id uuid not null references public.card_catalog(id) on delete cascade,
  grant_reason_type public.card_grant_reason_type not null,
  source_entity_type public.audit_entity_type,
  source_entity_id uuid,
  granted_by_user_id uuid references public.app_profile(user_id),
  granted_at timestamptz not null default timezone('utc', now()),
  grant_payload jsonb not null default '{}'::jsonb
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.log_audit_event(
  p_entity_type public.audit_entity_type,
  p_entity_id uuid,
  p_action_name text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log(entity_type, entity_id, actor_user_id, action_name, payload)
  values (p_entity_type, p_entity_id, public.current_user_id(), p_action_name, coalesce(p_payload, '{}'::jsonb));
end;
$$;

create or replace function public.effective_space_visibility(space_row public.space)
returns public.visibility_level
language sql
stable
as $$
  select case
    when space_row.space_status in ('hidden', 'removed') then 'moderators_only'::public.visibility_level
    else space_row.visibility
  end;
$$;

create or replace function public.effective_topic_visibility(topic_row public.topic)
returns public.visibility_level
language sql
stable
as $$
  select case
    when topic_row.topic_status = 'removed' then 'moderators_only'::public.visibility_level
    when topic_row.space_id is null then topic_row.visibility
    else case
      when public.visibility_rank(topic_row.visibility) >= public.visibility_rank(public.effective_space_visibility(s)) then topic_row.visibility
      else public.effective_space_visibility(s)
    end
  end
  from public.space s
  where s.id = topic_row.space_id
  union all
  select case when topic_row.topic_status = 'removed' then 'moderators_only'::public.visibility_level else topic_row.visibility end
  where topic_row.space_id is null;
$$;

create or replace function public.can_read_space(space_row public.space)
returns boolean
language sql
stable
as $$
  select case
    when public.is_moderator() then true
    when space_row.space_status = 'removed' then false
    when public.effective_space_visibility(space_row) = 'public' then true
    when public.effective_space_visibility(space_row) = 'authenticated' then auth.uid() is not null
    else false
  end;
$$;

create or replace function public.can_read_topic(topic_row public.topic)
returns boolean
language sql
stable
as $$
  select case
    when public.is_moderator() then true
    when topic_row.topic_status = 'removed' then false
    when topic_row.topic_status = 'draft' then topic_row.created_by = auth.uid()
    when public.effective_topic_visibility(topic_row) = 'public' then true
    when public.effective_topic_visibility(topic_row) = 'authenticated' then auth.uid() is not null
    else false
  end;
$$;

create or replace function public.can_read_post(post_row public.post)
returns boolean
language sql
stable
as $$
  select case
    when public.is_moderator() then true
    when post_row.post_status in ('hidden', 'removed') then false
    when post_row.topic_id is not null then exists (
      select 1
      from public.topic t
      where t.id = post_row.topic_id
        and public.can_read_topic(t)
    )
    else exists (
      select 1
      from public.space s
      where s.id = post_row.space_id
        and public.can_read_space(s)
    )
  end;
$$;

create or replace function public.effective_poll_visibility(poll_row public.poll)
returns public.visibility_level
language sql
stable
as $$
  select case
    when poll_row.poll_status = 'removed' then 'moderators_only'::public.visibility_level
    when poll_row.topic_id is not null then (
      select case
        when public.visibility_rank(poll_row.visibility) >= public.visibility_rank(public.effective_topic_visibility(t)) then poll_row.visibility
        else public.effective_topic_visibility(t)
      end
      from public.topic t
      where t.id = poll_row.topic_id
    )
    when poll_row.space_id is not null then (
      select case
        when public.visibility_rank(poll_row.visibility) >= public.visibility_rank(public.effective_space_visibility(s)) then poll_row.visibility
        else public.effective_space_visibility(s)
      end
      from public.space s
      where s.id = poll_row.space_id
    )
    else poll_row.visibility
  end;
$$;

create or replace function public.can_read_poll(poll_row public.poll)
returns boolean
language sql
stable
as $$
  select case
    when public.is_moderator() then true
    when poll_row.poll_status = 'removed' then false
    when poll_row.poll_status = 'draft' then poll_row.created_by = auth.uid()
    when public.effective_poll_visibility(poll_row) = 'public' then true
    when public.effective_poll_visibility(poll_row) = 'authenticated' then auth.uid() is not null
    else false
  end;
$$;

create or replace function public.validate_topic_visibility()
returns trigger
language plpgsql
as $$
declare
  parent_visibility public.visibility_level;
begin
  if new.space_id is not null then
    select public.effective_space_visibility(s) into parent_visibility
    from public.space s
    where s.id = new.space_id;

    if parent_visibility is null then
      raise exception 'Parent space does not exist';
    end if;

    if public.visibility_rank(new.visibility) < public.visibility_rank(parent_visibility) then
      raise exception 'Topic visibility cannot be more open than its space';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_poll_visibility()
returns trigger
language plpgsql
as $$
declare
  parent_visibility public.visibility_level;
begin
  if new.topic_id is not null then
    select public.effective_topic_visibility(t) into parent_visibility
    from public.topic t
    where t.id = new.topic_id;
  elsif new.space_id is not null then
    select public.effective_space_visibility(s) into parent_visibility
    from public.space s
    where s.id = new.space_id;
  end if;

  if parent_visibility is not null and public.visibility_rank(new.visibility) < public.visibility_rank(parent_visibility) then
    raise exception 'Poll visibility cannot be more open than its parent';
  end if;

  return new;
end;
$$;

create or replace function public.validate_prediction_submission()
returns trigger
language plpgsql
as $$
declare
  question_row public.prediction_question%rowtype;
  topic_row public.topic%rowtype;
  answer_count integer := 0;
begin
  select * into question_row from public.prediction_question where topic_id = new.topic_id;
  if question_row.topic_id is null then
    raise exception 'Prediction question missing';
  end if;

  select * into topic_row from public.topic where id = new.topic_id;
  if topic_row.topic_status <> 'open' then
    raise exception 'Predictions are only allowed on open topics';
  end if;

  answer_count := answer_count
    + case when new.answer_boolean is not null then 1 else 0 end
    + case when new.answer_date is not null then 1 else 0 end
    + case when new.answer_numeric is not null then 1 else 0 end
    + case when new.answer_option_id is not null then 1 else 0 end
    + case when new.answer_ordinal is not null then 1 else 0 end;

  if answer_count <> 1 then
    raise exception 'Exactly one answer column must be populated';
  end if;

  case question_row.prediction_type
    when 'binary' then
      if new.answer_boolean is null then raise exception 'Boolean answer required'; end if;
    when 'date_value' then
      if new.answer_date is null then raise exception 'Date answer required'; end if;
      if question_row.min_date_value is not null and new.answer_date < question_row.min_date_value then raise exception 'Date below minimum'; end if;
      if question_row.max_date_value is not null and new.answer_date > question_row.max_date_value then raise exception 'Date above maximum'; end if;
    when 'categorical_closed' then
      if new.answer_option_id is null then raise exception 'Option answer required'; end if;
      if not exists (
        select 1
        from public.prediction_option po
        where po.id = new.answer_option_id
          and po.topic_id = new.topic_id
          and po.is_active
      ) then
        raise exception 'Prediction option is invalid';
      end if;
    when 'bounded_percentage' then
      if new.answer_numeric is null or new.answer_numeric < 0 or new.answer_numeric > 100 then
        raise exception 'Percentage must be between 0 and 100';
      end if;
    when 'bounded_volume', 'bounded_integer' then
      if new.answer_numeric is null then raise exception 'Numeric answer required'; end if;
      if question_row.min_numeric_value is not null and new.answer_numeric < question_row.min_numeric_value then raise exception 'Numeric answer below minimum'; end if;
      if question_row.max_numeric_value is not null and new.answer_numeric > question_row.max_numeric_value then raise exception 'Numeric answer above maximum'; end if;
    when 'ordinal_scale' then
      if new.answer_ordinal is null then raise exception 'Ordinal answer required'; end if;
      if question_row.ordinal_min is not null and new.answer_ordinal < question_row.ordinal_min then raise exception 'Ordinal below minimum'; end if;
      if question_row.ordinal_max is not null and new.answer_ordinal > question_row.ordinal_max then raise exception 'Ordinal above maximum'; end if;
  end case;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.snapshot_prediction_submission()
returns trigger
language plpgsql
as $$
begin
  insert into public.prediction_submission_history(
    submission_id, topic_id, user_id, submission_status,
    answer_boolean, answer_date, answer_numeric, answer_option_id, answer_ordinal
  )
  values (
    new.id, new.topic_id, new.user_id, new.submission_status,
    new.answer_boolean, new.answer_date, new.answer_numeric, new.answer_option_id, new.answer_ordinal
  );
  return new;
end;
$$;

create or replace function public.capture_post_revision()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.body_markdown is distinct from new.body_markdown then
    insert into public.post_revision(post_id, editor_user_id, body_markdown, edit_reason)
    values (new.id, coalesce(public.current_user_id(), new.author_user_id), old.body_markdown, 'body_update');
    new.edited_at := timezone('utc', now());
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_name text;
begin
  provider_name := coalesce(new.raw_app_meta_data ->> 'provider', 'oauth');

  insert into public.app_profile(user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'citizen')
  )
  on conflict (user_id) do nothing;

  insert into public.user_visibility_settings(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_private_political_profile(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_consent(user_id, consent_type, consent_status, policy_version, source)
  values
    (new.id, 'terms_of_service', 'granted', 'v1', provider_name),
    (new.id, 'privacy_policy', 'granted', 'v1', provider_name)
  on conflict do nothing;

  return new;
end;
$$;

create or replace function public.compute_prediction_normalized_score(
  p_topic_id uuid,
  p_submission_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  question_row public.prediction_question%rowtype;
  submission_row public.prediction_submission%rowtype;
  resolution_row public.topic_resolution%rowtype;
  max_span numeric;
  date_span integer;
  distance numeric;
begin
  select * into question_row from public.prediction_question where topic_id = p_topic_id;
  select * into submission_row from public.prediction_submission where id = p_submission_id;
  select * into resolution_row from public.topic_resolution where topic_id = p_topic_id;

  if resolution_row.resolution_status <> 'resolved' then
    raise exception 'Topic is not resolved';
  end if;

  case question_row.prediction_type
    when 'binary' then
      return case when submission_row.answer_boolean = resolution_row.resolved_boolean then 1 else 0 end;
    when 'categorical_closed' then
      return case when submission_row.answer_option_id = resolution_row.resolved_option_id then 1 else 0 end;
    when 'date_value' then
      distance := abs(submission_row.answer_date - resolution_row.resolved_date);
      date_span := greatest(1, coalesce(question_row.max_date_value - question_row.min_date_value, 30));
      return greatest(0, 1 - (distance / date_span));
    when 'ordinal_scale' then
      distance := abs(submission_row.answer_ordinal - resolution_row.resolved_ordinal);
      max_span := greatest(1, question_row.ordinal_max - question_row.ordinal_min);
      return greatest(0, 1 - (distance / max_span));
    else
      distance := abs(submission_row.answer_numeric - resolution_row.resolved_numeric);
      max_span := greatest(1, coalesce(question_row.max_numeric_value - question_row.min_numeric_value, resolution_row.resolved_numeric, 1));
      return greatest(0, 1 - (distance / max_span));
  end case;
end;
$$;

create or replace function public.award_card(
  p_user_id uuid,
  p_card_id uuid,
  p_reason public.card_grant_reason_type,
  p_source_entity_type public.audit_entity_type default null,
  p_source_entity_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_stackable_flag boolean;
begin
  select is_stackable into is_stackable_flag
  from public.card_catalog
  where id = p_card_id and is_active;

  if is_stackable_flag is null then
    raise exception 'Card is invalid or inactive';
  end if;

  if is_stackable_flag then
    insert into public.user_card_inventory(user_id, card_id, quantity)
    values (p_user_id, p_card_id, 1)
    on conflict (user_id, card_id)
    do update set quantity = public.user_card_inventory.quantity + 1, last_granted_at = timezone('utc', now());
  else
    insert into public.user_card_inventory(user_id, card_id, quantity)
    values (p_user_id, p_card_id, 1)
    on conflict (user_id, card_id)
    do update set last_granted_at = timezone('utc', now());
  end if;

  insert into public.card_grant_event(user_id, card_id, grant_reason_type, source_entity_type, source_entity_id, granted_by_user_id, grant_payload)
  values (p_user_id, p_card_id, p_reason, p_source_entity_type, p_source_entity_id, public.current_user_id(), coalesce(p_payload, '{}'::jsonb));
end;
$$;

create or replace function public.resolve_topic(
  p_topic_id uuid,
  p_resolution_note text,
  p_resolved_boolean boolean default null,
  p_resolved_date date default null,
  p_resolved_numeric numeric default null,
  p_resolved_option_id uuid default null,
  p_resolved_ordinal integer default null,
  p_source_type public.resolution_source_type default 'official_result',
  p_source_label text default null,
  p_source_url text default null,
  p_source_excerpt text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sub_row record;
  normalized numeric;
begin
  if not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;

  if p_source_label is null then
    raise exception 'A resolution source is required';
  end if;

  insert into public.topic_resolution(
    topic_id, resolution_status, resolved_by, resolved_at, resolution_note,
    resolved_boolean, resolved_date, resolved_numeric, resolved_option_id, resolved_ordinal
  )
  values (
    p_topic_id, 'resolved', public.current_user_id(), timezone('utc', now()), p_resolution_note,
    p_resolved_boolean, p_resolved_date, p_resolved_numeric, p_resolved_option_id, p_resolved_ordinal
  )
  on conflict (topic_id) do update
  set resolution_status = excluded.resolution_status,
      resolved_by = excluded.resolved_by,
      resolved_at = excluded.resolved_at,
      resolution_note = excluded.resolution_note,
      resolved_boolean = excluded.resolved_boolean,
      resolved_date = excluded.resolved_date,
      resolved_numeric = excluded.resolved_numeric,
      resolved_option_id = excluded.resolved_option_id,
      resolved_ordinal = excluded.resolved_ordinal,
      void_reason = null;

  if p_source_label is not null then
    insert into public.topic_resolution_source(topic_id, source_type, source_label, source_url, quoted_excerpt, created_by)
    values (p_topic_id, p_source_type, p_source_label, p_source_url, p_source_excerpt, public.current_user_id());
  end if;

  update public.topic
  set topic_status = 'resolved', updated_at = timezone('utc', now())
  where id = p_topic_id;

  delete from public.prediction_score_event where topic_id = p_topic_id;

  for sub_row in
    select id, user_id
    from public.prediction_submission
    where topic_id = p_topic_id
      and submission_status = 'active'
  loop
    normalized := public.compute_prediction_normalized_score(p_topic_id, sub_row.id);

    insert into public.prediction_score_event(topic_id, submission_id, user_id, raw_score, normalized_score, score_method)
    select p_topic_id, sub_row.id, sub_row.user_id, normalized, normalized, scoring_method
    from public.prediction_question
    where topic_id = p_topic_id;

    insert into public.reputation_ledger(user_id, event_type, delta, reference_entity_type, reference_entity_id)
    values (sub_row.user_id, 'prediction_accuracy', round(normalized * 10)::integer, 'topic_resolution', p_topic_id);
  end loop;

  perform public.log_audit_event('topic_resolution', p_topic_id, 'resolve_topic', jsonb_build_object('topic_id', p_topic_id));
end;
$$;

create or replace function public.rpc_record_consent(
  p_consent_type public.consent_type,
  p_consent_status public.consent_status,
  p_policy_version text,
  p_source text
)
returns public.user_consent
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.user_consent;
begin
  insert into public.user_consent(user_id, consent_type, consent_status, policy_version, source)
  values (public.current_user_id(), p_consent_type, p_consent_status, p_policy_version, p_source)
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.rpc_submit_prediction(
  p_topic_id uuid,
  p_answer_boolean boolean default null,
  p_answer_date date default null,
  p_answer_numeric numeric default null,
  p_answer_option_id uuid default null,
  p_answer_ordinal integer default null,
  p_source_context text default null
)
returns public.prediction_submission
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  result_row public.prediction_submission;
  topic_row public.topic%rowtype;
begin
  select * into topic_row from public.topic where id = p_topic_id;
  if topic_row.id is null or not public.can_read_topic(topic_row) then
    raise exception 'Topic is not readable';
  end if;

  select id into existing_id
  from public.prediction_submission
  where topic_id = p_topic_id
    and user_id = public.current_user_id()
    and submission_status = 'active';

  if existing_id is not null then
    update public.prediction_submission
    set submission_status = 'superseded',
        updated_at = timezone('utc', now())
    where id = existing_id;
  end if;

  insert into public.prediction_submission(
    topic_id, user_id, answer_boolean, answer_date, answer_numeric, answer_option_id, answer_ordinal, source_context
  )
  values (
    p_topic_id, public.current_user_id(), p_answer_boolean, p_answer_date, p_answer_numeric, p_answer_option_id, p_answer_ordinal, p_source_context
  )
  returning * into result_row;

  insert into public.reputation_ledger(user_id, event_type, delta, reference_entity_type, reference_entity_id)
  values (public.current_user_id(), 'topic_participation', 1, 'topic', p_topic_id);

  perform public.log_audit_event('prediction_submission', result_row.id, 'submit_prediction', jsonb_build_object('topic_id', p_topic_id));
  return result_row;
end;
$$;

create or replace function public.rpc_create_post(
  p_topic_id uuid default null,
  p_space_id uuid default null,
  p_post_type public.post_type default 'discussion',
  p_title text default null,
  p_body_markdown text default null
)
returns public.post
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.post;
  topic_row public.topic%rowtype;
  space_row public.space%rowtype;
begin
  if p_topic_id is null and p_space_id is null then
    raise exception 'A post must belong to a topic or a space';
  end if;

  if p_topic_id is not null then
    select * into topic_row from public.topic where id = p_topic_id;
    if topic_row.id is null or not public.can_read_topic(topic_row) then
      raise exception 'Topic is not readable';
    end if;
    if topic_row.topic_status <> 'open' then
      raise exception 'Posts are only open for user creation on open topics';
    end if;
  elsif p_space_id is not null then
    select * into space_row from public.space where id = p_space_id;
    if space_row.id is null or not public.can_read_space(space_row) then
      raise exception 'Space is not readable';
    end if;
  end if;

  insert into public.post(space_id, topic_id, author_user_id, post_type, title, body_markdown, body_plaintext)
  values (p_space_id, p_topic_id, public.current_user_id(), p_post_type, p_title, p_body_markdown, regexp_replace(coalesce(p_body_markdown, ''), E'<[^>]+>', '', 'g'))
  returning * into result_row;

  insert into public.reputation_ledger(user_id, event_type, delta, reference_entity_type, reference_entity_id)
  values (public.current_user_id(), 'post_participation', 1, 'post', result_row.id);

  perform public.log_audit_event('post', result_row.id, 'create_post', jsonb_build_object('topic_id', p_topic_id, 'space_id', p_space_id));
  return result_row;
end;
$$;

create or replace function public.rpc_create_topic_with_prediction(
  p_space_id uuid default null,
  p_slug text default null,
  p_title text default null,
  p_description text default null,
  p_visibility public.visibility_level default 'public',
  p_close_at timestamptz default null,
  p_prediction_type public.prediction_type default 'binary',
  p_prediction_title text default null,
  p_scoring_method public.prediction_scoring_method default 'exact_match',
  p_aggregation_method public.prediction_aggregation_method default 'binary_split'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  topic_id uuid;
begin
  insert into public.topic(space_id, slug, title, description, visibility, created_by, close_at)
  values (
    p_space_id,
    p_slug,
    p_title,
    p_description,
    p_visibility,
    public.current_user_id(),
    coalesce(p_close_at, timezone('utc', now()) + interval '7 days')
  )
  returning id into topic_id;

  insert into public.prediction_question(topic_id, prediction_type, title, scoring_method, aggregation_method)
  values (topic_id, p_prediction_type, coalesce(p_prediction_title, p_title), p_scoring_method, p_aggregation_method);

  perform public.log_audit_event('topic', topic_id, 'create_topic_with_prediction', jsonb_build_object('space_id', p_space_id));
  return topic_id;
end;
$$;

create or replace function public.rpc_create_poll(
  p_space_id uuid default null,
  p_topic_id uuid default null,
  p_title text default null,
  p_description text default null,
  p_visibility public.visibility_level default 'public',
  p_close_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  poll_id uuid;
begin
  insert into public.poll(space_id, topic_id, created_by, title, description, visibility, close_at)
  values (
    p_space_id,
    p_topic_id,
    public.current_user_id(),
    p_title,
    p_description,
    p_visibility,
    coalesce(p_close_at, timezone('utc', now()) + interval '7 days')
  )
  returning id into poll_id;

  perform public.log_audit_event('poll', poll_id, 'create_poll', jsonb_build_object('space_id', p_space_id, 'topic_id', p_topic_id));
  return poll_id;
end;
$$;

create or replace function public.rpc_apply_moderation_action(
  p_target_type public.moderation_target_type,
  p_target_id uuid,
  p_action_type public.moderation_action_type,
  p_reason_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  action_id uuid;
begin
  if not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;

  insert into public.moderation_action(target_type, target_id, action_type, actor_user_id, reason_note)
  values (p_target_type, p_target_id, p_action_type, public.current_user_id(), p_reason_note)
  returning id into action_id;

  perform public.log_audit_event('moderation_action', action_id, 'apply_moderation_action', jsonb_build_object('target_type', p_target_type, 'target_id', p_target_id));
  return action_id;
end;
$$;

create or replace function public.rpc_report_content(
  p_target_type public.moderation_target_type,
  p_target_id uuid,
  p_reason_code text,
  p_reason_detail text default null
)
returns public.moderation_report
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.moderation_report;
begin
  insert into public.moderation_report(reported_by, target_type, target_id, reason_code, reason_detail)
  values (public.current_user_id(), p_target_type, p_target_id, p_reason_code, p_reason_detail)
  returning * into result_row;

  perform public.log_audit_event('moderation_action', result_row.id, 'report_content', jsonb_build_object('target_type', p_target_type, 'target_id', p_target_id));
  return result_row;
end;
$$;

create or replace view public.v_public_profiles as
select
  p.user_id,
  case when vs.display_name_visibility = 'public' and p.is_public_profile_enabled then p.display_name else null end as display_name,
  case when vs.bio_visibility = 'public' and p.is_public_profile_enabled then p.bio else null end as bio,
  case when vs.territory_visibility = 'public' and p.is_public_profile_enabled then p.public_territory_id else null end as public_territory_id,
  p.created_at
from public.app_profile p
join public.user_visibility_settings vs on vs.user_id = p.user_id
where p.is_public_profile_enabled
  and p.profile_status = 'active';

create or replace view public.v_topic_public_summary as
select
  t.id,
  t.space_id,
  t.slug,
  t.title,
  t.description,
  t.topic_status,
  public.effective_topic_visibility(t) as effective_visibility,
  t.primary_territory_id,
  t.open_at,
  t.close_at,
  t.created_at,
  count(distinct p.id) filter (where p.post_status = 'visible') as visible_post_count,
  count(distinct ps.id) filter (where ps.submission_status = 'active') as active_prediction_count
from public.topic t
left join public.post p on p.topic_id = t.id
left join public.prediction_submission ps on ps.topic_id = t.id
where t.topic_status in ('open', 'locked', 'resolved', 'archived')
  and public.effective_topic_visibility(t) = 'public'
group by t.id;

create or replace view public.v_topic_prediction_aggregate as
select
  pq.topic_id,
  pq.prediction_type,
  count(ps.id) filter (where ps.submission_status = 'active') as submission_count,
  avg(ps.answer_numeric) as numeric_average,
  percentile_cont(0.5) within group (order by ps.answer_numeric) filter (where ps.answer_numeric is not null and ps.submission_status = 'active') as numeric_median,
  avg(case when ps.answer_boolean then 1 else 0 end) filter (where ps.answer_boolean is not null and ps.submission_status = 'active') as binary_yes_ratio
from public.prediction_question pq
left join public.prediction_submission ps on ps.topic_id = pq.topic_id
join public.topic t on t.id = pq.topic_id
where t.topic_status in ('open', 'locked', 'resolved', 'archived')
  and public.effective_topic_visibility(t) = 'public'
group by pq.topic_id, pq.prediction_type;

create or replace view public.v_poll_public_results as
select
  p.id as poll_id,
  pq.id as poll_question_id,
  po.id as poll_option_id,
  po.label as option_label,
  count(pr.id) as response_count
from public.poll p
join public.poll_question pq on pq.poll_id = p.id
left join public.poll_option po on po.poll_question_id = pq.id
left join public.poll_response pr on pr.poll_question_id = pq.id and pr.selected_option_id = po.id
where p.poll_status in ('open', 'closed', 'archived')
  and public.effective_poll_visibility(p) = 'public'
group by p.id, pq.id, po.id, po.label;

create or replace view public.v_my_prediction_history as
select * from public.prediction_submission_history where user_id = auth.uid();

create or replace view public.v_my_reputation_summary as
select user_id, sum(delta) as total_reputation, count(*) as event_count
from public.reputation_ledger
where user_id = auth.uid()
group by user_id;

create or replace view public.v_my_card_inventory as
select * from public.user_card_inventory where user_id = auth.uid();

create or replace view public.v_public_user_card_showcase as
select uci.user_id, uci.card_id, uci.quantity, uci.first_granted_at
from public.user_card_inventory uci
join public.user_visibility_settings vs on vs.user_id = uci.user_id
where vs.card_inventory_visibility = 'public';

create or replace view public.v_territory_rollup_topic_count as
select tc.ancestor_id as territory_id, count(distinct ttl.topic_id) as topic_count
from public.territory_closure tc
join public.topic_territory_link ttl on ttl.territory_id = tc.descendant_id
join public.topic t on t.id = ttl.topic_id and t.topic_status in ('open', 'locked', 'resolved', 'archived')
where public.effective_topic_visibility(t) = 'public'
group by tc.ancestor_id;

create or replace view public.v_territory_rollup_prediction_activity as
select tc.ancestor_id as territory_id, count(distinct ps.id) as prediction_count
from public.territory_closure tc
join public.topic_territory_link ttl on ttl.territory_id = tc.descendant_id
join public.prediction_submission ps on ps.topic_id = ttl.topic_id and ps.submission_status = 'active'
join public.topic t on t.id = ttl.topic_id
where t.topic_status in ('open', 'locked', 'resolved', 'archived')
  and public.effective_topic_visibility(t) = 'public'
group by tc.ancestor_id;

create or replace view public.v_moderation_queue as
select * from public.moderation_report where report_status in ('open', 'triaged');

create or replace view public.v_abuse_signals_recent as
select * from public.anti_abuse_signal
where detected_at >= timezone('utc', now()) - interval '30 days';

create or replace view public.v_resolution_audit_trail as
select tr.topic_id, tr.resolution_status, tr.resolved_by, tr.resolved_at, trs.source_label, trs.source_url
from public.topic_resolution tr
left join public.topic_resolution_source trs on trs.topic_id = tr.topic_id;

create or replace function public.refresh_territory_closure()
returns void
language sql
security definer
set search_path = public
as $$
  with recursive hierarchy as (
    select id as ancestor_id, id as descendant_id, 0 as depth
    from public.territory_reference
    union all
    select h.ancestor_id, t.id as descendant_id, h.depth + 1
    from hierarchy h
    join public.territory_reference t on t.parent_id = h.descendant_id
  )
  insert into public.territory_closure(ancestor_id, descendant_id, depth)
  select ancestor_id, descendant_id, depth
  from hierarchy
  on conflict (ancestor_id, descendant_id)
  do update set depth = excluded.depth;
$$;

create trigger app_profile_touch_updated_at
before update on public.app_profile
for each row execute function public.touch_updated_at();

create trigger visibility_settings_touch_updated_at
before update on public.user_visibility_settings
for each row execute function public.touch_updated_at();

create trigger private_profile_touch_updated_at
before update on public.user_private_political_profile
for each row execute function public.touch_updated_at();

create trigger declared_vote_touch_updated_at
before update on public.user_declared_vote_record
for each row execute function public.touch_updated_at();

create trigger space_touch_updated_at
before update on public.space
for each row execute function public.touch_updated_at();

create trigger topic_touch_updated_at
before update on public.topic
for each row execute function public.touch_updated_at();

create trigger post_touch_updated_at
before update on public.post
for each row execute function public.touch_updated_at();

create trigger validate_topic_visibility_before_write
before insert or update on public.topic
for each row execute function public.validate_topic_visibility();

create trigger validate_poll_visibility_before_write
before insert or update on public.poll
for each row execute function public.validate_poll_visibility();

create trigger validate_prediction_submission_before_write
before insert or update on public.prediction_submission
for each row execute function public.validate_prediction_submission();

create trigger snapshot_prediction_submission_after_write
after insert or update on public.prediction_submission
for each row execute function public.snapshot_prediction_submission();

create trigger capture_post_revision_before_update
before update on public.post
for each row execute function public.capture_post_revision();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create unique index if not exists topic_primary_territory_idx
on public.topic_territory_link(topic_id)
where is_primary;

create index if not exists taxonomy_term_axis_id_idx on public.taxonomy_term(axis_id);
create index if not exists territory_reference_parent_id_idx on public.territory_reference(parent_id);
create index if not exists app_profile_public_territory_id_idx on public.app_profile(public_territory_id);
create index if not exists user_consent_user_id_idx on public.user_consent(user_id);
create index if not exists user_declared_vote_record_user_id_idx on public.user_declared_vote_record(user_id);
create index if not exists space_created_by_idx on public.space(created_by);
create index if not exists topic_space_id_idx on public.topic(space_id);
create index if not exists topic_created_by_idx on public.topic(created_by);
create index if not exists topic_status_visibility_idx on public.topic(topic_status, visibility);
create index if not exists post_topic_id_idx on public.post(topic_id);
create index if not exists post_space_id_idx on public.post(space_id);
create index if not exists post_author_status_idx on public.post(author_user_id, post_status);
create index if not exists prediction_submission_user_topic_status_idx on public.prediction_submission(user_id, topic_id, submission_status);
create index if not exists prediction_submission_history_user_id_idx on public.prediction_submission_history(user_id);
create index if not exists prediction_score_event_user_id_idx on public.prediction_score_event(user_id);
create index if not exists poll_topic_id_idx on public.poll(topic_id);
create index if not exists poll_space_id_idx on public.poll(space_id);
create index if not exists poll_response_user_id_idx on public.poll_response(user_id);
create index if not exists moderation_report_reported_by_idx on public.moderation_report(reported_by);
create index if not exists moderation_action_actor_idx on public.moderation_action(actor_user_id);
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id, created_at desc);
create index if not exists anti_abuse_signal_user_idx on public.anti_abuse_signal(user_id, detected_at desc);
create index if not exists reputation_ledger_user_id_idx on public.reputation_ledger(user_id, created_at desc);
create index if not exists user_card_inventory_user_id_idx on public.user_card_inventory(user_id);
create index if not exists card_grant_event_user_id_idx on public.card_grant_event(user_id, granted_at desc);

alter table public.taxonomy_axis enable row level security;
alter table public.taxonomy_term enable row level security;
alter table public.territory_reference enable row level security;
alter table public.territory_closure enable row level security;
alter table public.app_profile enable row level security;
alter table public.user_visibility_settings enable row level security;
alter table public.user_consent enable row level security;
alter table public.user_private_political_profile enable row level security;
alter table public.user_declared_vote_record enable row level security;
alter table public.space enable row level security;
alter table public.space_scope enable row level security;
alter table public.topic enable row level security;
alter table public.topic_taxonomy_link enable row level security;
alter table public.topic_territory_link enable row level security;
alter table public.post enable row level security;
alter table public.post_revision enable row level security;
alter table public.prediction_question enable row level security;
alter table public.prediction_option enable row level security;
alter table public.prediction_submission enable row level security;
alter table public.prediction_submission_history enable row level security;
alter table public.topic_resolution enable row level security;
alter table public.topic_resolution_source enable row level security;
alter table public.prediction_score_event enable row level security;
alter table public.poll enable row level security;
alter table public.poll_question enable row level security;
alter table public.poll_option enable row level security;
alter table public.poll_response enable row level security;
alter table public.moderation_report enable row level security;
alter table public.moderation_action enable row level security;
alter table public.audit_log enable row level security;
alter table public.anti_abuse_signal enable row level security;
alter table public.reputation_ledger enable row level security;
alter table public.card_family enable row level security;
alter table public.card_catalog enable row level security;
alter table public.card_rule enable row level security;
alter table public.user_card_inventory enable row level security;
alter table public.card_grant_event enable row level security;

create policy taxonomy_axis_read on public.taxonomy_axis for select using (true);
create policy taxonomy_axis_admin_write on public.taxonomy_axis for all using (public.is_admin()) with check (public.is_admin());
create policy taxonomy_term_read on public.taxonomy_term for select using (true);
create policy taxonomy_term_admin_write on public.taxonomy_term for all using (public.is_admin()) with check (public.is_admin());
create policy territory_reference_read on public.territory_reference for select using (true);
create policy territory_reference_admin_write on public.territory_reference for all using (public.is_admin()) with check (public.is_admin());
create policy territory_closure_read on public.territory_closure for select using (true);
create policy app_profile_owner_select on public.app_profile for select using (user_id = auth.uid() or public.is_admin());
create policy app_profile_owner_update on public.app_profile for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy visibility_settings_owner_select on public.user_visibility_settings for select using (user_id = auth.uid() or public.is_admin());
create policy visibility_settings_owner_update on public.user_visibility_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_consent_owner_select on public.user_consent for select using (user_id = auth.uid() or public.is_admin());
create policy user_consent_owner_insert on public.user_consent for insert with check (user_id = auth.uid() or public.is_admin());
create policy private_political_owner_select on public.user_private_political_profile for select using (user_id = auth.uid() or public.is_admin());
create policy private_political_owner_update on public.user_private_political_profile for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy private_political_owner_insert on public.user_private_political_profile for insert with check (user_id = auth.uid() or public.is_admin());
create policy vote_record_owner_select on public.user_declared_vote_record for select using (user_id = auth.uid() or public.is_admin());
create policy vote_record_owner_insert on public.user_declared_vote_record for insert with check (user_id = auth.uid() or public.is_admin());
create policy vote_record_owner_update on public.user_declared_vote_record for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy space_read on public.space for select using (public.can_read_space(space));
create policy space_admin_insert on public.space for insert with check (public.is_admin());
create policy space_moderator_update on public.space for update using (public.is_moderator()) with check (public.is_moderator());
create policy space_scope_read on public.space_scope for select using (exists (select 1 from public.space s where s.id = space_id and public.can_read_space(s)));
create policy space_scope_admin_write on public.space_scope for all using (public.is_admin()) with check (public.is_admin());
create policy topic_read on public.topic for select using (public.can_read_topic(topic));
create policy topic_owner_insert on public.topic for insert with check (created_by = auth.uid() or public.is_admin());
create policy topic_owner_update on public.topic for update using (created_by = auth.uid() or public.is_moderator()) with check (created_by = auth.uid() or public.is_moderator());
create policy topic_taxonomy_link_read on public.topic_taxonomy_link for select using (exists (select 1 from public.topic t where t.id = topic_id and public.can_read_topic(t)));
create policy topic_taxonomy_link_admin_write on public.topic_taxonomy_link for all using (public.is_admin()) with check (public.is_admin());
create policy topic_territory_link_read on public.topic_territory_link for select using (exists (select 1 from public.topic t where t.id = topic_id and public.can_read_topic(t)));
create policy topic_territory_link_admin_write on public.topic_territory_link for all using (public.is_admin()) with check (public.is_admin());
create policy post_read on public.post for select using (public.can_read_post(post) or (author_user_id = auth.uid() and post_status <> 'removed'));
create policy post_owner_insert on public.post for insert with check (author_user_id = auth.uid() or public.is_admin());
create policy post_owner_update on public.post for update using (author_user_id = auth.uid() or public.is_moderator()) with check (author_user_id = auth.uid() or public.is_moderator());
create policy post_revision_read on public.post_revision for select using (editor_user_id = auth.uid() or public.is_moderator() or public.is_admin());
create policy prediction_question_read on public.prediction_question for select using (exists (select 1 from public.topic t where t.id = topic_id and public.can_read_topic(t)));
create policy prediction_question_admin_write on public.prediction_question for all using (public.is_admin()) with check (public.is_admin());
create policy prediction_option_read on public.prediction_option for select using (exists (select 1 from public.topic t where t.id = topic_id and public.can_read_topic(t)));
create policy prediction_option_admin_write on public.prediction_option for all using (public.is_admin()) with check (public.is_admin());
create policy prediction_submission_owner_select on public.prediction_submission for select using (user_id = auth.uid() or public.is_moderator() or public.is_admin());
create policy prediction_submission_owner_insert on public.prediction_submission for insert with check (user_id = auth.uid() or public.is_admin());
create policy prediction_submission_owner_update on public.prediction_submission for update using (user_id = auth.uid() or public.is_moderator()) with check (user_id = auth.uid() or public.is_moderator());
create policy prediction_submission_history_owner_select on public.prediction_submission_history for select using (user_id = auth.uid() or public.is_moderator() or public.is_admin());
create policy topic_resolution_read on public.topic_resolution for select using (exists (select 1 from public.topic t where t.id = topic_id and public.can_read_topic(t)));
create policy topic_resolution_moderator_write on public.topic_resolution for all using (public.is_moderator()) with check (public.is_moderator());
create policy topic_resolution_source_read on public.topic_resolution_source for select using (
  (source_type <> 'internal_moderation_note' or public.is_moderator())
  and exists (select 1 from public.topic t where t.id = topic_id and public.can_read_topic(t))
);
create policy topic_resolution_source_moderator_write on public.topic_resolution_source for all using (public.is_moderator()) with check (public.is_moderator());
create policy prediction_score_event_owner_select on public.prediction_score_event for select using (user_id = auth.uid() or public.is_admin());
create policy poll_read on public.poll for select using (public.can_read_poll(poll));
create policy poll_owner_insert on public.poll for insert with check (created_by = auth.uid() or public.is_admin());
create policy poll_owner_update on public.poll for update using (created_by = auth.uid() or public.is_moderator()) with check (created_by = auth.uid() or public.is_moderator());
create policy poll_question_read on public.poll_question for select using (exists (select 1 from public.poll p where p.id = poll_id and public.can_read_poll(p)));
create policy poll_question_admin_write on public.poll_question for all using (public.is_admin()) with check (public.is_admin());
create policy poll_option_read on public.poll_option for select using (exists (select 1 from public.poll_question pq join public.poll p on p.id = pq.poll_id where pq.id = poll_question_id and public.can_read_poll(p)));
create policy poll_option_admin_write on public.poll_option for all using (public.is_admin()) with check (public.is_admin());
create policy poll_response_owner_select on public.poll_response for select using (user_id = auth.uid() or public.is_admin());
create policy poll_response_owner_insert on public.poll_response for insert with check (user_id = auth.uid() or public.is_admin());
create policy poll_response_owner_update on public.poll_response for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy moderation_report_owner_select on public.moderation_report for select using (reported_by = auth.uid() or public.is_moderator() or public.is_admin());
create policy moderation_report_owner_insert on public.moderation_report for insert with check (reported_by = auth.uid() or public.is_admin());
create policy moderation_report_moderator_update on public.moderation_report for update using (public.is_moderator()) with check (public.is_moderator());
create policy moderation_action_moderator_select on public.moderation_action for select using (public.is_moderator() or public.is_admin());
create policy moderation_action_moderator_insert on public.moderation_action for insert with check (public.is_moderator() or public.is_admin());
create policy moderation_action_moderator_update on public.moderation_action for update using (public.is_moderator() or public.is_admin()) with check (public.is_moderator() or public.is_admin());
create policy audit_log_admin_select on public.audit_log for select using (public.is_admin());
create policy anti_abuse_signal_moderator_select on public.anti_abuse_signal for select using (public.is_moderator() or public.is_admin());
create policy reputation_ledger_owner_select on public.reputation_ledger for select using (user_id = auth.uid() or public.is_admin());
create policy card_family_read on public.card_family for select using (true);
create policy card_family_admin_write on public.card_family for all using (public.is_admin()) with check (public.is_admin());
create policy card_catalog_read on public.card_catalog for select using (is_active or public.is_admin());
create policy card_catalog_admin_write on public.card_catalog for all using (public.is_admin()) with check (public.is_admin());
create policy card_rule_admin_select on public.card_rule for select using (public.is_admin());
create policy card_rule_admin_write on public.card_rule for all using (public.is_admin()) with check (public.is_admin());
create policy user_card_inventory_owner_select on public.user_card_inventory for select using (user_id = auth.uid() or public.is_admin());
create policy card_grant_event_owner_select on public.card_grant_event for select using (user_id = auth.uid() or public.is_moderator() or public.is_admin());

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.taxonomy_axis, public.taxonomy_term, public.territory_reference, public.territory_closure, public.space, public.space_scope, public.topic, public.topic_taxonomy_link, public.topic_territory_link, public.post, public.prediction_question, public.prediction_option, public.topic_resolution, public.topic_resolution_source, public.poll, public.poll_question, public.poll_option, public.card_family, public.card_catalog to anon, authenticated;
grant select, update on public.app_profile, public.user_visibility_settings, public.user_private_political_profile to authenticated;
grant select on public.user_consent, public.prediction_submission, public.prediction_submission_history, public.prediction_score_event, public.poll_response, public.reputation_ledger, public.user_card_inventory, public.card_grant_event, public.moderation_report to authenticated;
grant insert, update, select on public.user_declared_vote_record to authenticated;
grant insert, update, select on public.post to authenticated;
grant insert, update, select on public.moderation_report to authenticated;
grant select on public.v_public_profiles, public.v_topic_public_summary, public.v_topic_prediction_aggregate, public.v_poll_public_results, public.v_public_user_card_showcase, public.v_territory_rollup_topic_count, public.v_territory_rollup_prediction_activity to anon, authenticated;
grant select on public.v_my_prediction_history, public.v_my_reputation_summary, public.v_my_card_inventory, public.v_moderation_queue, public.v_abuse_signals_recent, public.v_resolution_audit_trail to authenticated;
grant execute on function public.rpc_record_consent(public.consent_type, public.consent_status, text, text) to authenticated;
grant execute on function public.rpc_submit_prediction(uuid, boolean, date, numeric, uuid, integer, text) to authenticated;
grant execute on function public.rpc_create_post(uuid, uuid, public.post_type, text, text) to authenticated;
grant execute on function public.rpc_create_topic_with_prediction(uuid, text, text, text, public.visibility_level, timestamptz, public.prediction_type, text, public.prediction_scoring_method, public.prediction_aggregation_method) to authenticated;
grant execute on function public.rpc_create_poll(uuid, uuid, text, text, public.visibility_level, timestamptz) to authenticated;
grant execute on function public.rpc_report_content(public.moderation_target_type, uuid, text, text) to authenticated;
grant execute on function public.rpc_apply_moderation_action(public.moderation_target_type, uuid, public.moderation_action_type, text) to authenticated;
grant execute on function public.resolve_topic(uuid, text, boolean, date, numeric, uuid, integer, public.resolution_source_type, text, text, text) to authenticated;

insert into public.taxonomy_axis(slug, label, description, sort_order)
values
  ('ideology', 'Ideology', 'Political ideology axis', 10),
  ('topic_nature', 'Topic Nature', 'Nature of the subject', 20),
  ('geographic_scope', 'Geographic Scope', 'Territorial scope of the subject', 30),
  ('institution_election', 'Institution / Election', 'Institutional or electoral context', 40),
  ('entity_kind', 'Entity Kind', 'Dominant entity concerned by the topic', 50)
on conflict (slug) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

with axis_map as (
  select slug, id from public.taxonomy_axis
)
insert into public.taxonomy_term(axis_id, slug, label, sort_order)
values
  ((select id from axis_map where slug = 'ideology'), 'extreme-right', 'Extreme Right', 10),
  ((select id from axis_map where slug = 'ideology'), 'right', 'Right', 20),
  ((select id from axis_map where slug = 'ideology'), 'center', 'Center', 30),
  ((select id from axis_map where slug = 'ideology'), 'left', 'Left', 40),
  ((select id from axis_map where slug = 'ideology'), 'extreme-left', 'Extreme Left', 50),
  ((select id from axis_map where slug = 'ideology'), 'transversal', 'Transversal / Institutional', 60),
  ((select id from axis_map where slug = 'topic_nature'), 'electoral', 'Electoral', 10),
  ((select id from axis_map where slug = 'topic_nature'), 'judicial', 'Judicial', 20),
  ((select id from axis_map where slug = 'topic_nature'), 'institutional', 'Institutional', 30),
  ((select id from axis_map where slug = 'topic_nature'), 'partisan-internal', 'Partisan Internal', 40),
  ((select id from axis_map where slug = 'topic_nature'), 'geopolitical', 'Geopolitical', 50),
  ((select id from axis_map where slug = 'topic_nature'), 'economic', 'Economic', 60),
  ((select id from axis_map where slug = 'topic_nature'), 'local-municipal', 'Local / Municipal', 70),
  ((select id from axis_map where slug = 'topic_nature'), 'parliamentary', 'Parliamentary', 80),
  ((select id from axis_map where slug = 'topic_nature'), 'governmental', 'Governmental', 90),
  ((select id from axis_map where slug = 'topic_nature'), 'media', 'Media', 100),
  ((select id from axis_map where slug = 'geographic_scope'), 'international', 'International', 10),
  ((select id from axis_map where slug = 'geographic_scope'), 'national', 'National', 20),
  ((select id from axis_map where slug = 'geographic_scope'), 'regional', 'Regional', 30),
  ((select id from axis_map where slug = 'geographic_scope'), 'departmental', 'Departmental', 40),
  ((select id from axis_map where slug = 'geographic_scope'), 'communal', 'Communal', 50),
  ((select id from axis_map where slug = 'institution_election'), 'presidential', 'Presidential', 10),
  ((select id from axis_map where slug = 'institution_election'), 'legislative', 'Legislative', 20),
  ((select id from axis_map where slug = 'institution_election'), 'municipal', 'Municipal', 30),
  ((select id from axis_map where slug = 'institution_election'), 'european', 'European', 40),
  ((select id from axis_map where slug = 'institution_election'), 'regional', 'Regional', 50),
  ((select id from axis_map where slug = 'institution_election'), 'departmental', 'Departmental', 60),
  ((select id from axis_map where slug = 'institution_election'), 'primaries', 'Primaries', 70),
  ((select id from axis_map where slug = 'institution_election'), 'referendum', 'Referendum', 80),
  ((select id from axis_map where slug = 'institution_election'), 'other', 'Other', 90),
  ((select id from axis_map where slug = 'entity_kind'), 'party', 'Party', 10),
  ((select id from axis_map where slug = 'entity_kind'), 'personality', 'Personality', 20),
  ((select id from axis_map where slug = 'entity_kind'), 'institution', 'Institution', 30),
  ((select id from axis_map where slug = 'entity_kind'), 'territory', 'Territory', 40),
  ((select id from axis_map where slug = 'entity_kind'), 'conflict', 'Conflict', 50),
  ((select id from axis_map where slug = 'entity_kind'), 'media', 'Media', 60)
on conflict (axis_id, slug) do update
set label = excluded.label,
    sort_order = excluded.sort_order;

insert into public.territory_reference(territory_level, country_code, territory_code, name, normalized_name)
values
  ('macro', 'ZZ', 'world', 'World', 'world'),
  ('macro', 'ZZ', 'europe', 'Europe', 'europe'),
  ('country', 'FR', 'france', 'France', 'france')
on conflict (country_code, territory_code) do update
set name = excluded.name,
    normalized_name = excluded.normalized_name;

insert into public.card_family(slug, label, family_type, description)
values
  ('exploration', 'Exploration', 'exploration', 'Rewards territorial and thematic discovery.'),
  ('performance', 'Performance', 'performance', 'Rewards prediction accuracy.')
on conflict (slug) do update
set label = excluded.label,
    family_type = excluded.family_type,
    description = excluded.description;

insert into public.card_catalog(family_id, slug, label, description, rarity, is_stackable)
values
  ((select id from public.card_family where slug = 'exploration'), 'first-commune', 'First Commune', 'Awarded for a first validated communal topic contribution.', 'common', false),
  ((select id from public.card_family where slug = 'performance'), 'accurate-resolver', 'Accurate Resolver', 'Awarded for high prediction accuracy on a resolved topic.', 'rare', false)
on conflict (slug) do update
set label = excluded.label,
    description = excluded.description,
    rarity = excluded.rarity,
    is_stackable = excluded.is_stackable;

select public.refresh_territory_closure();

commit;
