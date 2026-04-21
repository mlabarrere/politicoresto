


-- Baseline extensions required by this schema. Supabase staging/prod already
-- have these; this block makes the migration self-sufficient on a fresh local DB.
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."anti_abuse_signal_type" AS ENUM (
    'burst_activity',
    'territorial_farming',
    'topic_spam',
    'new_account_concentration',
    'coordinated_pattern',
    'reward_abuse'
);


ALTER TYPE "public"."anti_abuse_signal_type" OWNER TO "postgres";


CREATE TYPE "public"."audit_entity_type" AS ENUM (
    'profile',
    'space',
    'topic',
    'post',
    'poll',
    'prediction_submission',
    'topic_resolution',
    'card_grant',
    'moderation_action'
);


ALTER TYPE "public"."audit_entity_type" OWNER TO "postgres";


CREATE TYPE "public"."card_family_type" AS ENUM (
    'personality',
    'archetype',
    'territory',
    'performance',
    'event',
    'exploration',
    'seniority',
    'role'
);


ALTER TYPE "public"."card_family_type" OWNER TO "postgres";


CREATE TYPE "public"."card_grant_reason_type" AS ENUM (
    'participation',
    'exploration',
    'prediction_performance',
    'seniority',
    'special_event',
    'moderation_manual'
);


ALTER TYPE "public"."card_grant_reason_type" OWNER TO "postgres";


CREATE TYPE "public"."card_rarity" AS ENUM (
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary'
);


ALTER TYPE "public"."card_rarity" OWNER TO "postgres";


CREATE TYPE "public"."consent_status" AS ENUM (
    'granted',
    'revoked'
);


ALTER TYPE "public"."consent_status" OWNER TO "postgres";


CREATE TYPE "public"."consent_type" AS ENUM (
    'terms_of_service',
    'privacy_policy',
    'political_sensitive_data',
    'public_profile_visibility',
    'analytics_participation'
);


ALTER TYPE "public"."consent_type" OWNER TO "postgres";


CREATE TYPE "public"."election_type" AS ENUM (
    'presidentielle',
    'legislatives',
    'europeennes'
);


ALTER TYPE "public"."election_type" OWNER TO "postgres";


CREATE TYPE "public"."moderation_action_type" AS ENUM (
    'hide_content',
    'lock_topic',
    'unlock_topic',
    'remove_content',
    'restore_content',
    'suspend_submission',
    'void_resolution',
    'warning',
    'note'
);


ALTER TYPE "public"."moderation_action_type" OWNER TO "postgres";


CREATE TYPE "public"."moderation_report_status" AS ENUM (
    'open',
    'triaged',
    'resolved',
    'dismissed'
);


ALTER TYPE "public"."moderation_report_status" OWNER TO "postgres";


CREATE TYPE "public"."moderation_target_type" AS ENUM (
    'post',
    'topic',
    'poll',
    'profile',
    'prediction_submission'
);


ALTER TYPE "public"."moderation_target_type" OWNER TO "postgres";


CREATE TYPE "public"."political_entity_type" AS ENUM (
    'party',
    'candidate',
    'bloc'
);


ALTER TYPE "public"."political_entity_type" OWNER TO "postgres";


CREATE TYPE "public"."poll_question_type" AS ENUM (
    'single_choice',
    'multiple_choice',
    'ordinal_scale'
);


ALTER TYPE "public"."poll_question_type" OWNER TO "postgres";


CREATE TYPE "public"."poll_status" AS ENUM (
    'draft',
    'open',
    'closed',
    'archived',
    'removed'
);


ALTER TYPE "public"."poll_status" OWNER TO "postgres";


CREATE TYPE "public"."poll_wave_status" AS ENUM (
    'draft',
    'open',
    'closed',
    'published'
);


ALTER TYPE "public"."poll_wave_status" OWNER TO "postgres";


CREATE TYPE "public"."post_status" AS ENUM (
    'visible',
    'hidden',
    'locked',
    'removed'
);


ALTER TYPE "public"."post_status" OWNER TO "postgres";


CREATE TYPE "public"."post_type" AS ENUM (
    'news',
    'analysis',
    'discussion',
    'local',
    'moderation',
    'resolution_justification'
);


ALTER TYPE "public"."post_type" OWNER TO "postgres";


CREATE TYPE "public"."prediction_aggregation_method" AS ENUM (
    'binary_split',
    'median_distribution',
    'option_distribution',
    'numeric_summary',
    'ordinal_summary'
);


ALTER TYPE "public"."prediction_aggregation_method" OWNER TO "postgres";


CREATE TYPE "public"."prediction_scoring_method" AS ENUM (
    'exact_match',
    'normalized_absolute_error',
    'normalized_relative_error',
    'ordinal_distance',
    'date_distance'
);


ALTER TYPE "public"."prediction_scoring_method" OWNER TO "postgres";


CREATE TYPE "public"."prediction_type" AS ENUM (
    'binary',
    'date_value',
    'categorical_closed',
    'bounded_percentage',
    'bounded_volume',
    'bounded_integer',
    'ordinal_scale'
);


ALTER TYPE "public"."prediction_type" OWNER TO "postgres";


CREATE TYPE "public"."profile_status" AS ENUM (
    'active',
    'limited',
    'suspended',
    'deleted'
);


ALTER TYPE "public"."profile_status" OWNER TO "postgres";


CREATE TYPE "public"."reaction_target_type" AS ENUM (
    'thread_post',
    'comment'
);


ALTER TYPE "public"."reaction_target_type" OWNER TO "postgres";


CREATE TYPE "public"."reaction_type" AS ENUM (
    'upvote',
    'downvote'
);


ALTER TYPE "public"."reaction_type" OWNER TO "postgres";


CREATE TYPE "public"."reputation_event_type" AS ENUM (
    'topic_participation',
    'post_participation',
    'prediction_accuracy',
    'moderation_penalty',
    'card_bonus',
    'manual_adjustment'
);


ALTER TYPE "public"."reputation_event_type" OWNER TO "postgres";


CREATE TYPE "public"."resolution_source_type" AS ENUM (
    'official_result',
    'official_statement',
    'press_article',
    'court_document',
    'internal_moderation_note',
    'other'
);


ALTER TYPE "public"."resolution_source_type" OWNER TO "postgres";


CREATE TYPE "public"."resolution_status" AS ENUM (
    'pending',
    'resolved',
    'reopened',
    'voided'
);


ALTER TYPE "public"."resolution_status" OWNER TO "postgres";


CREATE TYPE "public"."space_role" AS ENUM (
    'legacy',
    'global',
    'party',
    'bloc'
);


ALTER TYPE "public"."space_role" OWNER TO "postgres";


CREATE TYPE "public"."space_status" AS ENUM (
    'active',
    'archived',
    'hidden',
    'removed'
);


ALTER TYPE "public"."space_status" OWNER TO "postgres";


CREATE TYPE "public"."space_type" AS ENUM (
    'geographic',
    'institutional',
    'thematic',
    'editorial'
);


ALTER TYPE "public"."space_type" OWNER TO "postgres";


CREATE TYPE "public"."submission_status" AS ENUM (
    'active',
    'superseded',
    'withdrawn',
    'invalidated'
);


ALTER TYPE "public"."submission_status" OWNER TO "postgres";


CREATE TYPE "public"."territory_level" AS ENUM (
    'macro',
    'country',
    'region',
    'department',
    'commune'
);


ALTER TYPE "public"."territory_level" OWNER TO "postgres";


CREATE TYPE "public"."thread_kind" AS ENUM (
    'issue',
    'poll_wave',
    'candidate_watch',
    'party_watch'
);


ALTER TYPE "public"."thread_kind" OWNER TO "postgres";


CREATE TYPE "public"."thread_post_status" AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE "public"."thread_post_status" OWNER TO "postgres";


CREATE TYPE "public"."thread_post_type" AS ENUM (
    'article',
    'poll',
    'market'
);


ALTER TYPE "public"."thread_post_type" OWNER TO "postgres";


CREATE TYPE "public"."topic_status" AS ENUM (
    'draft',
    'open',
    'locked',
    'resolved',
    'archived',
    'removed'
);


ALTER TYPE "public"."topic_status" OWNER TO "postgres";


CREATE TYPE "public"."visibility_level" AS ENUM (
    'public',
    'authenticated',
    'private',
    'moderators_only'
);


ALTER TYPE "public"."visibility_level" OWNER TO "postgres";


CREATE TYPE "public"."vote_choice_kind" AS ENUM (
    'vote',
    'blanc',
    'nul',
    'abstention',
    'non_inscrit',
    'ne_se_prononce_pas'
);


ALTER TYPE "public"."vote_choice_kind" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_card"("p_user_id" "uuid", "p_card_id" "uuid", "p_reason" "public"."card_grant_reason_type", "p_source_entity_type" "public"."audit_entity_type" DEFAULT NULL::"public"."audit_entity_type", "p_source_entity_id" "uuid" DEFAULT NULL::"uuid", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."award_card"("p_user_id" "uuid", "p_card_id" "uuid", "p_reason" "public"."card_grant_reason_type", "p_source_entity_type" "public"."audit_entity_type", "p_source_entity_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."post" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "topic_id" "uuid",
    "author_user_id" "uuid" NOT NULL,
    "post_type" "public"."post_type" NOT NULL,
    "post_status" "public"."post_status" DEFAULT 'visible'::"public"."post_status" NOT NULL,
    "title" "text",
    "body_markdown" "text" NOT NULL,
    "body_plaintext" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "edited_at" timestamp with time zone,
    "removed_at" timestamp with time zone,
    "thread_post_id" "uuid",
    "parent_post_id" "uuid",
    "depth" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "post_parent_chk" CHECK ((("topic_id" IS NOT NULL) OR ("space_id" IS NOT NULL))),
    CONSTRAINT "post_thread_post_parent_chk" CHECK ((("parent_post_id" IS NULL) OR ("thread_post_id" IS NOT NULL))),
    CONSTRAINT "resolution_post_topic_chk" CHECK ((("post_type" <> 'resolution_justification'::"public"."post_type") OR ("topic_id" IS NOT NULL)))
);


ALTER TABLE "public"."post" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_post"("post_row" "public"."post") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select case
    when public.is_moderator() then true
    when post_row.post_status in ('hidden', 'removed') then false
    when post_row.topic_id is not null then exists (select 1 from public.topic t where t.id = post_row.topic_id and public.can_read_topic(t))
    else false end;
$$;


ALTER FUNCTION "public"."can_read_post"("post_row" "public"."post") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_poll" (
    "post_item_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "deadline_at" timestamp with time zone NOT NULL,
    "poll_status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "post_poll_poll_status_check" CHECK (("poll_status" = ANY (ARRAY['open'::"text", 'closed'::"text"]))),
    CONSTRAINT "post_poll_window_chk" CHECK (("deadline_at" <= ("created_at" + '48:00:00'::interval)))
);


ALTER TABLE "public"."post_poll" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_post_poll"("poll_row" "public"."post_poll") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.thread_post tp
    join public.topic t on t.id = tp.thread_id
    where tp.id = poll_row.post_item_id
      and tp.status = 'published'
      and public.can_read_topic(t)
  );
$$;


ALTER FUNCTION "public"."can_read_post_poll"("poll_row" "public"."post_poll") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "slug" "public"."citext" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "topic_status" "public"."topic_status" DEFAULT 'draft'::"public"."topic_status" NOT NULL,
    "visibility" "public"."visibility_level" DEFAULT 'public'::"public"."visibility_level" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "open_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "close_at" timestamp with time zone NOT NULL,
    "resolve_deadline_at" timestamp with time zone,
    "primary_territory_id" "uuid",
    "is_sensitive" boolean DEFAULT false NOT NULL,
    "locked_reason" "text",
    "entity_id" "uuid",
    "thread_kind" "public"."thread_kind" DEFAULT 'issue'::"public"."thread_kind" NOT NULL,
    "campaign_cycle" "text" DEFAULT 'presidentielle_2027'::"text" NOT NULL,
    CONSTRAINT "topic_resolve_window_chk" CHECK ((("resolve_deadline_at" IS NULL) OR ("close_at" <= "resolve_deadline_at"))),
    CONSTRAINT "topic_window_chk" CHECK (("open_at" < "close_at"))
);


