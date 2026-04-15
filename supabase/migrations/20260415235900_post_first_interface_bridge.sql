create or replace view public.v_posts as
select
  tp.id,
  tp.thread_id as post_id,
  tp.type,
  tp.title,
  tp.content,
  tp.metadata,
  tp.entity_slug,
  tp.entity_name,
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
from public.v_thread_posts tp;

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
  p_type public.thread_post_type,
  p_title text default null,
  p_content text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.thread_post
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

grant select on public.v_posts, public.v_post_detail, public.v_feed_global_post to anon, authenticated;
grant execute on function public.create_post_comment(uuid, uuid, text) to authenticated;
grant execute on function public.create_post_topic(text, text, uuid, uuid, timestamp with time zone) to authenticated;
grant execute on function public.create_post_item(uuid, public.thread_post_type, text, text, jsonb) to authenticated;
