-- Sync topic.title when the root article's title is edited.
--
-- Context: the home feed reads topic.title, but rpc_update_thread_post was
-- only mutating thread_post columns. An author who edits their post title
-- saw the change on the post page but not in the feed heading — the data
-- model has the title in both places (topic + thread_post) and they drift.
--
-- Fix: when the updated row is the thread's root article (type='article')
-- and p_title is non-null, also update topic.title in the same transaction.
-- Comments (type='comment', etc.) never touch the topic.

create or replace function public.rpc_update_thread_post(
  p_thread_post_id uuid,
  p_title text default null,
  p_content text default null,
  p_metadata jsonb default null
) returns public.thread_post
language plpgsql
security definer
set search_path to 'public'
as $$
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

  if p_title is not null and current_row.type = 'article' then
    update public.topic
    set title = p_title
    where id = current_row.thread_id;
  end if;

  return result_row;
end;
$$;

alter function public.rpc_update_thread_post(uuid, text, text, jsonb) owner to postgres;
