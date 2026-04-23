begin;

-- ─────────────────────────────────────────────────────────────
-- Weighting worker — phase 1, migration 4/4
--
-- Creates the pgmq queue "weighting" and a trigger that enqueues a
-- {poll_id} message on every snapshot insert. The Python worker
-- long-polls this queue from Railway (or locally during the local-
-- first phase).
--
-- pgmq is installed as an extension on both staging + prod since
-- 2026-04-23. We `create extension if not exists` to make the local
-- stack self-sufficient (the extension is pre-installed on Supabase
-- Cloud but not in the CLI-bundled Postgres unless we ask).
-- ─────────────────────────────────────────────────────────────

create extension if not exists pgmq;

-- Idempotent queue creation. pgmq.create is a no-op if the queue
-- already exists, but we wrap in a DO block for explicit logging.
do $$
begin
  if not exists (
    select 1 from pgmq.list_queues() where queue_name = 'weighting'
  ) then
    perform pgmq.create('weighting');
  end if;
end $$;

-- Trigger function: on snapshot insert, enqueue the poll_id for
-- reweighting. SECURITY DEFINER because authenticated users insert
-- snapshots indirectly via the vote RPC; the trigger must execute
-- with queue-write privileges regardless of caller.
create or replace function public.tg_enqueue_weighting()
returns trigger
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  perform pgmq.send('weighting', jsonb_build_object('poll_id', new.poll_id));
  return new;
end;
$$;

comment on function public.tg_enqueue_weighting() is
  'Fan-out trigger: every new survey_respondent_snapshot enqueues its poll_id into pgmq.weighting for the Python worker to recompute.';

drop trigger if exists trg_snapshot_enqueue on public.survey_respondent_snapshot;
create trigger trg_snapshot_enqueue
  after insert on public.survey_respondent_snapshot
  for each row execute function public.tg_enqueue_weighting();

-- ─────────────────────────────────────────────────────────────
-- Test / observability helper — small public-facing RPC that
-- counts queue messages for a given poll_id. Used by the
-- weighting integration test; harmless in production (read-only,
-- nothing sensitive returned).
-- ─────────────────────────────────────────────────────────────
create or replace function public.weighting_queue_depth(p_poll_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pgmq
as $$
  select count(*)::integer
  from pgmq.q_weighting
  where (message->>'poll_id')::uuid = p_poll_id;
$$;

comment on function public.weighting_queue_depth(uuid) is
  'Count of pgmq.weighting messages referencing this poll. Observability / test helper.';

grant execute on function public.weighting_queue_depth(uuid) to anon, authenticated, service_role;

commit;
