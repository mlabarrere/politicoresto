-- Register the weighting-worker webhook as a trigger, durably
-- tracked by migrations rather than configured by clicking in the
-- Supabase dashboard. Per-environment URL + secret live in a config
-- table seeded out-of-band so the same migration code works on
-- staging (→ staging Railway) and prod (→ prod Railway).
--
-- Operators set the config via:
--
--   insert into public.weighting_worker_config (id, url, secret) values
--     (1, 'https://weighting-worker-<env>.up.railway.app/process',
--         '<shared-bearer-secret>')
--   on conflict (id) do update set url = excluded.url, secret = excluded.secret;
--
-- …which is read by the trigger each time a snapshot is inserted.
-- Empty config → trigger warns + no-ops (rather than blocking the
-- insert, which would block voting).
--
-- The webhook is kept separate from `trg_snapshot_enqueue` (which
-- enqueues into pgmq). pgmq is the durable buffer; the webhook is
-- the push signal to the worker to drain it.

create table if not exists public.weighting_worker_config (
  id    smallint primary key check (id = 1),
  url   text not null,
  secret text not null,
  updated_at timestamptz not null default now()
);

alter table public.weighting_worker_config enable row level security;
drop policy if exists weighting_worker_config_no_public on public.weighting_worker_config;
create policy weighting_worker_config_no_public
  on public.weighting_worker_config for all
  using (false) with check (false);

comment on table public.weighting_worker_config is
  'Per-environment webhook target for the Railway weighting worker. RLS denies all, only superuser / service_role reads.';

create or replace function public.tg_weighting_webhook_notify()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url    text;
  v_secret text;
begin
  select url, secret into v_url, v_secret
    from public.weighting_worker_config where id = 1;

  if v_url is null or v_url = '' then
    return new;
  end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('event', 'survey_respondent_snapshot.insert'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'authorization', 'Bearer ' || coalesce(v_secret, '')
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

comment on function public.tg_weighting_webhook_notify() is
  'AFTER INSERT on survey_respondent_snapshot: pokes the Railway weighting worker via HTTP so it drains pgmq. URL + secret come from public.weighting_worker_config (seeded per environment).';

drop trigger if exists weighting_worker_trigger on public.survey_respondent_snapshot;

create trigger weighting_worker_trigger
after insert on public.survey_respondent_snapshot
for each row
execute function public.tg_weighting_webhook_notify();
