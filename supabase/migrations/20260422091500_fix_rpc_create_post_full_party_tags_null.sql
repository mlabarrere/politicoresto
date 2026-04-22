-- Fix: rpc_create_post_full inserted NULL into thread_post.party_tags when
-- the author selected no party, but the column is NOT NULL. Insert a
-- strictly empty text[] instead. Forward-only, non-breaking.
--
-- Symptom: POST /post/new → 303 → /post/new?error=publish_failed on any
-- post submitted without a party chip selected. Caught at E2E smoke-test
-- on staging 2026-04-22.

begin;

create or replace function public.rpc_create_post_full(
  p_title text,
  p_body text default null,
  p_source_url text default null,
  p_link_preview jsonb default null,
  p_mode text default 'post',
  p_poll_question text default null,
  p_poll_deadline_at timestamptz default null,
  p_poll_options jsonb default '[]'::jsonb,
  p_subject_ids uuid[] default array[]::uuid[],
  p_party_tags text[] default array[]::text[]
)
returns table(thread_id uuid, post_item_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  v_party_tags text[];
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null then
    raise exception 'Title required';
  end if;

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

  -- Normalize: either the first 3 tags, or an empty array. Never NULL.
  v_party_tags := case
    when array_length(p_party_tags, 1) is not null
    then p_party_tags[1:3]
    else array[]::text[]
  end;

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
    v_party_tags
  )
  returning id into v_post_item_id;

  if array_length(p_subject_ids, 1) is not null then
    foreach v_subject in array p_subject_ids loop
      insert into public.thread_post_subject(thread_post_id, subject_id)
      values (v_post_item_id, v_subject)
      on conflict do nothing;
    end loop;
  end if;

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

revoke all on function public.rpc_create_post_full(
  text, text, text, jsonb, text, text, timestamptz, jsonb, uuid[], text[]
) from public;

grant execute on function public.rpc_create_post_full(
  text, text, text, jsonb, text, text, timestamptz, jsonb, uuid[], text[]
) to authenticated;

commit;
