
begin;

DO $$
begin
  if not exists (select 1 from pg_type where typname = 'political_entity_type') then
    create type public.political_entity_type as enum ('party', 'candidate', 'bloc');
  end if;
  if not exists (select 1 from pg_type where typname = 'space_role') then
    create type public.space_role as enum ('legacy', 'global', 'party', 'bloc');
  end if;
  if not exists (select 1 from pg_type where typname = 'thread_kind') then
    create type public.thread_kind as enum ('issue', 'poll_wave', 'candidate_watch', 'party_watch');
  end if;
  if not exists (select 1 from pg_type where typname = 'thread_post_type') then
    create type public.thread_post_type as enum ('article', 'poll', 'market');
  end if;
  if not exists (select 1 from pg_type where typname = 'thread_post_status') then
    create type public.thread_post_status as enum ('draft', 'published', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'reaction_target_type') then
    create type public.reaction_target_type as enum ('thread_post', 'comment');
  end if;
  if not exists (select 1 from pg_type where typname = 'reaction_type') then
    create type public.reaction_type as enum ('upvote', 'downvote');
  end if;
  if not exists (select 1 from pg_type where typname = 'poll_wave_status') then
    create type public.poll_wave_status as enum ('draft', 'open', 'closed', 'published');
  end if;
end
$$;

