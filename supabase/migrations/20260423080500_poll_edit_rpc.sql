-- Poll edit with soft-lock on first vote.
--
-- Context: authors can edit text posts via rpc_update_thread_post, but
-- polls have additional rows in post_poll / post_poll_option that the
-- thread_post RPC does not touch. This RPC lets authors rewrite the poll
-- question and option labels in place — as long as no vote has been cast.
-- Once any user has voted, the poll is locked: changing options under
-- voters would corrupt the aggregates.

create or replace function public.rpc_update_post_poll(
  p_post_item_id uuid,
  p_question text,
  p_option_labels text[]
) returns public.post_poll
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  poll_row public.post_poll%rowtype;
  post_row public.thread_post%rowtype;
  option_count integer;
  label text;
  idx integer;
  result_row public.post_poll%rowtype;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_question is null or length(btrim(p_question)) = 0 then
    raise exception 'Poll question required';
  end if;
  if p_option_labels is null or array_length(p_option_labels, 1) is null then
    raise exception 'Poll options required';
  end if;

  select * into post_row from public.thread_post where id = p_post_item_id;
  if post_row.id is null then
    raise exception 'Poll not found';
  end if;
  if post_row.created_by <> public.current_user_id() then
    raise exception 'Poll not owned by current user';
  end if;

  select * into poll_row from public.post_poll where post_item_id = p_post_item_id;
  if poll_row.post_item_id is null then
    raise exception 'Poll not found';
  end if;

  if exists (select 1 from public.post_poll_response where post_item_id = p_post_item_id) then
    raise exception 'Poll locked (already has votes)';
  end if;

  select count(*)::integer into option_count
  from public.post_poll_option
  where post_item_id = p_post_item_id;

  if array_length(p_option_labels, 1) <> option_count then
    raise exception 'Option count mismatch (expected %, got %)',
      option_count, array_length(p_option_labels, 1);
  end if;

  update public.post_poll
  set question = btrim(p_question)
  where post_item_id = p_post_item_id
  returning * into result_row;

  idx := 1;
  foreach label in array p_option_labels loop
    if label is null or length(btrim(label)) = 0 then
      raise exception 'Empty option label at position %', idx;
    end if;
    update public.post_poll_option
    set label = btrim(p_option_labels[idx])
    where post_item_id = p_post_item_id
      and sort_order = idx - 1;
    idx := idx + 1;
  end loop;

  return result_row;
end;
$$;

alter function public.rpc_update_post_poll(uuid, text, text[]) owner to postgres;

grant execute on function public.rpc_update_post_poll(uuid, text, text[]) to authenticated;