ALTER TABLE "public"."topic" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_topic"("topic_row" "public"."topic") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select case
    when public.is_moderator() then true
    when topic_row.topic_status = 'removed' then false
    when topic_row.topic_status = 'draft' then topic_row.created_by = auth.uid()
    when public.effective_topic_visibility(topic_row) = 'public' then true
    when public.effective_topic_visibility(topic_row) = 'authenticated' then auth.uid() is not null
    else false end;
$$;


ALTER FUNCTION "public"."can_read_topic"("topic_row" "public"."topic") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capture_post_revision"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if tg_op = 'UPDATE' and old.body_markdown is distinct from new.body_markdown then
    insert into public.post_revision(post_id, editor_user_id, body_markdown, edit_reason)
    values (new.id, coalesce(public.current_user_id(), new.author_user_id), old.body_markdown, 'body_update');
    new.edited_at := timezone('utc', now());
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."capture_post_revision"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_prediction_normalized_score"("p_topic_id" "uuid", "p_submission_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."compute_prediction_normalized_score"("p_topic_id" "uuid", "p_submission_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_comment"("p_thread_post_id" "uuid", "p_parent_post_id" "uuid" DEFAULT NULL::"uuid", "p_body_markdown" "text" DEFAULT NULL::"text") RETURNS "public"."post"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare result_row public.post; parent_row public.post%rowtype; thread_post_row public.thread_post%rowtype; thread_row public.topic%rowtype; comment_depth integer := 0;
begin
  if public.current_user_id() is null then raise exception 'Authentication required'; end if;

  select * into thread_post_row from public.thread_post where id = p_thread_post_id;
  if thread_post_row.id is null then raise exception 'Thread post not found'; end if;

  select * into thread_row from public.topic where id = thread_post_row.thread_id;
  if thread_row.id is null or not public.can_read_topic(thread_row) then raise exception 'Thread is not readable'; end if;

  if p_parent_post_id is not null then
    select * into parent_row from public.post where id = p_parent_post_id;
    if parent_row.id is null then raise exception 'Parent comment not found'; end if;
    if parent_row.thread_post_id is distinct from p_thread_post_id then raise exception 'Parent comment must belong to the same thread post'; end if;
    comment_depth := parent_row.depth + 1;
  end if;

  insert into public.post(space_id, topic_id, author_user_id, post_type, post_status, title, body_markdown, body_plaintext, thread_post_id, parent_post_id, depth)
  values (null, thread_row.id, public.current_user_id(), 'discussion', 'visible', null, coalesce(p_body_markdown, ''), coalesce(p_body_markdown, ''), p_thread_post_id, p_parent_post_id, comment_depth)
  returning * into result_row;

  return result_row;
end;
$$;


ALTER FUNCTION "public"."create_comment"("p_thread_post_id" "uuid", "p_parent_post_id" "uuid", "p_body_markdown" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_post"("p_thread_id" "uuid", "p_type" "text", "p_title" "text" DEFAULT NULL::"text", "p_content" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_post_id uuid;
  v_type public.thread_post_type;
  v_entity_id uuid;
begin
  v_user_id := public.current_user_id();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_type := p_type::public.thread_post_type;

  select entity_id into v_entity_id from public.topic where id = p_thread_id;

  insert into public.thread_post(thread_id, type, title, content, metadata, entity_id, created_by)
  values (p_thread_id, v_type, p_title, p_content, coalesce(p_metadata, '{}'::jsonb), v_entity_id, v_user_id)
  returning id into v_post_id;

  if v_type = 'poll'::public.thread_post_type then
    update public.poll set thread_post_id = v_post_id where topic_id = p_thread_id and thread_post_id is null;
  elsif v_type = 'market'::public.thread_post_type then
    update public.prediction_question set thread_post_id = v_post_id where topic_id = p_thread_id and thread_post_id is null;
  end if;

  perform public.log_audit_event('topic', p_thread_id, 'create_thread_post', jsonb_build_object('thread_post_id', v_post_id, 'type', p_type));
  return v_post_id;
end;
$$;


ALTER FUNCTION "public"."create_post"("p_thread_id" "uuid", "p_type" "text", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."thread_post" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "type" "public"."thread_post_type" NOT NULL,
    "title" "text",
    "content" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "entity_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" "public"."thread_post_status" DEFAULT 'published'::"public"."thread_post_status" NOT NULL,
    "party_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."thread_post" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_post"("p_thread_id" "uuid", "p_type" "public"."thread_post_type", "p_title" "text" DEFAULT NULL::"text", "p_content" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."thread_post"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare result_row public.thread_post; thread_row public.topic%rowtype;
begin
  if public.current_user_id() is null then raise exception 'Authentication required'; end if;
  if p_type not in ('article') then raise exception 'Only article posts are allowed in forum MVP'; end if;

  select * into thread_row from public.topic where id = p_thread_id;
  if thread_row.id is null or not public.can_read_topic(thread_row) then raise exception 'Thread is not readable'; end if;
  if thread_row.topic_status <> 'open' then raise exception 'Posts can only be created on open threads'; end if;

  insert into public.thread_post(thread_id, type, title, content, metadata, entity_id, created_by, status)
  values (p_thread_id, p_type, p_title, p_content, coalesce(p_metadata, '{}'::jsonb), thread_row.entity_id, public.current_user_id(), 'published')
  returning * into result_row;

  return result_row;
end;
$$;


ALTER FUNCTION "public"."create_post"("p_thread_id" "uuid", "p_type" "public"."thread_post_type", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_post_poll"("p_post_item_id" "uuid", "p_question" "text", "p_deadline_at" timestamp with time zone, "p_options" "jsonb") RETURNS "public"."post_poll"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  post_row public.thread_post%rowtype;
  result_row public.post_poll%rowtype;
  option_value text;
  idx integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into post_row from public.thread_post where id = p_post_item_id;
  if post_row.id is null then
    raise exception 'Post item not found';
  end if;
  if post_row.created_by <> auth.uid() then
    raise exception 'Only post owner can attach poll';
  end if;

  if nullif(btrim(coalesce(p_question, '')), '') is null then
    raise exception 'Poll question required';
  end if;

  if p_deadline_at is null or p_deadline_at > timezone('utc', now()) + interval '48 hours' then
    raise exception 'Poll deadline must be set within 48h';
  end if;

  insert into public.post_poll(post_item_id, question, deadline_at, created_by)
  values (p_post_item_id, btrim(p_question), p_deadline_at, auth.uid())
  on conflict (post_item_id) do update
    set question = excluded.question,
        deadline_at = excluded.deadline_at
  returning * into result_row;

  delete from public.post_poll_option where post_item_id = p_post_item_id;

  for option_value in
    select jsonb_array_elements_text(coalesce(p_options, '[]'::jsonb))
  loop
    if nullif(btrim(option_value), '') is not null then
      insert into public.post_poll_option(post_item_id, label, sort_order)
      values (p_post_item_id, btrim(option_value), idx);
      idx := idx + 1;
    end if;
  end loop;

  if idx < 2 then
    raise exception 'At least two poll options are required';
  end if;

  return result_row;
end;
$$;


ALTER FUNCTION "public"."create_post_poll"("p_post_item_id" "uuid", "p_question" "text", "p_deadline_at" timestamp with time zone, "p_options" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_thread"("p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_space_id" "uuid" DEFAULT NULL::"uuid", "p_close_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "public"."topic"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare result_row public.topic;
begin
  if public.current_user_id() is null then raise exception 'Authentication required'; end if;

  insert into public.topic(space_id, slug, title, description, topic_status, visibility, created_by, close_at, entity_id, thread_kind, campaign_cycle, is_sensitive)
  values (
    null,
    lower(regexp_replace(regexp_replace(coalesce(p_title, 'thread') || '-' || substr(gen_random_uuid()::text, 1, 8), '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'))::citext,
    p_title,
    p_description,
    'open',
    'public',
    public.current_user_id(),
    coalesce(p_close_at, timezone('utc', now()) + interval '14 days'),
    p_entity_id,
    'issue',
    'presidentielle_2027',
    false
  ) returning * into result_row;

  return result_row;
end;
$$;


ALTER FUNCTION "public"."create_thread"("p_title" "text", "p_description" "text", "p_entity_id" "uuid", "p_space_id" "uuid", "p_close_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', 'authenticated');
$$;


ALTER FUNCTION "public"."current_app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select auth.uid();
$$;


ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."effective_topic_visibility"("topic_row" "public"."topic") RETURNS "public"."visibility_level"
    LANGUAGE "sql" STABLE
    AS $$
  select case when topic_row.topic_status = 'removed' then 'moderators_only'::public.visibility_level else topic_row.visibility end;
$$;


ALTER FUNCTION "public"."effective_topic_visibility"("topic_row" "public"."topic") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.app_profile(user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'citizen'))
  on conflict (user_id) do nothing;

  insert into public.user_private_political_profile(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select public.current_app_role() = 'admin';
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_moderator"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select public.current_app_role() in ('admin', 'moderator');
$$;


ALTER FUNCTION "public"."is_moderator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_event"("p_entity_type" "public"."audit_entity_type", "p_entity_id" "uuid", "p_action_name" "text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "sql"
    AS $$ select; $$;


ALTER FUNCTION "public"."log_audit_event"("p_entity_type" "public"."audit_entity_type", "p_entity_id" "uuid", "p_action_name" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reaction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_type" "public"."reaction_target_type" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction_type" "public"."reaction_type" NOT NULL,
    "weight" numeric DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."reaction" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."react_post"("p_target_type" "public"."reaction_target_type", "p_target_id" "uuid", "p_reaction_type" "public"."reaction_type") RETURNS "public"."reaction"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  result_row public.reaction;
  existing_row public.reaction;
  target_author uuid;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  if p_target_type = 'thread_post' then
    select created_by into target_author from public.thread_post where id = p_target_id;
  else
    select author_user_id into target_author from public.post where id = p_target_id;
  end if;

  if target_author is null then
    raise exception 'Reaction target not found';
  end if;

  select *
  into existing_row
  from public.reaction
  where target_type = p_target_type
    and target_id = p_target_id
    and user_id = public.current_user_id()
  limit 1;

  if existing_row.id is not null then
    if existing_row.reaction_type = p_reaction_type then
      delete from public.reaction where id = existing_row.id;
      return null;
    end if;

    update public.reaction
    set reaction_type = p_reaction_type,
        weight = 1,
        created_at = timezone('utc', now())
    where id = existing_row.id
    returning * into result_row;

    return result_row;
  end if;

  insert into public.reaction(target_type, target_id, user_id, reaction_type, weight)
  values (p_target_type, p_target_id, public.current_user_id(), p_reaction_type, 1)
  returning * into result_row;

  return result_row;
end;
$$;


ALTER FUNCTION "public"."react_post"("p_target_type" "public"."reaction_target_type", "p_target_id" "uuid", "p_reaction_type" "public"."reaction_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_topic"("p_topic_id" "uuid", "p_resolution_note" "text", "p_resolved_boolean" boolean DEFAULT NULL::boolean, "p_resolved_date" "date" DEFAULT NULL::"date", "p_resolved_numeric" numeric DEFAULT NULL::numeric, "p_resolved_option_id" "uuid" DEFAULT NULL::"uuid", "p_resolved_ordinal" integer DEFAULT NULL::integer, "p_source_type" "public"."resolution_source_type" DEFAULT 'official_result'::"public"."resolution_source_type", "p_source_label" "text" DEFAULT NULL::"text", "p_source_url" "text" DEFAULT NULL::"text", "p_source_excerpt" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."resolve_topic"("p_topic_id" "uuid", "p_resolution_note" "text", "p_resolved_boolean" boolean, "p_resolved_date" "date", "p_resolved_numeric" numeric, "p_resolved_option_id" "uuid", "p_resolved_ordinal" integer, "p_source_type" "public"."resolution_source_type", "p_source_label" "text", "p_source_url" "text", "p_source_excerpt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_poll"("p_space_id" "uuid" DEFAULT NULL::"uuid", "p_topic_id" "uuid" DEFAULT NULL::"uuid", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_visibility" "public"."visibility_level" DEFAULT 'public'::"public"."visibility_level", "p_close_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."rpc_create_poll"("p_space_id" "uuid", "p_topic_id" "uuid", "p_title" "text", "p_description" "text", "p_visibility" "public"."visibility_level", "p_close_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_post"("p_topic_id" "uuid" DEFAULT NULL::"uuid", "p_space_id" "uuid" DEFAULT NULL::"uuid", "p_post_type" "public"."post_type" DEFAULT 'discussion'::"public"."post_type", "p_title" "text" DEFAULT NULL::"text", "p_body_markdown" "text" DEFAULT NULL::"text") RETURNS "public"."post"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."rpc_create_post"("p_topic_id" "uuid", "p_space_id" "uuid", "p_post_type" "public"."post_type", "p_title" "text", "p_body_markdown" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_post_full"("p_title" "text", "p_body" "text" DEFAULT NULL::"text", "p_source_url" "text" DEFAULT NULL::"text", "p_link_preview" "jsonb" DEFAULT NULL::"jsonb", "p_mode" "text" DEFAULT 'post'::"text", "p_poll_question" "text" DEFAULT NULL::"text", "p_poll_deadline_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_poll_options" "jsonb" DEFAULT '[]'::"jsonb", "p_subject_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[], "p_party_tags" "text"[] DEFAULT ARRAY[]::"text"[]) RETURNS TABLE("thread_id" "uuid", "post_item_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_thread_id uuid;
  v_post_item_id uuid;
  v_metadata jsonb;
  v_subject uuid;
  v_slug citext;
  v_post_count integer;
  v_option_text text;
  v_option_idx integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null then
    raise exception 'Title required';
  end if;

  -- Rate limit : 8 posts par 24h par user.
  select count(*) into v_post_count
  from public.thread_post tp
  where tp.created_by = v_user_id
    and tp.created_at >= timezone('utc', now()) - interval '24 hours';

  if v_post_count >= 8 then
    raise exception 'Daily post limit reached' using errcode = 'P0001';
  end if;

  if p_mode = 'poll' then
    if nullif(btrim(coalesce(p_poll_question, '')), '') is null then
      raise exception 'Poll question required';
    end if;
    if jsonb_array_length(coalesce(p_poll_options, '[]'::jsonb)) < 2 then
      raise exception 'At least two poll options required';
    end if;
    if p_poll_deadline_at is null
       or p_poll_deadline_at > timezone('utc', now()) + interval '48 hours' then
      raise exception 'Poll deadline must be set within 48h';
    end if;
  end if;

  v_metadata := jsonb_build_object(
    'is_original_post', true,
    'source_url', p_source_url,
    'link_preview', p_link_preview,
    'post_mode', p_mode
  );
  if p_mode = 'poll' then
    v_metadata := v_metadata || jsonb_build_object(
      'poll', jsonb_build_object(
        'question', p_poll_question,
        'deadline_at', p_poll_deadline_at,
        'option_count', jsonb_array_length(p_poll_options)
      )
    );
  end if;

  v_slug := lower(regexp_replace(
    regexp_replace(
      p_title || '-' || substr(gen_random_uuid()::text, 1, 8),
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '-+', '-', 'g'
  ))::citext;

  -- 1. Topic (thread)
  insert into public.topic(
    slug, title, description, topic_status, visibility, created_by,
    close_at, thread_kind, campaign_cycle, is_sensitive
  )
  values (
    v_slug,
    p_title,
    left(coalesce(p_body, ''), 280),
    'open',
    'public',
    v_user_id,
    timezone('utc', now()) + interval '14 days',
    'issue',
    'presidentielle_2027',
    false
  )
  returning id into v_thread_id;

  -- 2. Thread post (article) — metadata final dès l'insert, pas d'update séparé
  insert into public.thread_post(
    thread_id, type, title, content, metadata, created_by, status, party_tags
  )
  values (
    v_thread_id,
    'article'::public.thread_post_type,
    p_title,
    p_body,
    v_metadata,
    v_user_id,
    'published',
    case
      when array_length(p_party_tags, 1) is not null
      then p_party_tags[1:3]
      else null
    end
  )
  returning id into v_post_item_id;

  -- 3. Subjects (M2M)
  if array_length(p_subject_ids, 1) is not null then
    foreach v_subject in array p_subject_ids loop
      insert into public.thread_post_subject(thread_post_id, subject_id)
      values (v_post_item_id, v_subject)
      on conflict do nothing;
    end loop;
  end if;

  -- 4. Poll + options (ouvert uniquement sur mode='poll')
  if p_mode = 'poll' then
    insert into public.post_poll(post_item_id, question, deadline_at, created_by)
    values (v_post_item_id, btrim(p_poll_question), p_poll_deadline_at, v_user_id);

    for v_option_text in
      select jsonb_array_elements_text(p_poll_options)
    loop
      if nullif(btrim(v_option_text), '') is not null then
        insert into public.post_poll_option(post_item_id, label, sort_order)
        values (v_post_item_id, btrim(v_option_text), v_option_idx);
        v_option_idx := v_option_idx + 1;
      end if;
    end loop;
  end if;

  return query select v_thread_id, v_post_item_id;
end;
$$;


ALTER FUNCTION "public"."rpc_create_post_full"("p_title" "text", "p_body" "text", "p_source_url" "text", "p_link_preview" "jsonb", "p_mode" "text", "p_poll_question" "text", "p_poll_deadline_at" timestamp with time zone, "p_poll_options" "jsonb", "p_subject_ids" "uuid"[], "p_party_tags" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_topic_with_prediction"("p_space_id" "uuid" DEFAULT NULL::"uuid", "p_slug" "text" DEFAULT NULL::"text", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_visibility" "public"."visibility_level" DEFAULT 'public'::"public"."visibility_level", "p_close_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_prediction_type" "public"."prediction_type" DEFAULT 'binary'::"public"."prediction_type", "p_prediction_title" "text" DEFAULT NULL::"text", "p_scoring_method" "public"."prediction_scoring_method" DEFAULT 'exact_match'::"public"."prediction_scoring_method", "p_aggregation_method" "public"."prediction_aggregation_method" DEFAULT 'binary_split'::"public"."prediction_aggregation_method") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."rpc_create_topic_with_prediction"("p_space_id" "uuid", "p_slug" "text", "p_title" "text", "p_description" "text", "p_visibility" "public"."visibility_level", "p_close_at" timestamp with time zone, "p_prediction_type" "public"."prediction_type", "p_prediction_title" "text", "p_scoring_method" "public"."prediction_scoring_method", "p_aggregation_method" "public"."prediction_aggregation_method") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_delete_comment"("p_comment_id" "uuid") RETURNS "public"."post"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_row public.post%rowtype;
  result_row public.post%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_row from public.post where id = p_comment_id;
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

  return result_row;
end;
$$;


ALTER FUNCTION "public"."rpc_delete_comment"("p_comment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_delete_private_political_profile"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare deleted_user_id uuid;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.user_private_political_profile
  where user_id = public.current_user_id()
  returning user_id into deleted_user_id;

  return deleted_user_id is not null;
end;
$$;


ALTER FUNCTION "public"."rpc_delete_private_political_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_delete_thread_post"("p_thread_post_id" "uuid") RETURNS "public"."thread_post"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_row public.thread_post%rowtype;
  result_row public.thread_post%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_row from public.thread_post where id = p_thread_post_id;
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

  return result_row;
end;
$$;


ALTER FUNCTION "public"."rpc_delete_thread_post"("p_thread_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_delete_vote_history"("p_election_slug" "public"."citext") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_deleted int;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  delete from public.profile_vote_history h
  using public.election e
  where h.election_id = e.id
    and h.user_id     = v_user_id
    and e.slug        = p_election_slug;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;


ALTER FUNCTION "public"."rpc_delete_vote_history"("p_election_slug" "public"."citext") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_private_political_profile" (
    "user_id" "uuid" NOT NULL,
    "declared_partisan_term_id" "uuid",
    "declared_ideology_term_id" "uuid",
    "political_interest_level" integer,
    "notes_private" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "profile_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "user_private_political_profile_political_interest_level_check" CHECK ((("political_interest_level" >= 1) AND ("political_interest_level" <= 5)))
);


ALTER TABLE "public"."user_private_political_profile" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_private_political_profile"() RETURNS "public"."user_private_political_profile"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select upp.*
  from public.user_private_political_profile upp
  where upp.user_id = public.current_user_id();
$$;


ALTER FUNCTION "public"."rpc_get_private_political_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_list_vote_history_detailed"() RETURNS TABLE("id" "uuid", "election_id" "uuid", "election_slug" "public"."citext", "election_label" "text", "election_result_id" "uuid", "choice_kind" "public"."vote_choice_kind", "confidence" smallint, "notes" "text", "declared_at" timestamp with time zone, "candidate_name" "text", "list_label" "text", "party_slug" "public"."citext")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    h.id,
    h.election_id,
    e.slug,
    e.label,
    h.election_result_id,
    h.choice_kind,
    h.confidence,
    h.notes,
    h.declared_at,
    r.candidate_name,
    r.list_label,
    r.party_slug
  from public.profile_vote_history h
  join public.election             e on e.id = h.election_id
  left join public.election_result r on r.id = h.election_result_id
  where h.user_id = auth.uid()
  order by e.held_on desc, e.round desc nulls last;
$$;


ALTER FUNCTION "public"."rpc_list_vote_history_detailed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_report_content"("p_target_type" "text", "p_target_id" "uuid", "p_reason_code" "text", "p_reason_detail" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  begin
    perform public.log_audit_event(
      'content',
      p_target_id,
      'report_content',
      jsonb_build_object(
        'target_type', p_target_type,
        'reason_code', p_reason_code,
        'reason_detail', p_reason_detail
      )
    );
  exception
    when undefined_function then
      null;
  end;

  return jsonb_build_object('ok', true);
end;
$$;


ALTER FUNCTION "public"."rpc_report_content"("p_target_type" "text", "p_target_id" "uuid", "p_reason_code" "text", "p_reason_detail" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_update_comment"("p_comment_id" "uuid", "p_body_markdown" "text") RETURNS "public"."post"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

  select * into current_row from public.post where id = p_comment_id;
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

  return result_row;
end;
$$;


ALTER FUNCTION "public"."rpc_update_comment"("p_comment_id" "uuid", "p_body_markdown" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_update_thread_post"("p_thread_post_id" "uuid", "p_title" "text" DEFAULT NULL::"text", "p_content" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."thread_post"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_row public.thread_post%rowtype;
  result_row public.thread_post%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_row from public.thread_post where id = p_thread_post_id;
  if current_row.id is null then
    raise exception 'Thread post not found';
  end if;
  if current_row.created_by <> public.current_user_id() then
    raise exception 'Thread post not owned by current user';
  end if;

  update public.thread_post
  set title = coalesce(p_title, title),
      content = coalesce(p_content, content),
      metadata = case when p_metadata is null then metadata else p_metadata end
  where id = p_thread_post_id
  returning * into result_row;

  return result_row;
end;
$$;


ALTER FUNCTION "public"."rpc_update_thread_post"("p_thread_post_id" "uuid", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_private_political_profile"("p_declared_partisan_term_id" "uuid" DEFAULT NULL::"uuid", "p_declared_ideology_term_id" "uuid" DEFAULT NULL::"uuid", "p_political_interest_level" integer DEFAULT NULL::integer, "p_notes_private" "text" DEFAULT NULL::"text", "p_profile_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."user_private_political_profile"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  result_row public.user_private_political_profile%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_private_political_profile(
    user_id,declared_partisan_term_id,declared_ideology_term_id,political_interest_level,notes_private,profile_payload
  )
  values(public.current_user_id(),p_declared_partisan_term_id,p_declared_ideology_term_id,p_political_interest_level,p_notes_private,coalesce(p_profile_payload, '{}'::jsonb))
  on conflict (user_id) do update
  set declared_partisan_term_id = excluded.declared_partisan_term_id,
      declared_ideology_term_id = excluded.declared_ideology_term_id,
      political_interest_level = excluded.political_interest_level,
      notes_private = excluded.notes_private,
      profile_payload = excluded.profile_payload,
      updated_at = timezone('utc', now())
  returning * into result_row;

  return result_row;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_private_political_profile"("p_declared_partisan_term_id" "uuid", "p_declared_ideology_term_id" "uuid", "p_political_interest_level" integer, "p_notes_private" "text", "p_profile_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_vote_history"("p_election_slug" "public"."citext", "p_election_result_id" "uuid", "p_choice_kind" "public"."vote_choice_kind", "p_confidence" smallint DEFAULT NULL::smallint, "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_election_id uuid;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select id into v_election_id from public.election where slug = p_election_slug;
  if v_election_id is null then
    raise exception 'election introuvable: %', p_election_slug using errcode = '22023';
  end if;

  -- Coherence : si choice = 'vote' alors result requis et doit appartenir au bon scrutin
  if p_choice_kind = 'vote' then
    if p_election_result_id is null then
      raise exception 'election_result_id requis pour un vote' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.election_result
      where id = p_election_result_id and election_id = v_election_id
    ) then
      raise exception 'election_result_id ne correspond pas au scrutin' using errcode = '22023';
    end if;
  end if;

  insert into public.profile_vote_history as h
    (user_id, election_id, election_result_id, choice_kind, confidence, notes, declared_at)
  values
    (v_user_id, v_election_id,
     case when p_choice_kind = 'vote' then p_election_result_id else null end,
     p_choice_kind, p_confidence, p_notes, timezone('utc', now()))
  on conflict (user_id, election_id) do update set
    election_result_id = excluded.election_result_id,
    choice_kind        = excluded.choice_kind,
    confidence         = excluded.confidence,
    notes              = excluded.notes,
    declared_at        = timezone('utc', now())
  returning h.id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_vote_history"("p_election_slug" "public"."citext", "p_election_result_id" "uuid", "p_choice_kind" "public"."vote_choice_kind", "p_confidence" smallint, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."snapshot_prediction_submission"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."snapshot_prediction_submission"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_poll_option" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_item_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."post_poll_option" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_poll_response" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_item_id" "uuid" NOT NULL,
    "option_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "weight" numeric DEFAULT 1 NOT NULL,
    "answered_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "post_poll_response_weight_check" CHECK (("weight" > (0)::numeric))
);


ALTER TABLE "public"."post_poll_response" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_post_poll_summary" WITH ("security_invoker"='true') AS
 WITH "options" AS (
         SELECT "o"."post_item_id",
            "jsonb_agg"("jsonb_build_object"('option_id', "o"."id", 'label', "o"."label", 'sort_order', "o"."sort_order") ORDER BY "o"."sort_order") AS "options_json"
           FROM "public"."post_poll_option" "o"
          WHERE ("o"."is_active" = true)
          GROUP BY "o"."post_item_id"
        ), "option_counts" AS (
         SELECT "o"."post_item_id",
            "o"."id" AS "option_id",
            "o"."label",
            "o"."sort_order",
            ("count"("r"."id"))::integer AS "response_count"
           FROM ("public"."post_poll_option" "o"
             LEFT JOIN "public"."post_poll_response" "r" ON ((("r"."option_id" = "o"."id") AND ("r"."post_item_id" = "o"."post_item_id"))))
          WHERE ("o"."is_active" = true)
          GROUP BY "o"."post_item_id", "o"."id", "o"."label", "o"."sort_order"
        ), "poll_totals" AS (
         SELECT "option_counts"."post_item_id",
            ("sum"("option_counts"."response_count"))::integer AS "sample_size"
           FROM "option_counts"
          GROUP BY "option_counts"."post_item_id"
        ), "counts_rolled" AS (
         SELECT "oc"."post_item_id",
            "jsonb_agg"("jsonb_build_object"('option_id', "oc"."option_id", 'option_label', "oc"."label", 'sort_order', "oc"."sort_order", 'response_count', "oc"."response_count", 'weighted_count', "oc"."response_count", 'share',
                CASE
                    WHEN (COALESCE("pt_1"."sample_size", 0) = 0) THEN (0)::numeric
                    ELSE "round"(((("oc"."response_count")::numeric * (100)::numeric) / ("pt_1"."sample_size")::numeric), 2)
                END) ORDER BY "oc"."sort_order") AS "results"
           FROM ("option_counts" "oc"
             LEFT JOIN "poll_totals" "pt_1" ON (("pt_1"."post_item_id" = "oc"."post_item_id")))
          GROUP BY "oc"."post_item_id"
        ), "my_votes" AS (
         SELECT "r"."post_item_id",
            "r"."option_id" AS "selected_option_id"
           FROM "public"."post_poll_response" "r"
          WHERE ("r"."user_id" = "auth"."uid"())
        )
 SELECT "pp"."post_item_id",
    "pp"."question",
    "pp"."deadline_at",
        CASE
            WHEN ("pp"."deadline_at" <= "timezone"('utc'::"text", "now"())) THEN 'closed'::"text"
            ELSE "pp"."poll_status"
        END AS "poll_status",
    COALESCE("pt"."sample_size", 0) AS "sample_size",
    (COALESCE("pt"."sample_size", 0))::numeric AS "effective_sample_size",
    (
        CASE
            WHEN (COALESCE("pt"."sample_size", 0) > 0) THEN 100
            ELSE 0
        END)::numeric AS "representativity_score",
    (0)::numeric AS "coverage_score",
    (0)::numeric AS "distance_score",
    (0)::numeric AS "stability_score",
    (0)::numeric AS "anti_brigading_score",
    COALESCE("cr"."results", '[]'::"jsonb") AS "raw_results",
    COALESCE("cr"."results", '[]'::"jsonb") AS "corrected_results",
    COALESCE("opt"."options_json", '[]'::"jsonb") AS "options",
    "mv"."selected_option_id",
    "tp"."thread_id" AS "post_id",
    "top"."slug" AS "post_slug",
    "top"."title" AS "post_title"
   FROM (((((("public"."post_poll" "pp"
     JOIN "public"."thread_post" "tp" ON (("tp"."id" = "pp"."post_item_id")))
     JOIN "public"."topic" "top" ON (("top"."id" = "tp"."thread_id")))
     LEFT JOIN "options" "opt" ON (("opt"."post_item_id" = "pp"."post_item_id")))
     LEFT JOIN "counts_rolled" "cr" ON (("cr"."post_item_id" = "pp"."post_item_id")))
     LEFT JOIN "poll_totals" "pt" ON (("pt"."post_item_id" = "pp"."post_item_id")))
     LEFT JOIN "my_votes" "mv" ON (("mv"."post_item_id" = "pp"."post_item_id")))
  WHERE "public"."can_read_topic"("top".*);


ALTER VIEW "public"."v_post_poll_summary" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_post_poll_vote"("p_post_item_id" "uuid", "p_option_id" "uuid") RETURNS SETOF "public"."v_post_poll_summary"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  poll_row public.post_poll%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- Validation poll (existe + ouvert)
  select * into poll_row from public.post_poll where post_item_id = p_post_item_id;
  if poll_row.post_item_id is null then
    raise exception 'Poll not found';
  end if;
  if poll_row.poll_status <> 'open' or poll_row.deadline_at <= timezone('utc', now()) then
    raise exception 'Poll is closed';
  end if;

  -- Validation option appartient au poll et active
  if not exists (
    select 1 from public.post_poll_option o
    where o.id = p_option_id
      and o.post_item_id = p_post_item_id
      and o.is_active = true
  ) then
    raise exception 'Option not found for this poll';
  end if;

  -- Upsert de la réponse (1 vote par user par poll)
  insert into public.post_poll_response(post_item_id, option_id, user_id)
  values (p_post_item_id, p_option_id, auth.uid())
  on conflict (post_item_id, user_id) do update
    set option_id = excluded.option_id,
        answered_at = timezone('utc', now());

  -- Retourne directement le résumé pour éviter un refetch côté client
  return query
    select * from public.v_post_poll_summary v
    where v.post_item_id = p_post_item_id;
end;
$$;


ALTER FUNCTION "public"."submit_post_poll_vote"("p_post_item_id" "uuid", "p_option_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_profile_vote_history_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."tg_profile_vote_history_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_prediction_submission"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."validate_prediction_submission"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."visibility_rank"("v" "public"."visibility_level") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select case v
    when 'public' then 1
    when 'authenticated' then 2
    when 'private' then 3
    when 'moderators_only' then 4
  end;
$$;


ALTER FUNCTION "public"."visibility_rank"("v" "public"."visibility_level") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_profile" (
    "user_id" "uuid" NOT NULL,
    "username" "public"."citext",
    "display_name" "text" NOT NULL,
    "bio" "text",
    "avatar_url" "text",
    "public_territory_id" "uuid",
    "profile_status" "public"."profile_status" DEFAULT 'active'::"public"."profile_status" NOT NULL,
    "is_public_profile_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_seen_at" timestamp with time zone
);


ALTER TABLE "public"."app_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussion_prompts" (
    "id" bigint NOT NULL,
    "topic_id" bigint NOT NULL,
    "prompt" "text" NOT NULL,
    "prompt_type" "text" NOT NULL,
    "tone" "text" NOT NULL
);


ALTER TABLE "public"."discussion_prompts" OWNER TO "postgres";


ALTER TABLE "public"."discussion_prompts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."discussion_prompts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."election" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "public"."citext" NOT NULL,
    "type" "public"."election_type" NOT NULL,
    "year" integer NOT NULL,
    "round" smallint,
    "held_on" "date" NOT NULL,
    "label" "text" NOT NULL,
    "source_url" "text",
    "inscrits" bigint,
    "votants" bigint,
    "exprimes" bigint,
    "blancs" bigint,
    "nuls" bigint,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."election" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."election_result" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "election_id" "uuid" NOT NULL,
    "rank" smallint,
    "candidate_name" "text",
    "list_label" "text",
    "party_slug" "public"."citext",
    "nuance" "text",
    "votes" bigint,
    "pct_exprimes" numeric(5,2),
    "pct_inscrits" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."election_result" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_outlet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "public"."citext" NOT NULL,
    "name" "text" NOT NULL,
    "segment" "text" NOT NULL,
    "direction" "text",
    "journalistes_phares" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."media_outlet" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."political_entity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."political_entity_type" NOT NULL,
    "slug" "public"."citext" NOT NULL,
    "name" "text" NOT NULL,
    "parent_entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."political_entity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_revision" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "editor_user_id" "uuid" NOT NULL,
    "body_markdown" "text" NOT NULL,
    "edited_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "edit_reason" "text"
);


ALTER TABLE "public"."post_revision" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prediction_questions_editorial" (
    "id" bigint NOT NULL,
    "topic_id" bigint NOT NULL,
    "question" "text" NOT NULL,
    "prediction_type" "text" NOT NULL,
    "resolution_criteria" "text" NOT NULL,
    "resolution_source_url" "text" NOT NULL,
    "closes_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."prediction_questions_editorial" OWNER TO "postgres";


ALTER TABLE "public"."prediction_questions_editorial" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."prediction_questions_editorial_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profile_vote_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "election_id" "uuid" NOT NULL,
    "election_result_id" "uuid",
    "choice_kind" "public"."vote_choice_kind" DEFAULT 'vote'::"public"."vote_choice_kind" NOT NULL,
    "confidence" smallint,
    "notes" "text",
    "declared_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "profile_vote_history_confidence_check" CHECK ((("confidence" IS NULL) OR (("confidence" >= 1) AND ("confidence" <= 5)))),
    CONSTRAINT "vote_needs_result" CHECK ((("choice_kind" <> 'vote'::"public"."vote_choice_kind") OR ("election_result_id" IS NOT NULL)))
);


ALTER TABLE "public"."profile_vote_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subject" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "public"."citext" NOT NULL,
    "name" "text" NOT NULL,
    "emoji" "text",
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."subject" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subthemes" (
    "id" bigint NOT NULL,
    "theme_id" bigint NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "priority_rank" integer DEFAULT 100 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subthemes" OWNER TO "postgres";


ALTER TABLE "public"."subthemes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."subthemes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."themes" (
    "id" bigint NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "priority_rank" integer DEFAULT 100 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."themes" OWNER TO "postgres";


ALTER TABLE "public"."themes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."themes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."thread_post_subject" (
    "thread_post_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL
);


ALTER TABLE "public"."thread_post_subject" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_resolution" (
    "topic_id" "uuid" NOT NULL,
    "resolution_status" "public"."resolution_status" DEFAULT 'pending'::"public"."resolution_status" NOT NULL,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "resolution_note" "text",
    "resolved_boolean" boolean,
    "resolved_date" "date",
    "resolved_numeric" numeric,
    "resolved_option_id" "uuid",
    "resolved_ordinal" integer,
    "void_reason" "text"
);


ALTER TABLE "public"."topic_resolution" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_resolution_source" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic_id" "uuid" NOT NULL,
    "source_type" "public"."resolution_source_type" NOT NULL,
    "source_label" "text" NOT NULL,
    "source_url" "text",
    "source_published_at" timestamp with time zone,
    "quoted_excerpt" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."topic_resolution_source" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_sources" (
    "id" bigint NOT NULL,
    "topic_id" bigint NOT NULL,
    "source_type" "text" NOT NULL,
    "source_name" "text" NOT NULL,
    "source_title" "text" NOT NULL,
    "source_url" "text" NOT NULL,
    "publication_date" "date",
    "reliability_score" numeric(4,2) NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."topic_sources" OWNER TO "postgres";


ALTER TABLE "public"."topic_sources" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."topic_sources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."topic_tags" (
    "id" bigint NOT NULL,
    "topic_id" bigint NOT NULL,
    "tag" "text" NOT NULL
);


ALTER TABLE "public"."topic_tags" OWNER TO "postgres";


ALTER TABLE "public"."topic_tags" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."topic_tags_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."topic_territories" (
    "id" bigint NOT NULL,
    "topic_id" bigint NOT NULL,
    "territory_level" "text" NOT NULL,
    "territory_name" "text" NOT NULL,
    "country_code" "text",
    "region_name" "text",
    "department_name" "text",
    "city_name" "text",
    "is_primary" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."topic_territories" OWNER TO "postgres";


ALTER TABLE "public"."topic_territories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."topic_territories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."topics_editorial" (
    "id" bigint NOT NULL,
    "subtheme_id" bigint NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "topic_type" "text" NOT NULL,
    "geographic_scope" "text" NOT NULL,
    "territory_name" "text",
    "country_code" "text",
    "region_name" "text",
    "city_name" "text",
    "status" "text" NOT NULL,
    "salience_score" integer NOT NULL,
    "concreteness_score" integer NOT NULL,
    "controversy_score" integer NOT NULL,
    "editorial_priority" integer NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "is_time_sensitive" boolean DEFAULT false NOT NULL,
    "is_prediction_enabled" boolean DEFAULT false NOT NULL,
    "source_confidence" numeric(4,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."topics_editorial" OWNER TO "postgres";


ALTER TABLE "public"."topics_editorial" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."topics_editorial_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."user_visibility_settings" AS
 SELECT "user_id",
    'public'::"text" AS "display_name_visibility",
    'public'::"text" AS "bio_visibility",
    'private'::"text" AS "vote_history_visibility"
   FROM "public"."app_profile" "ap";


ALTER VIEW "public"."user_visibility_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_thread_detail" AS
 WITH "thread_post_rollup" AS (
         SELECT "tp"."thread_id",
            ("count"(*))::integer AS "thread_post_count",
            ("count"(*) FILTER (WHERE ("tp"."type" = 'article'::"public"."thread_post_type")))::integer AS "article_post_count",
            "max"("tp"."created_at") AS "latest_thread_post_at"
           FROM "public"."thread_post" "tp"
          WHERE ("tp"."status" = 'published'::"public"."thread_post_status")
          GROUP BY "tp"."thread_id"
        )
 SELECT "t"."id",
    "t"."space_id",
    "t"."slug",
    "t"."title",
    "t"."description",
    "t"."topic_status",
    "public"."effective_topic_visibility"("t".*) AS "effective_visibility",
    "t"."open_at",
    "t"."close_at",
    "t"."created_at",
    "t"."entity_id",
    "pe"."slug" AS "entity_slug",
    "pe"."name" AS "entity_name",
    NULL::"public"."citext" AS "space_slug",
    NULL::"text" AS "space_name",
    ("pe"."slug")::"text" AS "space_role",
    COALESCE("tpr"."thread_post_count", 0) AS "visible_post_count",
    0 AS "active_prediction_count",
    COALESCE("tpr"."thread_post_count", 0) AS "thread_post_count",
    "tpr"."latest_thread_post_at",
    "round"(((COALESCE("tpr"."thread_post_count", 0))::numeric * 0.05), 6) AS "thread_score",
    'recent_activity'::"text" AS "feed_reason_code",
    'Remonte car la discussion est active.'::"text" AS "feed_reason_label",
        CASE
            WHEN ("t"."topic_status" = 'resolved'::"public"."topic_status") THEN 'resolved'::"text"
            WHEN ("t"."topic_status" = 'archived'::"public"."topic_status") THEN 'archived'::"text"
            WHEN ("t"."topic_status" = 'locked'::"public"."topic_status") THEN 'locked'::"text"
            ELSE 'open'::"text"
        END AS "derived_lifecycle_state",
    false AS "is_sensitive",
    ("pe"."slug")::"text" AS "primary_taxonomy_slug",
        CASE
            WHEN ("pe"."slug" OPERATOR("public".=) ANY (ARRAY['lfi'::"public"."citext", 'lfi-nfp'::"public"."citext", 'pcf'::"public"."citext", 'gdr'::"public"."citext", 'ges'::"public"."citext", 'rev'::"public"."citext", 'peps'::"public"."citext"])) THEN 'Gauche radicale a gauche'::"text"
            WHEN ("pe"."slug" OPERATOR("public".=) ANY (ARRAY['ps'::"public"."citext", 'eelv'::"public"."citext", 'prg'::"public"."citext", 'dvg'::"public"."citext", 'soc'::"public"."citext", 'ecos'::"public"."citext"])) THEN 'Gauche a centre gauche'::"text"
            WHEN ("pe"."slug" OPERATOR("public".=) ANY (ARRAY['re'::"public"."citext", 'modem'::"public"."citext", 'prv'::"public"."citext", 'dvc'::"public"."citext", 'hor'::"public"."citext", 'epr'::"public"."citext", 'dem'::"public"."citext"])) THEN 'Centre gauche a centre droit'::"text"
            WHEN ("pe"."slug" OPERATOR("public".=) ANY (ARRAY['lr'::"public"."citext", 'udi'::"public"."citext", 'dvd'::"public"."citext", 'dr'::"public"."citext", 'udr'::"public"."citext"])) THEN 'Centre droit a droite'::"text"
            WHEN ("pe"."slug" OPERATOR("public".=) ANY (ARRAY['rn'::"public"."citext", 'rec'::"public"."citext", 'dlf'::"public"."citext", 'laf'::"public"."citext", 'idl'::"public"."citext"])) THEN 'Droite a extreme droite'::"text"
            ELSE 'Forum'::"text"
        END AS "primary_taxonomy_label"
   FROM (("public"."topic" "t"
     LEFT JOIN "thread_post_rollup" "tpr" ON (("tpr"."thread_id" = "t"."id")))
     LEFT JOIN "public"."political_entity" "pe" ON (("pe"."id" = "t"."entity_id")))
  WHERE (("t"."topic_status" = ANY (ARRAY['open'::"public"."topic_status", 'locked'::"public"."topic_status", 'resolved'::"public"."topic_status", 'archived'::"public"."topic_status"])) AND ("public"."effective_topic_visibility"("t".*) = 'public'::"public"."visibility_level"));


ALTER VIEW "public"."v_thread_detail" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_feed_global" AS
 SELECT "id" AS "topic_id",
    "slug" AS "topic_slug",
    "title" AS "topic_title",
    "description" AS "topic_description",
    "topic_status",
    "derived_lifecycle_state",
    "effective_visibility" AS "visibility",
    "is_sensitive",
    "space_id",
    "space_slug",
    "space_name",
    "primary_taxonomy_slug",
    "primary_taxonomy_label",
    NULL::"public"."prediction_type" AS "prediction_type",
    NULL::"text" AS "prediction_question_title",
    '{}'::"jsonb" AS "aggregate_payload",
    "jsonb_build_object"('active_prediction_count', 0, 'visible_post_count', "visible_post_count", 'time_label', "concat"('Cloture le ', "to_char"("close_at", 'YYYY-MM-DD'::"text"))) AS "metrics_payload",
    "jsonb_build_object"('excerpt_type', 'thread', 'excerpt_title', "title", 'excerpt_text', COALESCE("description", 'Discussion politique ouverte.'::"text"), 'excerpt_created_at', "latest_thread_post_at") AS "discussion_payload",
    NULL::"jsonb" AS "card_payload",
    '{}'::"jsonb" AS "resolution_payload",
    "latest_thread_post_at" AS "last_activity_at",
    "open_at",
    "close_at",
    NULL::timestamp with time zone AS "resolve_deadline_at",
    NULL::timestamp with time zone AS "resolved_at",
    "visible_post_count",
    0 AS "active_prediction_count",
    "thread_score" AS "activity_score_raw",
    (0)::numeric AS "freshness_score_raw",
    (0)::numeric AS "participation_score_raw",
    (0)::numeric AS "resolution_proximity_score_raw",
    (0)::numeric AS "editorial_priority_score_raw",
    (0)::numeric AS "shift_score_raw",
    "thread_score" AS "editorial_feed_score",
    "feed_reason_code",
    "feed_reason_label",
    ("row_number"() OVER (ORDER BY "thread_score" DESC, "latest_thread_post_at" DESC NULLS LAST, "created_at" DESC))::integer AS "editorial_feed_rank",
    '{}'::"jsonb" AS "topic_card_payload",
    "entity_id",
    "entity_slug",
    "entity_name",
    "space_role",
    "thread_post_count",
    "latest_thread_post_at",
    "thread_score"
   FROM "public"."v_thread_detail" "td";


ALTER VIEW "public"."v_feed_global" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_post_comments" AS
 WITH "reaction_rollup" AS (
         SELECT "r"."target_id" AS "comment_id",
            (COALESCE("sum"(
                CASE
                    WHEN ("r"."reaction_type" = 'upvote'::"public"."reaction_type") THEN "r"."weight"
                    ELSE (0)::numeric
                END), (0)::numeric))::integer AS "gauche_count",
            (COALESCE("sum"(
                CASE
                    WHEN ("r"."reaction_type" = 'downvote'::"public"."reaction_type") THEN "r"."weight"
                    ELSE (0)::numeric
                END), (0)::numeric))::integer AS "droite_count"
           FROM "public"."reaction" "r"
          WHERE ("r"."target_type" = 'comment'::"public"."reaction_target_type")
          GROUP BY "r"."target_id"
        )
 SELECT "p"."id",
    "p"."topic_id" AS "thread_id",
    "p"."thread_post_id",
    "p"."parent_post_id",
    "p"."depth",
    "p"."author_user_id",
    "ap"."username",
    "ap"."display_name",
    "p"."title",
    "p"."body_markdown",
    "p"."created_at",
    "p"."updated_at",
    "p"."post_status",
    COALESCE("rr"."gauche_count", 0) AS "gauche_count",
    COALESCE("rr"."droite_count", 0) AS "droite_count",
    (COALESCE("rr"."gauche_count", 0) + COALESCE("rr"."droite_count", 0)) AS "total_reactions",
    COALESCE("rr"."gauche_count", 0) AS "upvote_weight",
    COALESCE("rr"."droite_count", 0) AS "downvote_weight",
    (COALESCE("rr"."gauche_count", 0) + COALESCE("rr"."droite_count", 0)) AS "comment_score"
   FROM ((("public"."post" "p"
     JOIN "public"."topic" "t" ON (("t"."id" = "p"."topic_id")))
     JOIN "public"."app_profile" "ap" ON (("ap"."user_id" = "p"."author_user_id")))
     LEFT JOIN "reaction_rollup" "rr" ON (("rr"."comment_id" = "p"."id")))
  WHERE (("p"."post_status" = 'visible'::"public"."post_status") AND ("p"."thread_post_id" IS NOT NULL) AND ("public"."effective_topic_visibility"("t".*) = 'public'::"public"."visibility_level"));


ALTER VIEW "public"."v_post_comments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_thread_posts" AS
 WITH "reaction_rollup" AS (
         SELECT "r"."target_id" AS "thread_post_id",
            (COALESCE("sum"(
                CASE
                    WHEN ("r"."reaction_type" = 'upvote'::"public"."reaction_type") THEN "r"."weight"
                    ELSE (0)::numeric
                END), (0)::numeric))::integer AS "gauche_count",
            (COALESCE("sum"(
                CASE
                    WHEN ("r"."reaction_type" = 'downvote'::"public"."reaction_type") THEN "r"."weight"
                    ELSE (0)::numeric
                END), (0)::numeric))::integer AS "droite_count"
           FROM "public"."reaction" "r"
          WHERE ("r"."target_type" = 'thread_post'::"public"."reaction_target_type")
          GROUP BY "r"."target_id"
        ), "comment_rollup" AS (
         SELECT "p"."thread_post_id",
            ("count"(*) FILTER (WHERE ("p"."post_status" = 'visible'::"public"."post_status")))::integer AS "comment_count"
           FROM "public"."post" "p"
          WHERE ("p"."thread_post_id" IS NOT NULL)
          GROUP BY "p"."thread_post_id"
        )
 SELECT "tp"."id",
    "tp"."thread_id",
    "tp"."type",
    "tp"."title",
    "tp"."content",
    "tp"."created_by",
    "ap"."username",
    "ap"."display_name",
    "tp"."created_at",
    "tp"."updated_at",
    "tp"."status",
    COALESCE("rr"."gauche_count", 0) AS "gauche_count",
    COALESCE("rr"."droite_count", 0) AS "droite_count",
    (COALESCE("rr"."gauche_count", 0) + COALESCE("rr"."droite_count", 0)) AS "total_reactions",
    COALESCE("rr"."gauche_count", 0) AS "upvote_weight",
    COALESCE("rr"."droite_count", 0) AS "downvote_weight",
    (COALESCE("rr"."gauche_count", 0) - COALESCE("rr"."droite_count", 0)) AS "weighted_votes",
    COALESCE("cr"."comment_count", 0) AS "comment_count"
   FROM (((("public"."thread_post" "tp"
     JOIN "public"."topic" "t" ON (("t"."id" = "tp"."thread_id")))
     JOIN "public"."app_profile" "ap" ON (("ap"."user_id" = "tp"."created_by")))
     LEFT JOIN "reaction_rollup" "rr" ON (("rr"."thread_post_id" = "tp"."id")))
     LEFT JOIN "comment_rollup" "cr" ON (("cr"."thread_post_id" = "tp"."id")))
  WHERE (("tp"."status" = 'published'::"public"."thread_post_status") AND ("public"."effective_topic_visibility"("t".*) = 'public'::"public"."visibility_level"));


ALTER VIEW "public"."v_thread_posts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_profile"
    ADD CONSTRAINT "app_profile_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."app_profile"
    ADD CONSTRAINT "app_profile_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."discussion_prompts"
    ADD CONSTRAINT "discussion_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."election"
    ADD CONSTRAINT "election_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."election_result"
    ADD CONSTRAINT "election_result_election_id_rank_key" UNIQUE ("election_id", "rank");



ALTER TABLE ONLY "public"."election_result"
    ADD CONSTRAINT "election_result_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."election"
    ADD CONSTRAINT "election_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."media_outlet"
    ADD CONSTRAINT "media_outlet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_outlet"
    ADD CONSTRAINT "media_outlet_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."political_entity"
    ADD CONSTRAINT "political_entity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."political_entity"
    ADD CONSTRAINT "political_entity_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."post"
    ADD CONSTRAINT "post_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_poll_option"
    ADD CONSTRAINT "post_poll_option_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_poll_option"
    ADD CONSTRAINT "post_poll_option_unique_sort" UNIQUE ("post_item_id", "sort_order");



ALTER TABLE ONLY "public"."post_poll"
    ADD CONSTRAINT "post_poll_pkey" PRIMARY KEY ("post_item_id");



ALTER TABLE ONLY "public"."post_poll_response"
    ADD CONSTRAINT "post_poll_response_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_poll_response"
    ADD CONSTRAINT "post_poll_response_unique_user" UNIQUE ("post_item_id", "user_id");



ALTER TABLE ONLY "public"."post_revision"
    ADD CONSTRAINT "post_revision_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prediction_questions_editorial"
    ADD CONSTRAINT "prediction_questions_editorial_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_vote_history"
    ADD CONSTRAINT "profile_vote_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_vote_history"
    ADD CONSTRAINT "profile_vote_history_user_id_election_id_key" UNIQUE ("user_id", "election_id");



ALTER TABLE ONLY "public"."reaction"
    ADD CONSTRAINT "reaction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reaction"
    ADD CONSTRAINT "reaction_target_type_target_id_user_id_key" UNIQUE ("target_type", "target_id", "user_id");



ALTER TABLE ONLY "public"."subject"
    ADD CONSTRAINT "subject_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject"
    ADD CONSTRAINT "subject_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."subthemes"
    ADD CONSTRAINT "subthemes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subthemes"
    ADD CONSTRAINT "subthemes_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."thread_post"
    ADD CONSTRAINT "thread_post_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."thread_post_subject"
    ADD CONSTRAINT "thread_post_subject_pkey" PRIMARY KEY ("thread_post_id", "subject_id");



ALTER TABLE ONLY "public"."topic"
    ADD CONSTRAINT "topic_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_resolution"
    ADD CONSTRAINT "topic_resolution_pkey" PRIMARY KEY ("topic_id");



ALTER TABLE ONLY "public"."topic_resolution_source"
    ADD CONSTRAINT "topic_resolution_source_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic"
    ADD CONSTRAINT "topic_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."topic_sources"
    ADD CONSTRAINT "topic_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_tags"
    ADD CONSTRAINT "topic_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_territories"
    ADD CONSTRAINT "topic_territories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics_editorial"
    ADD CONSTRAINT "topics_editorial_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics_editorial"
    ADD CONSTRAINT "topics_editorial_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_private_political_profile"
    ADD CONSTRAINT "user_private_political_profile_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "app_profile_public_territory_id_idx" ON "public"."app_profile" USING "btree" ("public_territory_id");



CREATE INDEX "election_result_election_idx" ON "public"."election_result" USING "btree" ("election_id");



CREATE INDEX "election_result_party_idx" ON "public"."election_result" USING "btree" ("party_slug");



CREATE INDEX "election_type_year_idx" ON "public"."election" USING "btree" ("type", "year");



CREATE INDEX "idx_discussion_prompts_topic_id" ON "public"."discussion_prompts" USING "btree" ("topic_id");



CREATE INDEX "idx_post_parent_post_id" ON "public"."post" USING "btree" ("parent_post_id");



CREATE INDEX "idx_post_thread_post_id" ON "public"."post" USING "btree" ("thread_post_id");



CREATE INDEX "idx_prediction_questions_editorial_topic_id" ON "public"."prediction_questions_editorial" USING "btree" ("topic_id");



CREATE INDEX "idx_reaction_target" ON "public"."reaction" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_subthemes_theme_id" ON "public"."subthemes" USING "btree" ("theme_id");



CREATE INDEX "idx_thread_post_created_at" ON "public"."thread_post" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_thread_post_entity_id" ON "public"."thread_post" USING "btree" ("entity_id");



CREATE INDEX "idx_thread_post_thread_id" ON "public"."thread_post" USING "btree" ("thread_id");



CREATE INDEX "idx_topic_entity_id" ON "public"."topic" USING "btree" ("entity_id");



CREATE INDEX "idx_topic_sources_topic_id" ON "public"."topic_sources" USING "btree" ("topic_id");



CREATE INDEX "idx_topic_tags_tag" ON "public"."topic_tags" USING "btree" ("tag");



CREATE INDEX "idx_topic_tags_topic_id" ON "public"."topic_tags" USING "btree" ("topic_id");



CREATE INDEX "idx_topic_territories_name" ON "public"."topic_territories" USING "btree" ("territory_name");



CREATE INDEX "idx_topic_territories_topic_id" ON "public"."topic_territories" USING "btree" ("topic_id");



CREATE INDEX "idx_topics_editorial_priority" ON "public"."topics_editorial" USING "btree" ("editorial_priority" DESC);



CREATE INDEX "idx_topics_editorial_scope" ON "public"."topics_editorial" USING "btree" ("geographic_scope");



CREATE INDEX "idx_topics_editorial_subtheme_id" ON "public"."topics_editorial" USING "btree" ("subtheme_id");



CREATE INDEX "media_outlet_segment_idx" ON "public"."media_outlet" USING "btree" ("segment") WHERE "is_active";



CREATE INDEX "post_author_status_idx" ON "public"."post" USING "btree" ("author_user_id", "post_status");



CREATE INDEX "post_poll_deadline_idx" ON "public"."post_poll" USING "btree" ("deadline_at");



CREATE INDEX "post_poll_option_post_item_idx" ON "public"."post_poll_option" USING "btree" ("post_item_id");



CREATE INDEX "post_poll_response_post_item_idx" ON "public"."post_poll_response" USING "btree" ("post_item_id");



CREATE INDEX "post_poll_response_user_idx" ON "public"."post_poll_response" USING "btree" ("user_id");



CREATE INDEX "post_space_id_idx" ON "public"."post" USING "btree" ("space_id");



CREATE INDEX "post_topic_id_idx" ON "public"."post" USING "btree" ("topic_id");



CREATE INDEX "profile_vote_history_election_idx" ON "public"."profile_vote_history" USING "btree" ("election_id");



CREATE INDEX "profile_vote_history_user_idx" ON "public"."profile_vote_history" USING "btree" ("user_id");



CREATE INDEX "subject_slug_idx" ON "public"."subject" USING "btree" ("slug") WHERE "is_active";



CREATE INDEX "subject_sort_idx" ON "public"."subject" USING "btree" ("sort_order") WHERE "is_active";



CREATE INDEX "thread_post_subject_subject_idx" ON "public"."thread_post_subject" USING "btree" ("subject_id");



CREATE INDEX "topic_created_by_idx" ON "public"."topic" USING "btree" ("created_by");



CREATE INDEX "topic_space_id_idx" ON "public"."topic" USING "btree" ("space_id");



CREATE INDEX "topic_status_visibility_idx" ON "public"."topic" USING "btree" ("topic_status", "visibility");



CREATE OR REPLACE TRIGGER "app_profile_touch_updated_at" BEFORE UPDATE ON "public"."app_profile" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "capture_post_revision_before_update" BEFORE UPDATE ON "public"."post" FOR EACH ROW EXECUTE FUNCTION "public"."capture_post_revision"();



CREATE OR REPLACE TRIGGER "post_poll_touch_updated_at" BEFORE UPDATE ON "public"."post_poll" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "post_touch_updated_at" BEFORE UPDATE ON "public"."post" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "private_profile_touch_updated_at" BEFORE UPDATE ON "public"."user_private_political_profile" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "tg_profile_vote_history_updated_at" BEFORE UPDATE ON "public"."profile_vote_history" FOR EACH ROW EXECUTE FUNCTION "public"."tg_profile_vote_history_updated_at"();



CREATE OR REPLACE TRIGGER "topic_touch_updated_at" BEFORE UPDATE ON "public"."topic" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



ALTER TABLE ONLY "public"."app_profile"
    ADD CONSTRAINT "app_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_prompts"
    ADD CONSTRAINT "discussion_prompts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics_editorial"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."election_result"
    ADD CONSTRAINT "election_result_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."election"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."political_entity"
    ADD CONSTRAINT "political_entity_parent_entity_id_fkey" FOREIGN KEY ("parent_entity_id") REFERENCES "public"."political_entity"("id");



ALTER TABLE ONLY "public"."post"
    ADD CONSTRAINT "post_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "public"."app_profile"("user_id");



ALTER TABLE ONLY "public"."post"
    ADD CONSTRAINT "post_parent_post_id_fkey" FOREIGN KEY ("parent_post_id") REFERENCES "public"."post"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."post_poll"
    ADD CONSTRAINT "post_poll_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."app_profile"("user_id");



ALTER TABLE ONLY "public"."post_poll_option"
    ADD CONSTRAINT "post_poll_option_post_item_id_fkey" FOREIGN KEY ("post_item_id") REFERENCES "public"."post_poll"("post_item_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_poll"
    ADD CONSTRAINT "post_poll_post_item_id_fkey" FOREIGN KEY ("post_item_id") REFERENCES "public"."thread_post"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_poll_response"
    ADD CONSTRAINT "post_poll_response_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."post_poll_option"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."post_poll_response"
    ADD CONSTRAINT "post_poll_response_post_item_id_fkey" FOREIGN KEY ("post_item_id") REFERENCES "public"."post_poll"("post_item_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_poll_response"
    ADD CONSTRAINT "post_poll_response_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_profile"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_revision"
    ADD CONSTRAINT "post_revision_editor_user_id_fkey" FOREIGN KEY ("editor_user_id") REFERENCES "public"."app_profile"("user_id");



ALTER TABLE ONLY "public"."post_revision"
    ADD CONSTRAINT "post_revision_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post"
    ADD CONSTRAINT "post_thread_post_id_fkey" FOREIGN KEY ("thread_post_id") REFERENCES "public"."thread_post"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."post"
    ADD CONSTRAINT "post_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id");



ALTER TABLE ONLY "public"."prediction_questions_editorial"
    ADD CONSTRAINT "prediction_questions_editorial_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics_editorial"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_vote_history"
    ADD CONSTRAINT "profile_vote_history_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."election"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_vote_history"
    ADD CONSTRAINT "profile_vote_history_election_result_id_fkey" FOREIGN KEY ("election_result_id") REFERENCES "public"."election_result"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profile_vote_history"
    ADD CONSTRAINT "profile_vote_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reaction"
    ADD CONSTRAINT "reaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_profile"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subthemes"
    ADD CONSTRAINT "subthemes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."thread_post"
    ADD CONSTRAINT "thread_post_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."app_profile"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."thread_post"
    ADD CONSTRAINT "thread_post_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."political_entity"("id");



ALTER TABLE ONLY "public"."thread_post_subject"
    ADD CONSTRAINT "thread_post_subject_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."thread_post_subject"
    ADD CONSTRAINT "thread_post_subject_thread_post_id_fkey" FOREIGN KEY ("thread_post_id") REFERENCES "public"."thread_post"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."thread_post"
    ADD CONSTRAINT "thread_post_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."topic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic"
    ADD CONSTRAINT "topic_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."app_profile"("user_id");



ALTER TABLE ONLY "public"."topic"
    ADD CONSTRAINT "topic_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."political_entity"("id");



ALTER TABLE ONLY "public"."topic_resolution"
    ADD CONSTRAINT "topic_resolution_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."app_profile"("user_id");



ALTER TABLE ONLY "public"."topic_resolution_source"
    ADD CONSTRAINT "topic_resolution_source_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."app_profile"("user_id");



ALTER TABLE ONLY "public"."topic_resolution_source"
    ADD CONSTRAINT "topic_resolution_source_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_resolution"
    ADD CONSTRAINT "topic_resolution_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_sources"
    ADD CONSTRAINT "topic_sources_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics_editorial"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_tags"
    ADD CONSTRAINT "topic_tags_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics_editorial"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_territories"
    ADD CONSTRAINT "topic_territories_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics_editorial"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topics_editorial"
    ADD CONSTRAINT "topics_editorial_subtheme_id_fkey" FOREIGN KEY ("subtheme_id") REFERENCES "public"."subthemes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_private_political_profile"
    ADD CONSTRAINT "user_private_political_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_profile"("user_id") ON DELETE CASCADE;



ALTER TABLE "public"."app_profile" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_profile_owner_select" ON "public"."app_profile" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "app_profile_owner_update" ON "public"."app_profile" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."discussion_prompts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discussion_prompts_read" ON "public"."discussion_prompts" FOR SELECT USING (true);



ALTER TABLE "public"."election" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "election_public_read" ON "public"."election" FOR SELECT USING (true);



ALTER TABLE "public"."election_result" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "election_result_public_read" ON "public"."election_result" FOR SELECT USING (true);



ALTER TABLE "public"."media_outlet" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_outlet_public_read" ON "public"."media_outlet" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."political_entity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "political_entity_public_read" ON "public"."political_entity" FOR SELECT USING (true);



ALTER TABLE "public"."post" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_owner_insert" ON "public"."post" FOR INSERT WITH CHECK ((("author_user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "post_owner_update" ON "public"."post" FOR UPDATE USING ((("author_user_id" = "auth"."uid"()) OR "public"."is_moderator"())) WITH CHECK ((("author_user_id" = "auth"."uid"()) OR "public"."is_moderator"()));



ALTER TABLE "public"."post_poll" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_poll_option" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_poll_option_owner_write" ON "public"."post_poll_option" USING ((EXISTS ( SELECT 1
   FROM "public"."post_poll" "pp"
  WHERE (("pp"."post_item_id" = "post_poll_option"."post_item_id") AND (("pp"."created_by" = "auth"."uid"()) OR "public"."is_moderator"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."post_poll" "pp"
  WHERE (("pp"."post_item_id" = "post_poll_option"."post_item_id") AND (("pp"."created_by" = "auth"."uid"()) OR "public"."is_moderator"())))));



CREATE POLICY "post_poll_option_read" ON "public"."post_poll_option" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."post_poll" "pp"
  WHERE (("pp"."post_item_id" = "post_poll_option"."post_item_id") AND "public"."can_read_post_poll"("pp".*)))));



CREATE POLICY "post_poll_owner_write" ON "public"."post_poll" USING ((("created_by" = "auth"."uid"()) OR "public"."is_moderator"())) WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_moderator"()));



CREATE POLICY "post_poll_read" ON "public"."post_poll" FOR SELECT USING ("public"."can_read_post_poll"("post_poll".*));



ALTER TABLE "public"."post_poll_response" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_poll_response_owner_select" ON "public"."post_poll_response" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "post_poll_response_owner_write" ON "public"."post_poll_response" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "post_read" ON "public"."post" FOR SELECT USING (("public"."can_read_post"("post".*) OR (("author_user_id" = "auth"."uid"()) AND ("post_status" <> 'removed'::"public"."post_status"))));



ALTER TABLE "public"."post_revision" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_revision_read" ON "public"."post_revision" FOR SELECT USING ((("editor_user_id" = "auth"."uid"()) OR "public"."is_moderator"() OR "public"."is_admin"()));



ALTER TABLE "public"."prediction_questions_editorial" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prediction_questions_editorial_read" ON "public"."prediction_questions_editorial" FOR SELECT USING (true);



CREATE POLICY "private_political_owner_insert" ON "public"."user_private_political_profile" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "private_political_owner_select" ON "public"."user_private_political_profile" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "private_political_owner_update" ON "public"."user_private_political_profile" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profile_vote_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_vote_history_self_delete" ON "public"."profile_vote_history" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profile_vote_history_self_insert" ON "public"."profile_vote_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "profile_vote_history_self_select" ON "public"."profile_vote_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profile_vote_history_self_update" ON "public"."profile_vote_history" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."reaction" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reaction_public_read" ON "public"."reaction" FOR SELECT USING (true);



ALTER TABLE "public"."subject" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subject_public_read" ON "public"."subject" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."subthemes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subthemes_read" ON "public"."subthemes" FOR SELECT USING (true);



ALTER TABLE "public"."themes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "themes_read" ON "public"."themes" FOR SELECT USING (true);



ALTER TABLE "public"."thread_post" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "thread_post_public_read" ON "public"."thread_post" FOR SELECT USING (("status" = 'published'::"public"."thread_post_status"));



ALTER TABLE "public"."thread_post_subject" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "thread_post_subject_authenticated_insert" ON "public"."thread_post_subject" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "thread_post_subject_public_read" ON "public"."thread_post_subject" FOR SELECT USING (true);



ALTER TABLE "public"."topic" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topic_owner_insert" ON "public"."topic" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "topic_owner_update" ON "public"."topic" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR "public"."is_moderator"())) WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_moderator"()));



CREATE POLICY "topic_read" ON "public"."topic" FOR SELECT USING ("public"."can_read_topic"("topic".*));



ALTER TABLE "public"."topic_resolution" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topic_resolution_moderator_write" ON "public"."topic_resolution" USING ("public"."is_moderator"()) WITH CHECK ("public"."is_moderator"());



CREATE POLICY "topic_resolution_read" ON "public"."topic_resolution" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."topic" "t"
  WHERE (("t"."id" = "topic_resolution"."topic_id") AND "public"."can_read_topic"("t".*)))));



ALTER TABLE "public"."topic_resolution_source" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topic_resolution_source_moderator_write" ON "public"."topic_resolution_source" USING ("public"."is_moderator"()) WITH CHECK ("public"."is_moderator"());



CREATE POLICY "topic_resolution_source_read" ON "public"."topic_resolution_source" FOR SELECT USING (((("source_type" <> 'internal_moderation_note'::"public"."resolution_source_type") OR "public"."is_moderator"()) AND (EXISTS ( SELECT 1
   FROM "public"."topic" "t"
  WHERE (("t"."id" = "topic_resolution_source"."topic_id") AND "public"."can_read_topic"("t".*))))));



ALTER TABLE "public"."topic_sources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topic_sources_read" ON "public"."topic_sources" FOR SELECT USING (true);



ALTER TABLE "public"."topic_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topic_tags_read" ON "public"."topic_tags" FOR SELECT USING (true);



ALTER TABLE "public"."topic_territories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topic_territories_read" ON "public"."topic_territories" FOR SELECT USING (true);



ALTER TABLE "public"."topics_editorial" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topics_editorial_read" ON "public"."topics_editorial" FOR SELECT USING (true);



ALTER TABLE "public"."user_private_political_profile" ENABLE ROW LEVEL SECURITY;


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "postgres";



REVOKE ALL ON FUNCTION "public"."award_card"("p_user_id" "uuid", "p_card_id" "uuid", "p_reason" "public"."card_grant_reason_type", "p_source_entity_type" "public"."audit_entity_type", "p_source_entity_id" "uuid", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."award_card"("p_user_id" "uuid", "p_card_id" "uuid", "p_reason" "public"."card_grant_reason_type", "p_source_entity_type" "public"."audit_entity_type", "p_source_entity_id" "uuid", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."post" TO "service_role";
GRANT SELECT ON TABLE "public"."post" TO "anon";
GRANT SELECT ON TABLE "public"."post" TO "authenticated";



GRANT ALL ON FUNCTION "public"."can_read_post"("post_row" "public"."post") TO "service_role";



GRANT ALL ON TABLE "public"."post_poll" TO "anon";
GRANT ALL ON TABLE "public"."post_poll" TO "authenticated";
GRANT ALL ON TABLE "public"."post_poll" TO "service_role";



GRANT ALL ON FUNCTION "public"."can_read_post_poll"("poll_row" "public"."post_poll") TO "anon";
GRANT ALL ON FUNCTION "public"."can_read_post_poll"("poll_row" "public"."post_poll") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_post_poll"("poll_row" "public"."post_poll") TO "service_role";



GRANT ALL ON TABLE "public"."topic" TO "service_role";
GRANT SELECT ON TABLE "public"."topic" TO "anon";
GRANT SELECT ON TABLE "public"."topic" TO "authenticated";



GRANT ALL ON FUNCTION "public"."can_read_topic"("topic_row" "public"."topic") TO "service_role";



GRANT ALL ON FUNCTION "public"."capture_post_revision"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."compute_prediction_normalized_score"("p_topic_id" "uuid", "p_submission_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."compute_prediction_normalized_score"("p_topic_id" "uuid", "p_submission_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_comment"("p_thread_post_id" "uuid", "p_parent_post_id" "uuid", "p_body_markdown" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_comment"("p_thread_post_id" "uuid", "p_parent_post_id" "uuid", "p_body_markdown" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_comment"("p_thread_post_id" "uuid", "p_parent_post_id" "uuid", "p_body_markdown" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_post"("p_thread_id" "uuid", "p_type" "text", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_post"("p_thread_id" "uuid", "p_type" "text", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_post"("p_thread_id" "uuid", "p_type" "text", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."thread_post" TO "anon";
GRANT ALL ON TABLE "public"."thread_post" TO "authenticated";
GRANT ALL ON TABLE "public"."thread_post" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_post"("p_thread_id" "uuid", "p_type" "public"."thread_post_type", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_post"("p_thread_id" "uuid", "p_type" "public"."thread_post_type", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_post"("p_thread_id" "uuid", "p_type" "public"."thread_post_type", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_post_poll"("p_post_item_id" "uuid", "p_question" "text", "p_deadline_at" timestamp with time zone, "p_options" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_post_poll"("p_post_item_id" "uuid", "p_question" "text", "p_deadline_at" timestamp with time zone, "p_options" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_post_poll"("p_post_item_id" "uuid", "p_question" "text", "p_deadline_at" timestamp with time zone, "p_options" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_thread"("p_title" "text", "p_description" "text", "p_entity_id" "uuid", "p_space_id" "uuid", "p_close_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."create_thread"("p_title" "text", "p_description" "text", "p_entity_id" "uuid", "p_space_id" "uuid", "p_close_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_thread"("p_title" "text", "p_description" "text", "p_entity_id" "uuid", "p_space_id" "uuid", "p_close_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."effective_topic_visibility"("topic_row" "public"."topic") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_moderator"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_audit_event"("p_entity_type" "public"."audit_entity_type", "p_entity_id" "uuid", "p_action_name" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_entity_type" "public"."audit_entity_type", "p_entity_id" "uuid", "p_action_name" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."reaction" TO "anon";
GRANT ALL ON TABLE "public"."reaction" TO "authenticated";
GRANT ALL ON TABLE "public"."reaction" TO "service_role";



GRANT ALL ON FUNCTION "public"."react_post"("p_target_type" "public"."reaction_target_type", "p_target_id" "uuid", "p_reaction_type" "public"."reaction_type") TO "anon";
GRANT ALL ON FUNCTION "public"."react_post"("p_target_type" "public"."reaction_target_type", "p_target_id" "uuid", "p_reaction_type" "public"."reaction_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."react_post"("p_target_type" "public"."reaction_target_type", "p_target_id" "uuid", "p_reaction_type" "public"."reaction_type") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_topic"("p_topic_id" "uuid", "p_resolution_note" "text", "p_resolved_boolean" boolean, "p_resolved_date" "date", "p_resolved_numeric" numeric, "p_resolved_option_id" "uuid", "p_resolved_ordinal" integer, "p_source_type" "public"."resolution_source_type", "p_source_label" "text", "p_source_url" "text", "p_source_excerpt" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_topic"("p_topic_id" "uuid", "p_resolution_note" "text", "p_resolved_boolean" boolean, "p_resolved_date" "date", "p_resolved_numeric" numeric, "p_resolved_option_id" "uuid", "p_resolved_ordinal" integer, "p_source_type" "public"."resolution_source_type", "p_source_label" "text", "p_source_url" "text", "p_source_excerpt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_poll"("p_space_id" "uuid", "p_topic_id" "uuid", "p_title" "text", "p_description" "text", "p_visibility" "public"."visibility_level", "p_close_at" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_create_poll"("p_space_id" "uuid", "p_topic_id" "uuid", "p_title" "text", "p_description" "text", "p_visibility" "public"."visibility_level", "p_close_at" timestamp with time zone) TO "authenticated";



GRANT ALL ON FUNCTION "public"."rpc_create_post"("p_topic_id" "uuid", "p_space_id" "uuid", "p_post_type" "public"."post_type", "p_title" "text", "p_body_markdown" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_create_post"("p_topic_id" "uuid", "p_space_id" "uuid", "p_post_type" "public"."post_type", "p_title" "text", "p_body_markdown" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_create_post_full"("p_title" "text", "p_body" "text", "p_source_url" "text", "p_link_preview" "jsonb", "p_mode" "text", "p_poll_question" "text", "p_poll_deadline_at" timestamp with time zone, "p_poll_options" "jsonb", "p_subject_ids" "uuid"[], "p_party_tags" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_create_post_full"("p_title" "text", "p_body" "text", "p_source_url" "text", "p_link_preview" "jsonb", "p_mode" "text", "p_poll_question" "text", "p_poll_deadline_at" timestamp with time zone, "p_poll_options" "jsonb", "p_subject_ids" "uuid"[], "p_party_tags" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_post_full"("p_title" "text", "p_body" "text", "p_source_url" "text", "p_link_preview" "jsonb", "p_mode" "text", "p_poll_question" "text", "p_poll_deadline_at" timestamp with time zone, "p_poll_options" "jsonb", "p_subject_ids" "uuid"[], "p_party_tags" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_post_full"("p_title" "text", "p_body" "text", "p_source_url" "text", "p_link_preview" "jsonb", "p_mode" "text", "p_poll_question" "text", "p_poll_deadline_at" timestamp with time zone, "p_poll_options" "jsonb", "p_subject_ids" "uuid"[], "p_party_tags" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_topic_with_prediction"("p_space_id" "uuid", "p_slug" "text", "p_title" "text", "p_description" "text", "p_visibility" "public"."visibility_level", "p_close_at" timestamp with time zone, "p_prediction_type" "public"."prediction_type", "p_prediction_title" "text", "p_scoring_method" "public"."prediction_scoring_method", "p_aggregation_method" "public"."prediction_aggregation_method") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_create_topic_with_prediction"("p_space_id" "uuid", "p_slug" "text", "p_title" "text", "p_description" "text", "p_visibility" "public"."visibility_level", "p_close_at" timestamp with time zone, "p_prediction_type" "public"."prediction_type", "p_prediction_title" "text", "p_scoring_method" "public"."prediction_scoring_method", "p_aggregation_method" "public"."prediction_aggregation_method") TO "authenticated";



GRANT ALL ON FUNCTION "public"."rpc_delete_comment"("p_comment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_delete_comment"("p_comment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_delete_comment"("p_comment_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_delete_private_political_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_delete_private_political_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_delete_private_political_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_delete_thread_post"("p_thread_post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_delete_thread_post"("p_thread_post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_delete_thread_post"("p_thread_post_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_delete_vote_history"("p_election_slug" "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_delete_vote_history"("p_election_slug" "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_delete_vote_history"("p_election_slug" "public"."citext") TO "service_role";



GRANT ALL ON TABLE "public"."user_private_political_profile" TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_get_private_political_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_get_private_political_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_private_political_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_list_vote_history_detailed"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_list_vote_history_detailed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_list_vote_history_detailed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_report_content"("p_target_type" "text", "p_target_id" "uuid", "p_reason_code" "text", "p_reason_detail" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_report_content"("p_target_type" "text", "p_target_id" "uuid", "p_reason_code" "text", "p_reason_detail" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_report_content"("p_target_type" "text", "p_target_id" "uuid", "p_reason_code" "text", "p_reason_detail" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_update_comment"("p_comment_id" "uuid", "p_body_markdown" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_update_comment"("p_comment_id" "uuid", "p_body_markdown" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_update_comment"("p_comment_id" "uuid", "p_body_markdown" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_update_thread_post"("p_thread_post_id" "uuid", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_update_thread_post"("p_thread_post_id" "uuid", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_update_thread_post"("p_thread_post_id" "uuid", "p_title" "text", "p_content" "text", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_upsert_private_political_profile"("p_declared_partisan_term_id" "uuid", "p_declared_ideology_term_id" "uuid", "p_political_interest_level" integer, "p_notes_private" "text", "p_profile_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_upsert_private_political_profile"("p_declared_partisan_term_id" "uuid", "p_declared_ideology_term_id" "uuid", "p_political_interest_level" integer, "p_notes_private" "text", "p_profile_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_private_political_profile"("p_declared_partisan_term_id" "uuid", "p_declared_ideology_term_id" "uuid", "p_political_interest_level" integer, "p_notes_private" "text", "p_profile_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_vote_history"("p_election_slug" "public"."citext", "p_election_result_id" "uuid", "p_choice_kind" "public"."vote_choice_kind", "p_confidence" smallint, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_vote_history"("p_election_slug" "public"."citext", "p_election_result_id" "uuid", "p_choice_kind" "public"."vote_choice_kind", "p_confidence" smallint, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_vote_history"("p_election_slug" "public"."citext", "p_election_result_id" "uuid", "p_choice_kind" "public"."vote_choice_kind", "p_confidence" smallint, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."snapshot_prediction_submission"() TO "service_role";



GRANT ALL ON TABLE "public"."post_poll_option" TO "anon";
GRANT ALL ON TABLE "public"."post_poll_option" TO "authenticated";
GRANT ALL ON TABLE "public"."post_poll_option" TO "service_role";



GRANT ALL ON TABLE "public"."post_poll_response" TO "service_role";
GRANT INSERT,UPDATE ON TABLE "public"."post_poll_response" TO "authenticated";



GRANT ALL ON TABLE "public"."v_post_poll_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_post_poll_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_post_poll_summary" TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_post_poll_vote"("p_post_item_id" "uuid", "p_option_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_post_poll_vote"("p_post_item_id" "uuid", "p_option_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_post_poll_vote"("p_post_item_id" "uuid", "p_option_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_post_poll_vote"("p_post_item_id" "uuid", "p_option_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_profile_vote_history_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_profile_vote_history_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_profile_vote_history_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_prediction_submission"() TO "service_role";



GRANT ALL ON FUNCTION "public"."visibility_rank"("v" "public"."visibility_level") TO "service_role";



GRANT ALL ON TABLE "public"."app_profile" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."app_profile" TO "authenticated";



GRANT ALL ON TABLE "public"."discussion_prompts" TO "anon";
GRANT ALL ON TABLE "public"."discussion_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_prompts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."discussion_prompts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."discussion_prompts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."discussion_prompts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."election" TO "anon";
GRANT ALL ON TABLE "public"."election" TO "authenticated";
GRANT ALL ON TABLE "public"."election" TO "service_role";



GRANT ALL ON TABLE "public"."election_result" TO "anon";
GRANT ALL ON TABLE "public"."election_result" TO "authenticated";
GRANT ALL ON TABLE "public"."election_result" TO "service_role";



GRANT ALL ON TABLE "public"."media_outlet" TO "anon";
GRANT ALL ON TABLE "public"."media_outlet" TO "authenticated";
GRANT ALL ON TABLE "public"."media_outlet" TO "service_role";



GRANT ALL ON TABLE "public"."political_entity" TO "anon";
GRANT ALL ON TABLE "public"."political_entity" TO "authenticated";
GRANT ALL ON TABLE "public"."political_entity" TO "service_role";



GRANT ALL ON TABLE "public"."post_revision" TO "service_role";



GRANT ALL ON TABLE "public"."prediction_questions_editorial" TO "anon";
GRANT ALL ON TABLE "public"."prediction_questions_editorial" TO "authenticated";
GRANT ALL ON TABLE "public"."prediction_questions_editorial" TO "service_role";



GRANT ALL ON SEQUENCE "public"."prediction_questions_editorial_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."prediction_questions_editorial_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."prediction_questions_editorial_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profile_vote_history" TO "anon";
GRANT ALL ON TABLE "public"."profile_vote_history" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_vote_history" TO "service_role";



GRANT ALL ON TABLE "public"."subject" TO "anon";
GRANT ALL ON TABLE "public"."subject" TO "authenticated";
GRANT ALL ON TABLE "public"."subject" TO "service_role";



GRANT ALL ON TABLE "public"."subthemes" TO "anon";
GRANT ALL ON TABLE "public"."subthemes" TO "authenticated";
GRANT ALL ON TABLE "public"."subthemes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."subthemes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."subthemes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."subthemes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."themes" TO "anon";
GRANT ALL ON TABLE "public"."themes" TO "authenticated";
GRANT ALL ON TABLE "public"."themes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."themes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."themes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."themes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."thread_post_subject" TO "anon";
GRANT ALL ON TABLE "public"."thread_post_subject" TO "authenticated";
GRANT ALL ON TABLE "public"."thread_post_subject" TO "service_role";



GRANT ALL ON TABLE "public"."topic_resolution" TO "service_role";
GRANT SELECT ON TABLE "public"."topic_resolution" TO "anon";
GRANT SELECT ON TABLE "public"."topic_resolution" TO "authenticated";



GRANT ALL ON TABLE "public"."topic_resolution_source" TO "service_role";
GRANT SELECT ON TABLE "public"."topic_resolution_source" TO "anon";
GRANT SELECT ON TABLE "public"."topic_resolution_source" TO "authenticated";



GRANT ALL ON TABLE "public"."topic_sources" TO "anon";
GRANT ALL ON TABLE "public"."topic_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_sources" TO "service_role";



GRANT ALL ON SEQUENCE "public"."topic_sources_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."topic_sources_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."topic_sources_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."topic_tags" TO "anon";
GRANT ALL ON TABLE "public"."topic_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_tags" TO "service_role";



GRANT ALL ON SEQUENCE "public"."topic_tags_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."topic_tags_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."topic_tags_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."topic_territories" TO "anon";
GRANT ALL ON TABLE "public"."topic_territories" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_territories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."topic_territories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."topic_territories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."topic_territories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."topics_editorial" TO "anon";
GRANT ALL ON TABLE "public"."topics_editorial" TO "authenticated";
GRANT ALL ON TABLE "public"."topics_editorial" TO "service_role";



GRANT ALL ON SEQUENCE "public"."topics_editorial_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."topics_editorial_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."topics_editorial_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_visibility_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_visibility_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_visibility_settings" TO "service_role";



GRANT ALL ON TABLE "public"."v_thread_detail" TO "anon";
GRANT ALL ON TABLE "public"."v_thread_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."v_thread_detail" TO "service_role";



GRANT ALL ON TABLE "public"."v_feed_global" TO "anon";
GRANT ALL ON TABLE "public"."v_feed_global" TO "authenticated";
GRANT ALL ON TABLE "public"."v_feed_global" TO "service_role";



GRANT ALL ON TABLE "public"."v_post_comments" TO "anon";
GRANT ALL ON TABLE "public"."v_post_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."v_post_comments" TO "service_role";



GRANT ALL ON TABLE "public"."v_thread_posts" TO "anon";
GRANT ALL ON TABLE "public"."v_thread_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."v_thread_posts" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