create table if not exists public.political_entity (
  id uuid primary key default gen_random_uuid(),
  type public.political_entity_type not null,
  slug citext not null unique,
  name text not null,
  parent_entity_id uuid references public.political_entity(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.thread_post (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.topic(id) on delete cascade,
  type public.thread_post_type not null,
  title text,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  entity_id uuid references public.political_entity(id),
  created_by uuid not null references public.app_profile(user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  status public.thread_post_status not null default 'published'
);

create table if not exists public.reaction (
  id uuid primary key default gen_random_uuid(),
  target_type public.reaction_target_type not null,
  target_id uuid not null,
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  reaction_type public.reaction_type not null,
  weight numeric not null default 1 check (weight > 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint reaction_target_user_unique unique (target_type, target_id, user_id)
);

create table if not exists public.user_score (
  user_id uuid primary key references public.app_profile(user_id) on delete cascade,
  global_score numeric not null default 0,
  local_score numeric not null default 0,
  analytic_score numeric not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.poll_wave (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  status public.poll_wave_status not null default 'draft',
  title text not null,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  thread_id uuid references public.topic(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz
);
alter table public.space
  add column if not exists space_role public.space_role not null default 'legacy',
  add column if not exists primary_entity_id uuid references public.political_entity(id);

alter table public.topic
  add column if not exists entity_id uuid references public.political_entity(id),
  add column if not exists thread_kind public.thread_kind not null default 'issue',
  add column if not exists campaign_cycle text not null default 'presidentielle_2027';

alter table public.post
  add column if not exists thread_post_id uuid references public.thread_post(id) on delete cascade,
  add column if not exists parent_post_id uuid references public.post(id) on delete cascade,
  add column if not exists depth integer not null default 0;

alter table public.post drop constraint if exists post_thread_post_parent_chk;
alter table public.post add constraint post_thread_post_parent_chk check (parent_post_id is null or thread_post_id is not null);

alter table public.poll add column if not exists thread_post_id uuid unique references public.thread_post(id) on delete set null;
alter table public.poll_response add column if not exists weight numeric not null default 1;
alter table public.prediction_question add column if not exists thread_post_id uuid unique references public.thread_post(id) on delete set null;

create index if not exists political_entity_parent_idx on public.political_entity(parent_entity_id);
create index if not exists space_primary_entity_idx on public.space(primary_entity_id);
create index if not exists topic_entity_idx on public.topic(entity_id);
create index if not exists topic_campaign_cycle_idx on public.topic(campaign_cycle);
create index if not exists thread_post_thread_idx on public.thread_post(thread_id, created_at desc);
create index if not exists thread_post_entity_idx on public.thread_post(entity_id);
create index if not exists thread_post_created_by_idx on public.thread_post(created_by, created_at desc);
create index if not exists post_thread_post_idx on public.post(thread_post_id, created_at desc);
create index if not exists post_parent_post_idx on public.post(parent_post_id, created_at desc);
create index if not exists reaction_target_idx on public.reaction(target_type, target_id, created_at desc);
create index if not exists reaction_user_idx on public.reaction(user_id, created_at desc);
create index if not exists poll_wave_thread_idx on public.poll_wave(thread_id);

drop trigger if exists political_entity_touch_updated_at on public.political_entity;
create trigger political_entity_touch_updated_at before update on public.political_entity for each row execute function public.touch_updated_at();
drop trigger if exists thread_post_touch_updated_at on public.thread_post;
create trigger thread_post_touch_updated_at before update on public.thread_post for each row execute function public.touch_updated_at();
drop trigger if exists user_score_touch_updated_at on public.user_score;
create trigger user_score_touch_updated_at before update on public.user_score for each row execute function public.touch_updated_at();
drop trigger if exists poll_wave_touch_updated_at on public.poll_wave;
create trigger poll_wave_touch_updated_at before update on public.poll_wave for each row execute function public.touch_updated_at();

alter table public.political_entity enable row level security;
alter table public.thread_post enable row level security;
alter table public.reaction enable row level security;
alter table public.user_score enable row level security;
alter table public.poll_wave enable row level security;

drop policy if exists political_entity_public_read on public.political_entity;
create policy political_entity_public_read on public.political_entity for select to anon, authenticated using (true);
drop policy if exists thread_post_public_read on public.thread_post;
create policy thread_post_public_read on public.thread_post for select to anon, authenticated using (
  status = 'published' and exists (
    select 1 from public.topic t where t.id = thread_post.thread_id and public.effective_topic_visibility(t) = 'public'
  )
);
drop policy if exists reaction_owner_select on public.reaction;
create policy reaction_owner_select on public.reaction for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists user_score_public_read on public.user_score;
create policy user_score_public_read on public.user_score for select to anon, authenticated using (true);
drop policy if exists poll_wave_public_read on public.poll_wave;
create policy poll_wave_public_read on public.poll_wave for select to anon, authenticated using (status in ('open', 'closed', 'published'));

insert into public.political_entity(type, slug, name, metadata)
values
  ('bloc', 'bloc-central', 'Bloc central', jsonb_build_object('kind', 'governing_coalition')),
  ('party', 'rn', 'Rassemblement national', '{}'::jsonb),
  ('party', 'lfi', 'La France insoumise', '{}'::jsonb),
  ('party', 'lr', 'Les Republicains', '{}'::jsonb),
  ('party', 'ecologistes', 'Les Ecologistes', '{}'::jsonb),
  ('party', 'renaissance', 'Renaissance', jsonb_build_object('bloc', 'bloc-central'))
on conflict (slug) do update
set name = excluded.name,
    metadata = public.political_entity.metadata || excluded.metadata,
    updated_at = timezone('utc', now());

insert into public.space(slug, name, description, space_type, space_role, primary_entity_id, visibility)
select 'global', 'Feed global', 'Vue transverse des conversations et rapports de force de la presidentielle.', 'editorial', 'global', null, 'public'
where not exists (select 1 from public.space where slug = 'global');

insert into public.space(slug, name, description, space_type, space_role, primary_entity_id, visibility)
select pe.slug, pe.name, 'Espace partisan dedie a ' || pe.name || ' dans le cycle presidentiel.', 'editorial'::public.space_type, case when pe.type = 'bloc' then 'bloc'::public.space_role else 'party'::public.space_role end, pe.id, 'public'::public.visibility_level
from public.political_entity pe
where pe.slug in ('rn', 'lfi', 'lr', 'ecologistes', 'bloc-central', 'renaissance')
  and not exists (select 1 from public.space s where s.slug = pe.slug);

update public.space s
set space_role = 'global', updated_at = timezone('utc', now())
where s.slug = 'global' and s.space_role = 'legacy';

update public.space s
set primary_entity_id = pe.id,
    space_role = case when pe.type = 'bloc' then 'bloc'::public.space_role else 'party'::public.space_role end,
    updated_at = timezone('utc', now())
from public.political_entity pe
where s.slug = pe.slug
  and s.slug in ('rn', 'lfi', 'lr', 'ecologistes', 'bloc-central', 'renaissance');

update public.topic t
set space_id = gs.id, updated_at = timezone('utc', now())
from public.space gs
where gs.slug = 'global' and t.space_id is null and t.topic_status in ('open', 'locked', 'resolved', 'archived');

update public.topic t
set entity_id = s.primary_entity_id, updated_at = timezone('utc', now())
from public.space s
where t.space_id = s.id and s.primary_entity_id is not null and t.entity_id is null;
insert into public.topic(space_id, slug, title, description, topic_status, visibility, created_by, created_at, updated_at, open_at, close_at, resolve_deadline_at, thread_kind, campaign_cycle)
select p.space_id, ('poll-thread-' || replace(p.id::text, '-', ''))::citext, p.title, p.description,
  case when p.poll_status = 'draft' then 'draft'::public.topic_status else 'open'::public.topic_status end,
  p.visibility, p.created_by, p.created_at, p.created_at, p.open_at, p.close_at, p.close_at + interval '7 days', 'issue', 'presidentielle_2027'
from public.poll p
where p.topic_id is null
  and not exists (select 1 from public.topic t where t.slug = ('poll-thread-' || replace(p.id::text, '-', ''))::citext);

update public.poll p
set topic_id = t.id
from public.topic t
where p.topic_id is null and t.slug = ('poll-thread-' || replace(p.id::text, '-', ''))::citext;

insert into public.thread_post(thread_id, type, title, content, metadata, entity_id, created_by, created_at, updated_at, status)
select t.id, 'market', pq.title, coalesce(t.description, pq.title), jsonb_build_object('prediction_type', pq.prediction_type, 'source', 'prediction_question_backfill'), t.entity_id, t.created_by, t.created_at, timezone('utc', now()), 'published'
from public.topic t
join public.prediction_question pq on pq.topic_id = t.id
where not exists (select 1 from public.thread_post tp where tp.thread_id = t.id and tp.type = 'market');

update public.prediction_question pq
set thread_post_id = tp.id
from public.thread_post tp
where pq.topic_id = tp.thread_id and tp.type = 'market' and pq.thread_post_id is null;

insert into public.thread_post(thread_id, type, title, content, metadata, entity_id, created_by, created_at, updated_at, status)
select p.topic_id, 'poll', p.title, p.description, jsonb_build_object('poll_id', p.id, 'source', 'poll_backfill'), t.entity_id, p.created_by, p.created_at, timezone('utc', now()), 'published'
from public.poll p
join public.topic t on t.id = p.topic_id
where not exists (select 1 from public.thread_post tp where tp.metadata ->> 'poll_id' = p.id::text);

update public.poll p
set thread_post_id = tp.id
from public.thread_post tp
where tp.metadata ->> 'poll_id' = p.id::text and p.thread_post_id is null;

create or replace function public.global_space_id()
returns uuid
language sql
stable
as $$
  select id from public.space where slug = 'global' limit 1;
$$;

create or replace function public.compute_scores(
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_score(user_id, global_score, local_score, analytic_score)
  with target_users as (
    select ap.user_id from public.app_profile ap where p_user_id is null or ap.user_id = p_user_id
  ),
  reputation_totals as (
    select rl.user_id,
           coalesce(sum(rl.delta), 0) as total_reputation,
           coalesce(sum(rl.delta) filter (where rl.event_type = 'prediction_accuracy'), 0) as prediction_reputation,
           coalesce(sum(rl.delta) filter (where rl.event_type = 'post_participation' and rl.reference_entity_type = 'poll'), 0) as poll_reputation
    from public.reputation_ledger rl
    join target_users tu on tu.user_id = rl.user_id
    group by rl.user_id
  ),
  comment_reactions as (
    select p.author_user_id as user_id,
           coalesce(sum(case when r.reaction_type = 'upvote' then r.weight else -r.weight end), 0) as reaction_balance,
           coalesce(sum(case when coalesce(s.space_role, 'legacy') in ('party', 'bloc') then 1 else 0 end), 0) as local_comment_count
    from public.post p
    join target_users tu on tu.user_id = p.author_user_id
    left join public.reaction r on r.target_type = 'comment' and r.target_id = p.id
    left join public.thread_post tp on tp.id = p.thread_post_id
    left join public.topic t on t.id = coalesce(tp.thread_id, p.topic_id)
    left join public.space s on s.id = t.space_id
    where p.post_status = 'visible'
    group by p.author_user_id
  ),
  thread_post_totals as (
    select tp.created_by as user_id,
           count(*)::numeric as thread_post_count,
           coalesce(sum(case when coalesce(s.space_role, 'legacy') in ('party', 'bloc') then 2 else 0 end), 0)::numeric as local_thread_post_score
    from public.thread_post tp
    join target_users tu on tu.user_id = tp.created_by
    join public.topic t on t.id = tp.thread_id
    left join public.space s on s.id = t.space_id
    where tp.status = 'published'
    group by tp.created_by
  )
  select tu.user_id,
    round(coalesce(rt.total_reputation, 0) + greatest(coalesce(cr.reaction_balance, 0), 0) + coalesce(tpt.thread_post_count, 0), 3),
    round(coalesce(tpt.local_thread_post_score, 0) + coalesce(cr.local_comment_count, 0), 3),
    round(coalesce(rt.prediction_reputation, 0) + (greatest(coalesce(cr.reaction_balance, 0), 0) * 0.5) + (coalesce(rt.poll_reputation, 0) * 0.25), 3)
  from target_users tu
  left join reputation_totals rt on rt.user_id = tu.user_id
  left join comment_reactions cr on cr.user_id = tu.user_id
  left join thread_post_totals tpt on tpt.user_id = tu.user_id
  on conflict (user_id) do update
    set global_score = excluded.global_score,
        local_score = excluded.local_score,
        analytic_score = excluded.analytic_score,
        updated_at = timezone('utc', now());
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
declare
  result_row public.topic;
  target_space_id uuid;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;
  target_space_id := coalesce(p_space_id, public.global_space_id());
  if target_space_id is null then
    raise exception 'A global space must exist before creating threads';
  end if;
  insert into public.topic(space_id, slug, title, description, topic_status, visibility, created_by, close_at, entity_id, thread_kind, campaign_cycle)
  values (
    target_space_id,
    lower(regexp_replace(regexp_replace(coalesce(p_title, 'thread') || '-' || substr(gen_random_uuid()::text, 1, 8), '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'))::citext,
    p_title,
    p_description,
    'open',
    'public',
    public.current_user_id(),
    coalesce(p_close_at, timezone('utc', now()) + interval '14 days'),
    p_entity_id,
    'issue',
    'presidentielle_2027'
  )
  returning * into result_row;
  perform public.log_audit_event('topic', result_row.id, 'create_thread', jsonb_build_object('entity_id', p_entity_id, 'space_id', target_space_id));
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
declare
  result_row public.thread_post;
  thread_row public.topic%rowtype;
  question_data jsonb;
  option_data jsonb;
  poll_id uuid;
  poll_question_id uuid;
  market_prediction_type public.prediction_type;
  market_scoring_method public.prediction_scoring_method;
  market_aggregation_method public.prediction_aggregation_method;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;
  select * into thread_row from public.topic where id = p_thread_id;
  if thread_row.id is null or not public.can_read_topic(thread_row) then
    raise exception 'Thread is not readable';
  end if;
  if thread_row.topic_status <> 'open' then
    raise exception 'Posts can only be created on open threads';
  end if;
  if p_type = 'market' and exists (select 1 from public.thread_post tp where tp.thread_id = p_thread_id and tp.type = 'market' and tp.status <> 'archived') then
    raise exception 'Only one market post is allowed per thread in phase 1';
  end if;

  insert into public.thread_post(thread_id, type, title, content, metadata, entity_id, created_by, status)
  values (p_thread_id, p_type, p_title, p_content, coalesce(p_metadata, '{}'::jsonb), coalesce((p_metadata ->> 'entity_id')::uuid, thread_row.entity_id), public.current_user_id(), 'published')
  returning * into result_row;

  if p_type = 'poll' then
    insert into public.poll(space_id, topic_id, created_by, title, description, poll_status, visibility, open_at, close_at, thread_post_id)
    values (thread_row.space_id, thread_row.id, public.current_user_id(), coalesce(p_title, p_metadata ->> 'title', thread_row.title), coalesce(p_content, p_metadata ->> 'description'), 'open', thread_row.visibility, timezone('utc', now()), coalesce((p_metadata ->> 'close_at')::timestamptz, thread_row.close_at), result_row.id)
    returning id into poll_id;

    for question_data in select value from jsonb_array_elements(coalesce(p_metadata -> 'questions', '[]'::jsonb)) loop
      insert into public.poll_question(poll_id, prompt, question_type, sort_order)
      values (poll_id, coalesce(question_data ->> 'prompt', 'Question'), coalesce((question_data ->> 'question_type')::public.poll_question_type, 'single_choice'), coalesce((question_data ->> 'sort_order')::integer, 0))
      returning id into poll_question_id;

      for option_data in select value from jsonb_array_elements(coalesce(question_data -> 'options', '[]'::jsonb)) loop
        insert into public.poll_option(poll_question_id, label, sort_order)
        values (poll_question_id, coalesce(option_data ->> 'label', option_data #>> '{}'), coalesce((option_data ->> 'sort_order')::integer, 0));
      end loop;
    end loop;
  elsif p_type = 'market' then
    market_prediction_type := coalesce((p_metadata ->> 'prediction_type')::public.prediction_type, 'binary');
    market_scoring_method := coalesce((p_metadata ->> 'scoring_method')::public.prediction_scoring_method, 'exact_match');
    market_aggregation_method := coalesce((p_metadata ->> 'aggregation_method')::public.prediction_aggregation_method,
      case
        when market_prediction_type = 'binary' then 'binary_split'::public.prediction_aggregation_method
        when market_prediction_type = 'categorical_closed' then 'option_distribution'::public.prediction_aggregation_method
        when market_prediction_type = 'date_value' then 'median_distribution'::public.prediction_aggregation_method
        when market_prediction_type = 'ordinal_scale' then 'ordinal_summary'::public.prediction_aggregation_method
        else 'numeric_summary'::public.prediction_aggregation_method
      end
    );

    insert into public.prediction_question(topic_id, thread_post_id, prediction_type, title, unit_label, min_numeric_value, max_numeric_value, min_date_value, max_date_value, ordinal_min, ordinal_max, scoring_method, aggregation_method, allow_submission_update)
    values (
      p_thread_id,
      result_row.id,
      market_prediction_type,
      coalesce(p_title, p_metadata ->> 'question', thread_row.title),
      p_metadata ->> 'unit_label',
      (p_metadata ->> 'min_numeric_value')::numeric,
      (p_metadata ->> 'max_numeric_value')::numeric,
      (p_metadata ->> 'min_date_value')::date,
      (p_metadata ->> 'max_date_value')::date,
      (p_metadata ->> 'ordinal_min')::integer,
      (p_metadata ->> 'ordinal_max')::integer,
      market_scoring_method,
      market_aggregation_method,
      coalesce((p_metadata ->> 'allow_submission_update')::boolean, true)
    )
    on conflict (topic_id) do update
      set thread_post_id = excluded.thread_post_id,
          prediction_type = excluded.prediction_type,
          title = excluded.title,
          unit_label = excluded.unit_label,
          min_numeric_value = excluded.min_numeric_value,
          max_numeric_value = excluded.max_numeric_value,
          min_date_value = excluded.min_date_value,
          max_date_value = excluded.max_date_value,
          ordinal_min = excluded.ordinal_min,
          ordinal_max = excluded.ordinal_max,
          scoring_method = excluded.scoring_method,
          aggregation_method = excluded.aggregation_method,
          allow_submission_update = excluded.allow_submission_update;

    if market_prediction_type = 'categorical_closed' then
      delete from public.prediction_option where topic_id = p_thread_id;
      for option_data in select value from jsonb_array_elements(coalesce(p_metadata -> 'options', '[]'::jsonb)) loop
        insert into public.prediction_option(topic_id, slug, label, sort_order)
        values (
          p_thread_id,
          lower(regexp_replace(regexp_replace(coalesce(option_data ->> 'slug', option_data ->> 'label', 'option'), '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'))::citext,
          coalesce(option_data ->> 'label', option_data #>> '{}'),
          coalesce((option_data ->> 'sort_order')::integer, 0)
        );
      end loop;
    end if;
  end if;

  insert into public.reputation_ledger(user_id, event_type, delta, reference_entity_type, reference_entity_id)
  values (public.current_user_id(), 'post_participation', 1, 'post', result_row.id);
  perform public.compute_scores(public.current_user_id());
  perform public.log_audit_event('post', result_row.id, 'create_thread_post', jsonb_build_object('thread_id', p_thread_id, 'type', p_type));
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
declare
  result_row public.post;
  parent_row public.post%rowtype;
  thread_post_row public.thread_post%rowtype;
  thread_row public.topic%rowtype;
  comment_depth integer := 0;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;
  select * into thread_post_row from public.thread_post where id = p_thread_post_id;
  if thread_post_row.id is null then
    raise exception 'Thread post not found';
  end if;
  select * into thread_row from public.topic where id = thread_post_row.thread_id;
  if thread_row.id is null or not public.can_read_topic(thread_row) then
    raise exception 'Thread is not readable';
  end if;
  if p_parent_post_id is not null then
    select * into parent_row from public.post where id = p_parent_post_id;
    if parent_row.id is null then
      raise exception 'Parent comment not found';
    end if;
    if parent_row.thread_post_id is distinct from p_thread_post_id then
      raise exception 'Parent comment must belong to the same thread post';
    end if;
    comment_depth := parent_row.depth + 1;
  end if;

  insert into public.post(space_id, topic_id, author_user_id, post_type, post_status, title, body_markdown, body_plaintext, thread_post_id, parent_post_id, depth)
  values (thread_row.space_id, thread_row.id, public.current_user_id(), 'discussion', 'visible', null, coalesce(p_body_markdown, ''), coalesce(p_body_markdown, ''), p_thread_post_id, p_parent_post_id, comment_depth)
  returning * into result_row;

  insert into public.reputation_ledger(user_id, event_type, delta, reference_entity_type, reference_entity_id)
  values (public.current_user_id(), 'post_participation', 1, 'post', result_row.id);
  perform public.compute_scores(public.current_user_id());
  perform public.log_audit_event('post', result_row.id, 'create_comment', jsonb_build_object('thread_post_id', p_thread_post_id));
  return result_row;
end;
$$;
create or replace function public.vote_poll(
  p_poll_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  poll_row public.poll%rowtype;
  answer_data jsonb;
  response_count integer := 0;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;
  select * into poll_row from public.poll where id = p_poll_id;
  if poll_row.id is null or not public.can_read_poll(poll_row) then
    raise exception 'Poll is not readable';
  end if;
  if poll_row.poll_status <> 'open' then
    raise exception 'Poll is not open';
  end if;

  for answer_data in select value from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    insert into public.poll_response(poll_id, poll_question_id, user_id, selected_option_id, ordinal_value, weight)
    values (
      p_poll_id,
      (answer_data ->> 'poll_question_id')::uuid,
      public.current_user_id(),
      (answer_data ->> 'selected_option_id')::uuid,
      (answer_data ->> 'ordinal_value')::integer,
      coalesce((answer_data ->> 'weight')::numeric, 1)
    )
    on conflict (poll_question_id, user_id) do update
      set selected_option_id = excluded.selected_option_id,
          ordinal_value = excluded.ordinal_value,
          weight = excluded.weight,
          submitted_at = timezone('utc', now());
    response_count := response_count + 1;
  end loop;

  insert into public.reputation_ledger(user_id, event_type, delta, reference_entity_type, reference_entity_id)
  values (public.current_user_id(), 'post_participation', 1, 'poll', p_poll_id);
  perform public.compute_scores(public.current_user_id());
  perform public.log_audit_event('poll', p_poll_id, 'vote_poll', jsonb_build_object('response_count', response_count));
  return jsonb_build_object('poll_id', p_poll_id, 'response_count', response_count, 'status', 'recorded');
end;
$$;

create or replace function public.place_bet(
  p_thread_id uuid,
  p_thread_post_id uuid default null,
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
  thread_post_row public.thread_post%rowtype;
  result_row public.prediction_submission;
begin
  if p_thread_post_id is not null then
    select * into thread_post_row from public.thread_post where id = p_thread_post_id;
    if thread_post_row.id is null then
      raise exception 'Market post not found';
    end if;
    if thread_post_row.thread_id <> p_thread_id then
      raise exception 'Market post does not belong to the thread';
    end if;
  end if;

  select * into result_row
  from public.rpc_submit_prediction(
    p_thread_id,
    p_answer_boolean,
    p_answer_date,
    p_answer_numeric,
    p_answer_option_id,
    p_answer_ordinal,
    coalesce(p_source_context, case when p_thread_post_id is null then null else 'thread_post:' || p_thread_post_id::text end)
  );

  perform public.compute_scores(public.current_user_id());
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
declare
  result_row public.reaction;
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

  insert into public.reaction(target_type, target_id, user_id, reaction_type, weight)
  values (p_target_type, p_target_id, public.current_user_id(), p_reaction_type, 1)
  on conflict (target_type, target_id, user_id) do update
    set reaction_type = excluded.reaction_type,
        weight = excluded.weight,
        created_at = timezone('utc', now())
  returning * into result_row;

  perform public.compute_scores(target_author);
  return result_row;
end;
$$;

create or replace function public.publish_poll_wave(
  p_poll_wave_id uuid
)
returns public.poll_wave
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.poll_wave%rowtype;
  global_space uuid;
  summary_post_id uuid;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;
  global_space := public.global_space_id();
  if global_space is null then
    raise exception 'Global space is required';
  end if;
  select * into result_row from public.poll_wave where id = p_poll_wave_id;
  if result_row.id is null then
    raise exception 'Poll wave not found';
  end if;

  if result_row.thread_id is null then
    insert into public.topic(space_id, slug, title, description, topic_status, visibility, created_by, close_at, thread_kind, campaign_cycle)
    values (
      global_space,
      lower(regexp_replace(regexp_replace('poll-wave-' || result_row.week_start::text, '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'))::citext,
      result_row.title,
      coalesce(result_row.summary, 'Sondage hebdomadaire de la presidentielle.'),
      'open',
      'public',
      public.current_user_id(),
      timezone('utc', now()) + interval '7 days',
      'poll_wave',
      'presidentielle_2027'
    )
    returning id into result_row.thread_id;
  end if;

  insert into public.thread_post(thread_id, type, title, content, metadata, created_by, status)
  values (
    result_row.thread_id,
    'article',
    result_row.title,
    coalesce(result_row.summary, 'Publication de la wave hebdomadaire et ouverture du fil associe.'),
    jsonb_build_object('poll_wave_id', result_row.id, 'kind', 'wave_summary'),
    public.current_user_id(),
    'published'
  )
  returning id into summary_post_id;

  update public.poll_wave
  set thread_id = result_row.thread_id,
      status = 'published',
      published_at = timezone('utc', now()),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('summary_post_id', summary_post_id)
  where id = p_poll_wave_id
  returning * into result_row;

  perform public.log_audit_event('topic', result_row.thread_id, 'publish_poll_wave', jsonb_build_object('poll_wave_id', result_row.id));
  return result_row;
end;
$$;
create or replace view public.v_thread_posts as
with reaction_rollup as (
  select r.target_id as thread_post_id,
         coalesce(sum(case when r.reaction_type = 'upvote' then r.weight else 0 end), 0) as upvote_weight,
         coalesce(sum(case when r.reaction_type = 'downvote' then r.weight else 0 end), 0) as downvote_weight
  from public.reaction r
  where r.target_type = 'thread_post'
  group by r.target_id
),
comment_rollup as (
  select p.thread_post_id, count(*) filter (where p.post_status = 'visible') as comment_count
  from public.post p
  where p.thread_post_id is not null
  group by p.thread_post_id
)
select tp.id, tp.thread_id, tp.type, tp.title, tp.content, tp.metadata, tp.entity_id, pe.slug as entity_slug, pe.name as entity_name, tp.created_by, ap.username, ap.display_name, tp.created_at, tp.updated_at, tp.status,
       coalesce(rr.upvote_weight, 0) as upvote_weight,
       coalesce(rr.downvote_weight, 0) as downvote_weight,
       coalesce(rr.upvote_weight, 0) - coalesce(rr.downvote_weight, 0) as weighted_votes,
       coalesce(cr.comment_count, 0) as comment_count
from public.thread_post tp
join public.topic t on t.id = tp.thread_id
join public.app_profile ap on ap.user_id = tp.created_by
left join public.political_entity pe on pe.id = tp.entity_id
left join reaction_rollup rr on rr.thread_post_id = tp.id
left join comment_rollup cr on cr.thread_post_id = tp.id
where tp.status = 'published' and public.effective_topic_visibility(t) = 'public';

create or replace view public.v_post_comments as
with reaction_rollup as (
  select r.target_id as comment_id,
         coalesce(sum(case when r.reaction_type = 'upvote' then r.weight else 0 end), 0) as upvote_weight,
         coalesce(sum(case when r.reaction_type = 'downvote' then r.weight else 0 end), 0) as downvote_weight
  from public.reaction r
  where r.target_type = 'comment'
  group by r.target_id
)
select p.id, p.topic_id as thread_id, p.thread_post_id, p.parent_post_id, p.depth, p.author_user_id, ap.username, ap.display_name, p.title, p.body_markdown, p.created_at, p.updated_at, p.post_status,
       coalesce(rr.upvote_weight, 0) as upvote_weight,
       coalesce(rr.downvote_weight, 0) as downvote_weight,
       round((coalesce(rr.upvote_weight, 0) - coalesce(rr.downvote_weight, 0)) + exp(-(extract(epoch from (timezone('utc', now()) - p.created_at)) / 3600.0) / 72.0), 6) as comment_score
from public.post p
join public.topic t on t.id = p.topic_id
join public.app_profile ap on ap.user_id = p.author_user_id
left join reaction_rollup rr on rr.comment_id = p.id
where p.post_status = 'visible' and public.effective_topic_visibility(t) = 'public';

create or replace view public.v_user_scores as
select us.user_id, pp.display_name, ap.username, us.global_score, us.local_score, us.analytic_score, us.updated_at
from public.user_score us
join public.app_profile ap on ap.user_id = us.user_id
left join public.v_public_profiles pp on pp.user_id = us.user_id;

create or replace view public.v_global_leaderboard as
select vus.*, rank() over (order by vus.global_score desc, vus.analytic_score desc, vus.updated_at asc) as global_rank
from public.v_user_scores vus;

create or replace view public.v_entity_leaderboard as
with local_points as (
  select t.entity_id, tp.created_by as user_id, count(*)::numeric * 2 as local_points
  from public.thread_post tp join public.topic t on t.id = tp.thread_id
  where t.entity_id is not null and tp.status = 'published'
  group by t.entity_id, tp.created_by
  union all
  select t.entity_id, p.author_user_id as user_id, count(*)::numeric as local_points
  from public.post p join public.topic t on t.id = p.topic_id
  where t.entity_id is not null and p.post_status = 'visible'
  group by t.entity_id, p.author_user_id
),
entity_scores as (
  select entity_id, user_id, sum(local_points) as local_score from local_points group by entity_id, user_id
)
select es.entity_id, pe.slug as entity_slug, pe.name as entity_name, es.user_id, ap.username, coalesce(pp.display_name, ap.display_name) as display_name, es.local_score,
       rank() over (partition by es.entity_id order by es.local_score desc, ap.username asc) as local_rank
from entity_scores es
join public.political_entity pe on pe.id = es.entity_id
join public.app_profile ap on ap.user_id = es.user_id
left join public.v_public_profiles pp on pp.user_id = es.user_id;

create or replace view public.v_poll_wave_summary as
select pw.id, pw.week_start, pw.status, pw.title, pw.summary, pw.thread_id, pw.created_at, pw.updated_at, pw.published_at,
       count(distinct p.id) filter (where p.topic_id = pw.thread_id) as poll_count,
       count(distinct tp.id) filter (where tp.thread_id = pw.thread_id) as thread_post_count
from public.poll_wave pw
left join public.poll p on p.topic_id = pw.thread_id
left join public.thread_post tp on tp.thread_id = pw.thread_id
group by pw.id;

create or replace view public.v_thread_detail as
with thread_post_rollup as (
  select tp.thread_id,
         count(*) as thread_post_count,
         count(*) filter (where tp.type = 'article') as article_post_count,
         count(*) filter (where tp.type = 'poll') as poll_post_count,
         count(*) filter (where tp.type = 'market') as market_post_count,
         max(tp.created_at) as latest_thread_post_at
  from public.thread_post tp
  where tp.status = 'published'
  group by tp.thread_id
)
select t.id, t.space_id, t.slug, t.title, t.description, t.topic_status, public.effective_topic_visibility(t) as effective_visibility, t.primary_territory_id, t.open_at, t.close_at, t.created_at,
       t.entity_id, pe.slug as entity_slug, pe.name as entity_name, t.thread_kind, t.campaign_cycle,
       s.slug as space_slug, s.name as space_name, s.space_role,
       coalesce(tpsc.visible_post_count, 0) as visible_post_count,
       coalesce(tpsc.active_prediction_count, 0) as active_prediction_count,
       coalesce(vpa.submission_count, 0) as submission_count,
       vpa.prediction_type,
       coalesce(tpr.thread_post_count, 0) as thread_post_count,
       coalesce(tpr.article_post_count, 0) as article_post_count,
       coalesce(tpr.poll_post_count, 0) as poll_post_count,
       coalesce(tpr.market_post_count, 0) as market_post_count,
       tpr.latest_thread_post_at,
       round(
         coalesce(hftc.editorial_feed_score, 0)
         + least(coalesce(tpr.thread_post_count, 0)::numeric * 0.03, 0.15)
         + case
             when tpr.latest_thread_post_at is not null
               and tpr.latest_thread_post_at >= timezone('utc', now()) - interval '72 hours'
             then 0.08
             else 0
           end,
         6
       ) as thread_score,
       hftc.feed_reason_code,
       hftc.feed_reason_label
from public.topic t
join public.topic_public_summary_cache tpsc on tpsc.id = t.id
left join public.topic_prediction_aggregate_cache vpa on vpa.topic_id = t.id
left join thread_post_rollup tpr on tpr.thread_id = t.id
left join public.home_feed_topic_cache hftc on hftc.topic_id = t.id
left join public.space s on s.id = t.space_id
left join public.political_entity pe on pe.id = t.entity_id
where t.topic_status in ('open', 'locked', 'resolved', 'archived') and public.effective_topic_visibility(t) = 'public';

create or replace view public.v_feed_global as
select hftc.*, td.entity_id, td.entity_slug, td.entity_name, td.space_role, td.thread_post_count, td.latest_thread_post_at, coalesce(td.thread_score, hftc.editorial_feed_score) as thread_score
from public.home_feed_topic_cache hftc
join public.v_thread_detail td on td.id = hftc.topic_id;

create or replace view public.v_feed_entity as
select * from public.v_feed_global where entity_id is not null;
create or replace function public.get_feed_global(
  p_limit integer default 20,
  p_cursor_topic_id uuid default null,
  p_user_id uuid default null
)
returns setof public.v_feed_global
language sql
stable
as $$
  with cursor_rank as (
    select editorial_feed_rank as rank_value from public.v_feed_global where topic_id = p_cursor_topic_id
  )
  select *
  from public.v_feed_global fg
  where p_cursor_topic_id is null or fg.editorial_feed_rank > (select rank_value from cursor_rank)
  order by fg.editorial_feed_rank asc
  limit greatest(coalesce(p_limit, 20), 1);
$$;

create or replace function public.get_feed_entity(
  p_entity_id uuid,
  p_limit integer default 20,
  p_cursor_topic_id uuid default null,
  p_user_id uuid default null
)
returns setof public.v_feed_global
language sql
stable
as $$
  with cursor_rank as (
    select editorial_feed_rank as rank_value from public.v_feed_global where topic_id = p_cursor_topic_id
  )
  select *
  from public.v_feed_global fg
  where fg.entity_id = p_entity_id
    and (p_cursor_topic_id is null or fg.editorial_feed_rank > (select rank_value from cursor_rank))
  order by fg.editorial_feed_rank asc
  limit greatest(coalesce(p_limit, 20), 1);
$$;

select public.compute_scores();

grant select on public.v_thread_posts, public.v_post_comments, public.v_user_scores, public.v_global_leaderboard, public.v_entity_leaderboard, public.v_poll_wave_summary, public.v_thread_detail, public.v_feed_global, public.v_feed_entity to anon, authenticated;
grant execute on function public.global_space_id() to anon, authenticated;
grant execute on function public.get_feed_global(integer, uuid, uuid) to anon, authenticated;
grant execute on function public.get_feed_entity(uuid, integer, uuid, uuid) to anon, authenticated;
grant execute on function public.compute_scores(uuid) to authenticated;
grant execute on function public.create_thread(text, text, uuid, uuid, timestamptz) to authenticated;
grant execute on function public.create_post(uuid, public.thread_post_type, text, text, jsonb) to authenticated;
grant execute on function public.create_comment(uuid, uuid, text) to authenticated;
grant execute on function public.vote_poll(uuid, jsonb) to authenticated;
grant execute on function public.place_bet(uuid, uuid, boolean, date, numeric, uuid, integer, text) to authenticated;
grant execute on function public.react_post(public.reaction_target_type, uuid, public.reaction_type) to authenticated;
grant execute on function public.publish_poll_wave(uuid) to authenticated;

commit;
