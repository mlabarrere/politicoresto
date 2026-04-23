-- Enforce one-vote-per-user-per-poll at the RPC layer.
--
-- Previously submit_post_poll_vote used `on conflict do update`, so a user
-- could silently overwrite their vote any number of times. The product
-- spec says a vote is final once cast; weighted results downstream assume
-- the stored vote is the considered choice, not the most recent click.
--
-- Forward-only: replace the upsert with `on conflict do nothing` plus a
-- row_count guard that raises 'Already voted' on re-submission. The
-- unique index (post_item_id, user_id) already prevents duplicates; the
-- change is purely about whether we silently overwrite or reject.

create or replace function public.submit_post_poll_vote(
  p_post_item_id uuid,
  p_option_id uuid
) returns setof public.v_post_poll_summary
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  poll_row public.post_poll%rowtype;
  inserted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into poll_row from public.post_poll where post_item_id = p_post_item_id;
  if poll_row.post_item_id is null then
    raise exception 'Poll not found';
  end if;
  if poll_row.poll_status <> 'open' or poll_row.deadline_at <= timezone('utc', now()) then
    raise exception 'Poll is closed';
  end if;

  if not exists (
    select 1 from public.post_poll_option o
    where o.id = p_option_id
      and o.post_item_id = p_post_item_id
      and o.is_active = true
  ) then
    raise exception 'Option not found for this poll';
  end if;

  insert into public.post_poll_response(post_item_id, option_id, user_id)
  values (p_post_item_id, p_option_id, auth.uid())
  on conflict (post_item_id, user_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    raise exception 'Already voted' using errcode = 'P0001';
  end if;

  return query
    select * from public.v_post_poll_summary v
    where v.post_item_id = p_post_item_id;
end;
$$;

alter function public.submit_post_poll_vote(uuid, uuid) owner to postgres;
