begin;

create table if not exists public.post_poll (
  post_item_id uuid primary key references public.thread_post(id) on delete cascade,
  question text not null,
  deadline_at timestamptz not null,
  poll_status text not null default 'open' check (poll_status in ('open', 'closed')),
  created_by uuid not null references public.app_profile(user_id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint post_poll_window_chk check (deadline_at <= created_at + interval '48 hours')
);

create table if not exists public.post_poll_option (
  id uuid primary key default gen_random_uuid(),
  post_item_id uuid not null references public.post_poll(post_item_id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint post_poll_option_unique_sort unique (post_item_id, sort_order)
);

create table if not exists public.post_poll_response (
  id uuid primary key default gen_random_uuid(),
  post_item_id uuid not null references public.post_poll(post_item_id) on delete cascade,
  option_id uuid not null references public.post_poll_option(id) on delete restrict,
  user_id uuid not null references public.app_profile(user_id) on delete cascade,
  weight numeric not null default 1 check (weight > 0),
  answered_at timestamptz not null default timezone('utc', now()),
  constraint post_poll_response_unique_user unique (post_item_id, user_id)
);

create table if not exists public.post_poll_target_distribution (
  id uuid primary key default gen_random_uuid(),
  model_version text not null default 'fr_v1',
  dimension_key text not null,
  bucket_key text not null,
  target_share numeric not null check (target_share >= 0 and target_share <= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint post_poll_target_distribution_unique unique (model_version, dimension_key, bucket_key)
);

create table if not exists public.post_poll_snapshot (
  post_item_id uuid primary key references public.post_poll(post_item_id) on delete cascade,
  sample_size integer not null default 0,
  effective_sample_size numeric not null default 0,
  distance_score numeric not null default 0,
  coverage_score numeric not null default 0,
  stability_score numeric not null default 0,
  anti_brigading_score numeric not null default 50,
  representativity_score numeric not null default 0,
  raw_results jsonb not null default '[]'::jsonb,
  corrected_results jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default timezone('utc', now())
);

create index if not exists post_poll_deadline_idx on public.post_poll(deadline_at);
create index if not exists post_poll_option_post_item_idx on public.post_poll_option(post_item_id);
create index if not exists post_poll_response_post_item_idx on public.post_poll_response(post_item_id);
create index if not exists post_poll_response_user_idx on public.post_poll_response(user_id);
create index if not exists post_poll_target_dim_idx on public.post_poll_target_distribution(model_version, dimension_key) where is_active = true;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists post_poll_touch_updated_at on public.post_poll;
create trigger post_poll_touch_updated_at
before update on public.post_poll
for each row execute function public.touch_updated_at();

create or replace function public.can_read_post_poll(poll_row public.post_poll)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.thread_post tp
    join public.topic t on t.id = tp.thread_id
    where tp.id = poll_row.post_item_id
      and tp.status = 'published'
      and public.can_read_topic(t)
  );
$$;

create or replace function public.poll_bucket_for_user(
  p_user_id uuid,
  p_dimension_key text
)
returns text
language sql
stable
as $$
  select case
    when p_dimension_key = 'ideology_declared' then
      case when upp.declared_ideology_term_id is null then 'undeclared' else 'declared' end
    when p_dimension_key = 'profile_status' then coalesce(ap.profile_status::text, 'active')
    else 'unknown'
  end
  from public.app_profile ap
  left join public.user_private_political_profile upp on upp.user_id = ap.user_id
  where ap.user_id = p_user_id;
$$;

create or replace function public.recompute_post_poll_snapshot(
  p_post_item_id uuid
)
returns public.post_poll_snapshot
language plpgsql
security definer
set search_path = public
as $$
declare
  poll_row public.post_poll%rowtype;
  sample_n integer := 0;
  sum_w numeric := 0;
  sum_w2 numeric := 0;
  ess numeric := 0;
  coverage numeric := 0;
  distance_value numeric := 0;
  stability numeric := 0;
  anti_brigading numeric := 50;
  score numeric := 0;
  raw_json jsonb := '[]'::jsonb;
  corrected_json jsonb := '[]'::jsonb;
  result_row public.post_poll_snapshot%rowtype;
begin
  select * into poll_row from public.post_poll where post_item_id = p_post_item_id;
  if poll_row.post_item_id is null then
    raise exception 'Poll not found';
  end if;

  with response_enriched as (
    select
      r.id,
      r.option_id,
      r.user_id,
      greatest(
        0.33,
        least(
          3.0,
          coalesce(avg(
            td.target_share / nullif(obs.observed_share, 0)
          ), 1.0)
        )
      ) as weight
    from public.post_poll_response r
    left join lateral (
      select
        td.dimension_key,
        td.target_share,
        public.poll_bucket_for_user(r.user_id, td.dimension_key) as user_bucket
      from public.post_poll_target_distribution td
      where td.model_version = 'fr_v1' and td.is_active = true
    ) td on true
    left join lateral (
      select
        count(*)::numeric / nullif((select count(*) from public.post_poll_response where post_item_id = p_post_item_id), 0)::numeric as observed_share
      from public.post_poll_response r2
      where r2.post_item_id = p_post_item_id
        and public.poll_bucket_for_user(r2.user_id, td.dimension_key) = td.user_bucket
    ) obs on td.dimension_key is not null
    where r.post_item_id = p_post_item_id
    group by r.id, r.option_id, r.user_id
  ),
  weight_write as (
    update public.post_poll_response r
    set weight = re.weight
    from response_enriched re
    where r.id = re.id
    returning r.option_id, r.weight
  ),
  weight_totals as (
    select
      count(*)::integer as sample_n,
      coalesce(sum(weight), 0)::numeric as sum_w,
      coalesce(sum(weight * weight), 0)::numeric as sum_w2
    from weight_write
  ),
  raw_counts as (
    select
      o.id as option_id,
      o.label as option_label,
      o.sort_order,
      count(r.id)::integer as raw_count
    from public.post_poll_option o
    left join public.post_poll_response r on r.option_id = o.id and r.post_item_id = p_post_item_id
    where o.post_item_id = p_post_item_id and o.is_active = true
    group by o.id, o.label, o.sort_order
  ),
  corrected_counts as (
    select
      o.id as option_id,
      coalesce(sum(r.weight), 0)::numeric as corrected_count
    from public.post_poll_option o
    left join public.post_poll_response r on r.option_id = o.id and r.post_item_id = p_post_item_id
    where o.post_item_id = p_post_item_id and o.is_active = true
    group by o.id
  ),
  totals as (
    select
      coalesce(sum(rc.raw_count), 0)::numeric as raw_total,
      coalesce(sum(cc.corrected_count), 0)::numeric as corrected_total
    from raw_counts rc
    join corrected_counts cc on cc.option_id = rc.option_id
  ),
  combined as (
    select
      rc.option_id,
      rc.option_label,
      rc.sort_order,
      rc.raw_count,
      case when t.raw_total = 0 then 0 else rc.raw_count / t.raw_total end as raw_share,
      cc.corrected_count,
      case when t.corrected_total = 0 then 0 else cc.corrected_count / t.corrected_total end as corrected_share
    from raw_counts rc
    join corrected_counts cc on cc.option_id = rc.option_id
    cross join totals t
  )
  select
    wt.sample_n,
    wt.sum_w,
    wt.sum_w2,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'option_id', c.option_id,
          'option_label', c.option_label,
          'sort_order', c.sort_order,
          'response_count', c.raw_count,
          'share', round((c.raw_share * 100)::numeric, 2)
        )
        order by c.sort_order
      ),
      '[]'::jsonb
    ),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'option_id', c.option_id,
          'option_label', c.option_label,
          'sort_order', c.sort_order,
          'weighted_count', round(c.corrected_count, 4),
          'share', round((c.corrected_share * 100)::numeric, 2)
        )
        order by c.sort_order
      ),
      '[]'::jsonb
    )
  into sample_n, sum_w, sum_w2, raw_json, corrected_json
  from weight_totals wt
  cross join combined c;

  if sum_w2 > 0 then
    ess := (sum_w * sum_w) / sum_w2;
  else
    ess := 0;
  end if;

  with target_cells as (
    select td.dimension_key, td.bucket_key, td.target_share
    from public.post_poll_target_distribution td
    where td.model_version = 'fr_v1' and td.is_active = true
  ),
  observed_cells as (
    select
      td.dimension_key,
      public.poll_bucket_for_user(r.user_id, td.dimension_key) as bucket_key,
      count(*)::numeric / nullif((select count(*) from public.post_poll_response where post_item_id = p_post_item_id), 0)::numeric as observed_share
    from public.post_poll_response r
    join public.post_poll_target_distribution td on td.model_version = 'fr_v1' and td.is_active = true
    where r.post_item_id = p_post_item_id
    group by td.dimension_key, bucket_key
  )
  select
    coalesce(avg(case when oc.bucket_key is null then 0 else 1 end), 0),
    coalesce(avg(abs(coalesce(oc.observed_share, 0) - tc.target_share)), 1)
  into coverage, distance_value
  from target_cells tc
  left join observed_cells oc
    on oc.dimension_key = tc.dimension_key
   and oc.bucket_key = tc.bucket_key;

  stability := greatest(0, least(1, ess / 200.0));
  anti_brigading := case
    when sample_n < 10 then 20
    when sample_n < 30 then 45
    else 70
  end;

  score :=
    (coverage * 35.0) +
    ((1 - least(1, distance_value * 4)) * 30.0) +
    (stability * 25.0) +
    ((anti_brigading / 100.0) * 10.0);

  insert into public.post_poll_snapshot(
    post_item_id,
    sample_size,
    effective_sample_size,
    distance_score,
    coverage_score,
    stability_score,
    anti_brigading_score,
    representativity_score,
    raw_results,
    corrected_results,
    computed_at
  )
  values (
    p_post_item_id,
    sample_n,
    round(ess, 4),
    round(greatest(0, 100 - least(100, distance_value * 100)), 2),
    round(coverage * 100, 2),
    round(stability * 100, 2),
    anti_brigading,
    round(greatest(0, least(100, score)), 2),
    raw_json,
    corrected_json,
    timezone('utc', now())
  )
  on conflict (post_item_id) do update
  set sample_size = excluded.sample_size,
      effective_sample_size = excluded.effective_sample_size,
      distance_score = excluded.distance_score,
      coverage_score = excluded.coverage_score,
      stability_score = excluded.stability_score,
      anti_brigading_score = excluded.anti_brigading_score,
      representativity_score = excluded.representativity_score,
      raw_results = excluded.raw_results,
      corrected_results = excluded.corrected_results,
      computed_at = excluded.computed_at
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.create_post_poll(
  p_post_item_id uuid,
  p_question text,
  p_deadline_at timestamptz,
  p_options jsonb
)
returns public.post_poll
language plpgsql
security definer
set search_path = public
as $$
declare
  post_row public.thread_post%rowtype;
  result_row public.post_poll%rowtype;
  option_value text;
  idx integer := 0;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select * into post_row from public.thread_post where id = p_post_item_id;
  if post_row.id is null then
    raise exception 'Post item not found';
  end if;
  if post_row.created_by <> public.current_user_id() then
    raise exception 'Only post owner can attach poll';
  end if;

  if nullif(btrim(coalesce(p_question, '')), '') is null then
    raise exception 'Poll question required';
  end if;

  if p_deadline_at is null or p_deadline_at > timezone('utc', now()) + interval '48 hours' then
    raise exception 'Poll deadline must be set within 48h';
  end if;

  insert into public.post_poll(post_item_id, question, deadline_at, created_by)
  values (p_post_item_id, btrim(p_question), p_deadline_at, public.current_user_id())
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

  perform public.recompute_post_poll_snapshot(p_post_item_id);
  return result_row;
