-- Contract alignment bridge: post-first aliases on top of thread-first schema

create or replace view public.v_posts as
select
  tp.id,
  tp.thread_id as post_id,
  tp.type,
  tp.title,
  tp.content,
  null::jsonb as metadata,
  td.entity_slug,
  td.entity_name,
  tp.created_by,
  tp.username,
  tp.display_name,
  tp.created_at,
  tp.updated_at,
  tp.status,
  tp.gauche_count,
  tp.droite_count,
  tp.weighted_votes,
  tp.comment_count
from public.v_thread_posts tp
left join public.v_thread_detail td on td.id = tp.thread_id;

create or replace view public.v_post_detail as
select
  td.*,
  td.thread_post_count as post_count,
  td.latest_thread_post_at as latest_post_at,
  td.thread_score as post_score
from public.v_thread_detail td;

create or replace view public.v_feed_global_post as
select
  fg.*,
  fg.thread_score as post_score,
  fg.latest_thread_post_at as latest_post_at
from public.v_feed_global fg;

create or replace view public.user_visibility_settings as
select
  ap.user_id,
  'public'::text as display_name_visibility,
  'public'::text as bio_visibility,
  'private'::text as vote_history_visibility
from public.app_profile ap;

create or replace function public.create_post_comment(
  p_post_id uuid,
  p_parent_post_id uuid default null,
  p_body_markdown text default null
)
returns public.post
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_comment(
    p_thread_post_id => p_post_id,
    p_parent_post_id => p_parent_post_id,
    p_body_markdown => p_body_markdown
  );
end;
$$;

create or replace function public.create_post_topic(
  p_title text,
  p_description text default null,
  p_entity_id uuid default null,
  p_space_id uuid default null,
  p_close_at timestamp with time zone default null
)
returns public.topic
language sql
security definer
set search_path = public
as $$
  select * from public.create_thread(
    p_title => p_title,
    p_description => p_description,
    p_entity_id => p_entity_id,
    p_space_id => p_space_id,
    p_close_at => p_close_at
  );
$$;

create or replace function public.create_post_item(
  p_post_id uuid,
  p_type text,
  p_title text default null,
  p_content text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select * from public.create_post(
    p_thread_id => p_post_id,
    p_type => p_type,
    p_title => p_title,
    p_content => p_content,
    p_metadata => p_metadata
  );
$$;

create or replace function public.rpc_list_private_vote_history()
returns table (
  id uuid,
  vote_round integer,
  declared_option_label text,
  declared_candidate_name text,
  declared_at timestamp with time zone,
  created_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  select
    null::uuid as id,
    null::integer as vote_round,
    null::text as declared_option_label,
    null::text as declared_candidate_name,
    null::timestamp with time zone as declared_at,
    null::timestamp with time zone as created_at
  where false;
$$;

create or replace function public.rpc_report_content(
  p_target_type text,
  p_target_id uuid,
  p_reason_code text,
  p_reason_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

grant select on public.v_posts, public.v_post_detail, public.v_feed_global_post to anon, authenticated;
grant select on public.user_visibility_settings to authenticated;
grant execute on function public.create_post_comment(uuid, uuid, text) to authenticated;
grant execute on function public.create_post_topic(text, text, uuid, uuid, timestamp with time zone) to authenticated;
grant execute on function public.create_post_item(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.rpc_list_private_vote_history() to authenticated;
grant execute on function public.rpc_report_content(text, uuid, text, text) to authenticated;
