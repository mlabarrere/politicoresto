begin;

create or replace function public.log_audit_event(
  p_entity_type public.audit_entity_type,
  p_entity_id uuid,
  p_action_name text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language sql
as $$ select; $$;

create or replace function public.effective_topic_visibility(topic_row public.topic)
returns public.visibility_level
language sql
stable
as $$
  select case when topic_row.topic_status = 'removed' then 'moderators_only'::public.visibility_level else topic_row.visibility end;
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
    else false end;
$$;

create or replace function public.can_read_post(post_row public.post)
returns boolean
language sql
stable
as $$
  select case
    when public.is_moderator() then true
    when post_row.post_status in ('hidden', 'removed') then false
    when post_row.topic_id is not null then exists (select 1 from public.topic t where t.id = post_row.topic_id and public.can_read_topic(t))
    else false end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.create_thread(
  p_title text,
  p_description text default null,
  p_entity_id uuid default null,
  p_space_id uuid default null,
  p_close_at timestamptz default null
)
returns public.topic
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.create_post(
  p_thread_id uuid,
  p_type public.thread_post_type,
  p_title text default null,
  p_content text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.thread_post
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.create_comment(
  p_thread_post_id uuid,
  p_parent_post_id uuid default null,
  p_body_markdown text default null
)
returns public.post
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.react_post(
  p_target_type public.reaction_target_type,
  p_target_id uuid,
  p_reaction_type public.reaction_type
)
returns public.reaction
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.reaction; target_author uuid;
begin
  if public.current_user_id() is null then raise exception 'Authentication required'; end if;

  if p_target_type = 'thread_post' then
    select created_by into target_author from public.thread_post where id = p_target_id;
  else
    select author_user_id into target_author from public.post where id = p_target_id;
  end if;
  if target_author is null then raise exception 'Reaction target not found'; end if;

  insert into public.reaction(target_type, target_id, user_id, reaction_type, weight)
  values (p_target_type, p_target_id, public.current_user_id(), p_reaction_type, 1)
  on conflict (target_type, target_id, user_id) do update
    set reaction_type = excluded.reaction_type,
        weight = excluded.weight,
        created_at = timezone('utc', now())
  returning * into result_row;

  return result_row;
end;
$$;

create or replace view public.v_public_profiles as
select ap.user_id, ap.display_name, ap.bio, ap.created_at
from public.app_profile ap
where ap.profile_status = 'active' and ap.is_public_profile_enabled = true;

create or replace view public.v_thread_posts as
with reaction_rollup as (
  select r.target_id as thread_post_id,
         coalesce(sum(case when r.reaction_type = 'upvote' then r.weight else 0 end), 0)::integer as gauche_count,
         coalesce(sum(case when r.reaction_type = 'downvote' then r.weight else 0 end), 0)::integer as droite_count
  from public.reaction r
  where r.target_type = 'thread_post'
  group by r.target_id
),
comment_rollup as (
  select p.thread_post_id, count(*) filter (where p.post_status = 'visible')::integer as comment_count
  from public.post p
  where p.thread_post_id is not null
  group by p.thread_post_id
)
select tp.id, tp.thread_id, tp.type, tp.title, tp.content, tp.created_by, ap.username, ap.display_name, tp.created_at, tp.updated_at, tp.status,
       coalesce(rr.gauche_count, 0) as gauche_count,
       coalesce(rr.droite_count, 0) as droite_count,
       (coalesce(rr.gauche_count, 0) + coalesce(rr.droite_count, 0))::integer as total_reactions,
       coalesce(rr.gauche_count, 0) as upvote_weight,
       coalesce(rr.droite_count, 0) as downvote_weight,
       (coalesce(rr.gauche_count, 0) - coalesce(rr.droite_count, 0))::integer as weighted_votes,
       coalesce(cr.comment_count, 0) as comment_count
from public.thread_post tp
join public.topic t on t.id = tp.thread_id
join public.app_profile ap on ap.user_id = tp.created_by
left join reaction_rollup rr on rr.thread_post_id = tp.id
left join comment_rollup cr on cr.thread_post_id = tp.id
where tp.status = 'published' and public.effective_topic_visibility(t) = 'public';

create or replace view public.v_post_comments as
with reaction_rollup as (
  select r.target_id as comment_id,
         coalesce(sum(case when r.reaction_type = 'upvote' then r.weight else 0 end), 0)::integer as gauche_count,
         coalesce(sum(case when r.reaction_type = 'downvote' then r.weight else 0 end), 0)::integer as droite_count
  from public.reaction r
  where r.target_type = 'comment'
  group by r.target_id
)
select p.id, p.topic_id as thread_id, p.thread_post_id, p.parent_post_id, p.depth, p.author_user_id, ap.username, ap.display_name, p.title, p.body_markdown, p.created_at, p.updated_at, p.post_status,
       coalesce(rr.gauche_count, 0) as gauche_count,
       coalesce(rr.droite_count, 0) as droite_count,
       (coalesce(rr.gauche_count, 0) + coalesce(rr.droite_count, 0))::integer as total_reactions,
       coalesce(rr.gauche_count, 0) as upvote_weight,
       coalesce(rr.droite_count, 0) as downvote_weight,
       (coalesce(rr.gauche_count, 0) + coalesce(rr.droite_count, 0))::integer as comment_score
from public.post p
join public.topic t on t.id = p.topic_id
join public.app_profile ap on ap.user_id = p.author_user_id
left join reaction_rollup rr on rr.comment_id = p.id
where p.post_status = 'visible' and p.thread_post_id is not null and public.effective_topic_visibility(t) = 'public';

create or replace view public.v_thread_detail as
with thread_post_rollup as (
  select tp.thread_id,
         count(*)::integer as thread_post_count,
         count(*) filter (where tp.type = 'article')::integer as article_post_count,
         max(tp.created_at) as latest_thread_post_at
  from public.thread_post tp
  where tp.status = 'published'
  group by tp.thread_id
)
select t.id, t.space_id, t.slug, t.title, t.description, t.topic_status, public.effective_topic_visibility(t) as effective_visibility,
       t.open_at, t.close_at, t.created_at, t.entity_id, pe.slug as entity_slug, pe.name as entity_name,
       null::citext as space_slug, null::text as space_name, pe.slug::text as space_role,
       coalesce(tpr.thread_post_count, 0) as visible_post_count,
       0::integer as active_prediction_count,
       coalesce(tpr.thread_post_count, 0) as thread_post_count,
       tpr.latest_thread_post_at,
       round((coalesce(tpr.thread_post_count, 0)::numeric * 0.05), 6) as thread_score,
       'recent_activity'::text as feed_reason_code,
       'Remonte car la discussion est active.'::text as feed_reason_label,
       case when t.topic_status = 'resolved' then 'resolved' when t.topic_status = 'archived' then 'archived' when t.topic_status = 'locked' then 'locked' else 'open' end as derived_lifecycle_state,
       false as is_sensitive,
       pe.slug::text as primary_taxonomy_slug,
       case
         when pe.slug in ('lfi', 'lfi-nfp', 'pcf', 'gdr', 'ges', 'rev', 'peps') then 'Gauche radicale a gauche'
         when pe.slug in ('ps', 'eelv', 'prg', 'dvg', 'soc', 'ecos') then 'Gauche a centre gauche'
         when pe.slug in ('re', 'modem', 'prv', 'dvc', 'hor', 'epr', 'dem') then 'Centre gauche a centre droit'
         when pe.slug in ('lr', 'udi', 'dvd', 'dr', 'udr') then 'Centre droit a droite'
         when pe.slug in ('rn', 'rec', 'dlf', 'laf', 'idl') then 'Droite a extreme droite'
         else 'Forum'
       end as primary_taxonomy_label
from public.topic t
left join thread_post_rollup tpr on tpr.thread_id = t.id
left join public.political_entity pe on pe.id = t.entity_id
where t.topic_status in ('open', 'locked', 'resolved', 'archived') and public.effective_topic_visibility(t) = 'public';

create or replace view public.v_feed_global as
select
  td.id as topic_id,
  td.slug as topic_slug,
  td.title as topic_title,
  td.description as topic_description,
  td.topic_status,
  td.derived_lifecycle_state,
  td.effective_visibility as visibility,
  td.is_sensitive,
  td.space_id,
  td.space_slug,
  td.space_name,
  td.primary_taxonomy_slug,
  td.primary_taxonomy_label,
  null::public.prediction_type as prediction_type,
  null::text as prediction_question_title,
  '{}'::jsonb as aggregate_payload,
  jsonb_build_object('active_prediction_count', 0, 'visible_post_count', td.visible_post_count, 'time_label', concat('Cloture le ', to_char(td.close_at, 'YYYY-MM-DD'))) as metrics_payload,
  jsonb_build_object('excerpt_type', 'thread', 'excerpt_title', td.title, 'excerpt_text', coalesce(td.description, 'Discussion politique ouverte.'), 'excerpt_created_at', td.latest_thread_post_at) as discussion_payload,
  null::jsonb as card_payload,
  '{}'::jsonb as resolution_payload,
  td.latest_thread_post_at as last_activity_at,
  td.open_at,
  td.close_at,
  null::timestamptz as resolve_deadline_at,
  null::timestamptz as resolved_at,
  td.visible_post_count,
  0::integer as active_prediction_count,
  td.thread_score as activity_score_raw,
  0::numeric as freshness_score_raw,
  0::numeric as participation_score_raw,
  0::numeric as resolution_proximity_score_raw,
  0::numeric as editorial_priority_score_raw,
  0::numeric as shift_score_raw,
  td.thread_score as editorial_feed_score,
  td.feed_reason_code,
  td.feed_reason_label,
  row_number() over (order by td.thread_score desc, td.latest_thread_post_at desc nulls last, td.created_at desc)::integer as editorial_feed_rank,
  '{}'::jsonb as topic_card_payload,
  td.entity_id,
  td.entity_slug,
  td.entity_name,
  td.space_role,
  td.thread_post_count,
  td.latest_thread_post_at,
  td.thread_score
from public.v_thread_detail td;

grant select on public.v_public_profiles to anon, authenticated;
grant select on public.v_thread_posts, public.v_post_comments, public.v_thread_detail, public.v_feed_global to anon, authenticated;
grant execute on function public.create_thread(text, text, uuid, uuid, timestamptz) to authenticated;
grant execute on function public.create_post(uuid, public.thread_post_type, text, text, jsonb) to authenticated;
grant execute on function public.create_comment(uuid, uuid, text) to authenticated;
grant execute on function public.react_post(public.reaction_target_type, uuid, public.reaction_type) to authenticated;

commit;