end;
$$;

create or replace function public.submit_post_poll_vote(
  p_post_item_id uuid,
  p_option_id uuid
)
returns public.post_poll_snapshot
language plpgsql
security definer
set search_path = public
as $$
declare
  poll_row public.post_poll%rowtype;
  option_exists boolean := false;
begin
  if public.current_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select * into poll_row from public.post_poll where post_item_id = p_post_item_id;
  if poll_row.post_item_id is null then
    raise exception 'Poll not found';
  end if;

  if poll_row.poll_status <> 'open' or poll_row.deadline_at <= timezone('utc', now()) then
    raise exception 'Poll is closed';
  end if;

  select exists (
    select 1 from public.post_poll_option o
    where o.id = p_option_id
      and o.post_item_id = p_post_item_id
      and o.is_active = true
  ) into option_exists;

  if not option_exists then
    raise exception 'Option not found for this poll';
  end if;

  insert into public.post_poll_response(post_item_id, option_id, user_id)
  values (p_post_item_id, p_option_id, public.current_user_id())
  on conflict (post_item_id, user_id) do update
    set option_id = excluded.option_id,
        answered_at = timezone('utc', now());

  return public.recompute_post_poll_snapshot(p_post_item_id);
end;
$$;

create or replace view public.v_post_poll_summary as
with options as (
  select
    o.post_item_id,
    jsonb_agg(
      jsonb_build_object(
        'option_id', o.id,
        'label', o.label,
        'sort_order', o.sort_order
      )
      order by o.sort_order
    ) as options_json
  from public.post_poll_option o
  where o.is_active = true
  group by o.post_item_id
),
my_votes as (
  select
    r.post_item_id,
    r.option_id as selected_option_id
  from public.post_poll_response r
  where r.user_id = auth.uid()
)
select
  pp.post_item_id,
  pp.question,
  pp.deadline_at,
  case
    when pp.deadline_at <= timezone('utc', now()) then 'closed'
    else pp.poll_status
  end as poll_status,
  coalesce(ps.sample_size, 0) as sample_size,
  coalesce(ps.effective_sample_size, 0) as effective_sample_size,
  coalesce(ps.representativity_score, 0) as representativity_score,
  coalesce(ps.coverage_score, 0) as coverage_score,
  coalesce(ps.distance_score, 0) as distance_score,
  coalesce(ps.stability_score, 0) as stability_score,
  coalesce(ps.anti_brigading_score, 0) as anti_brigading_score,
  coalesce(ps.raw_results, '[]'::jsonb) as raw_results,
  coalesce(ps.corrected_results, '[]'::jsonb) as corrected_results,
  coalesce(opt.options_json, '[]'::jsonb) as options,
  mv.selected_option_id,
  tp.thread_id as post_id,
  t.slug as post_slug,
  t.title as post_title
