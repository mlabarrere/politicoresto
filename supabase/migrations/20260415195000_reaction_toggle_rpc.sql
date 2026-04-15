begin;

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

grant execute on function public.react_post(public.reaction_target_type, uuid, public.reaction_type) to authenticated;

notify pgrst, 'reload schema';

commit;