from public.post_poll pp
join public.thread_post tp on tp.id = pp.post_item_id
join public.topic t on t.id = tp.thread_id
left join public.post_poll_snapshot ps on ps.post_item_id = pp.post_item_id
left join options opt on opt.post_item_id = pp.post_item_id
left join my_votes mv on mv.post_item_id = pp.post_item_id
where public.can_read_topic(t);

alter table public.post_poll enable row level security;
alter table public.post_poll_option enable row level security;
alter table public.post_poll_response enable row level security;
alter table public.post_poll_target_distribution enable row level security;
alter table public.post_poll_snapshot enable row level security;

drop policy if exists post_poll_read on public.post_poll;
create policy post_poll_read on public.post_poll
for select
using (public.can_read_post_poll(post_poll));

drop policy if exists post_poll_owner_write on public.post_poll;
create policy post_poll_owner_write on public.post_poll
for all
using (created_by = auth.uid() or public.is_moderator())
with check (created_by = auth.uid() or public.is_moderator());

drop policy if exists post_poll_option_read on public.post_poll_option;
create policy post_poll_option_read on public.post_poll_option
for select
using (
  exists (
    select 1 from public.post_poll pp
    where pp.post_item_id = post_poll_option.post_item_id
      and public.can_read_post_poll(pp)
  )
);

drop policy if exists post_poll_option_owner_write on public.post_poll_option;
create policy post_poll_option_owner_write on public.post_poll_option
for all
using (
  exists (
    select 1 from public.post_poll pp
    where pp.post_item_id = post_poll_option.post_item_id
      and (pp.created_by = auth.uid() or public.is_moderator())
  )
)
with check (
  exists (
    select 1 from public.post_poll pp
    where pp.post_item_id = post_poll_option.post_item_id
      and (pp.created_by = auth.uid() or public.is_moderator())
  )
);

drop policy if exists post_poll_response_owner_select on public.post_poll_response;
create policy post_poll_response_owner_select on public.post_poll_response
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists post_poll_response_owner_write on public.post_poll_response;
create policy post_poll_response_owner_write on public.post_poll_response
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists post_poll_target_admin_write on public.post_poll_target_distribution;
create policy post_poll_target_admin_write on public.post_poll_target_distribution
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists post_poll_target_read on public.post_poll_target_distribution;
create policy post_poll_target_read on public.post_poll_target_distribution
for select
using (public.is_admin() or public.is_moderator());

drop policy if exists post_poll_snapshot_read on public.post_poll_snapshot;
create policy post_poll_snapshot_read on public.post_poll_snapshot
for select
using (
  exists (
    select 1 from public.post_poll pp
    where pp.post_item_id = post_poll_snapshot.post_item_id
      and public.can_read_post_poll(pp)
  )
);

drop policy if exists post_poll_snapshot_admin_write on public.post_poll_snapshot;
create policy post_poll_snapshot_admin_write on public.post_poll_snapshot
for all
using (public.is_admin() or public.is_moderator())
with check (public.is_admin() or public.is_moderator());

revoke all on function public.create_post_poll(uuid, text, timestamptz, jsonb) from public, anon;
revoke all on function public.submit_post_poll_vote(uuid, uuid) from public, anon;
revoke all on function public.recompute_post_poll_snapshot(uuid) from public, anon;

grant execute on function public.create_post_poll(uuid, text, timestamptz, jsonb) to authenticated;
grant execute on function public.submit_post_poll_vote(uuid, uuid) to authenticated;
grant execute on function public.recompute_post_poll_snapshot(uuid) to authenticated;

grant select on public.v_post_poll_summary to anon, authenticated;

insert into public.post_poll_target_distribution(model_version, dimension_key, bucket_key, target_share, is_active)
values
  ('fr_v1', 'ideology_declared', 'declared', 0.55, true),
  ('fr_v1', 'ideology_declared', 'undeclared', 0.45, true),
  ('fr_v1', 'profile_status', 'active', 0.97, true),
  ('fr_v1', 'profile_status', 'suspended', 0.02, true),
  ('fr_v1', 'profile_status', 'deleted', 0.01, true)
on conflict (model_version, dimension_key, bucket_key) do update
set target_share = excluded.target_share,
    is_active = excluded.is_active;

commit;
