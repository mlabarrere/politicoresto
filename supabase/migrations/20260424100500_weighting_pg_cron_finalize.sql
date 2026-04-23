begin;

-- ─────────────────────────────────────────────────────────────
-- Phase 3 — pg_cron job that enqueues {poll_id, final: true} for
-- polls whose deadline just passed.
--
-- Why a cron, not a trigger: `poll_status` is not updated by anyone;
-- the v_post_poll_summary view derives "closed" from `deadline_at`
-- alone. So there's no WRITE event to hang a trigger on. A minute-
-- granularity cron is fine — the worker's regular recompute already
-- catches the last few votes; this job just adds the explicit
-- "lock as final" message.
-- ─────────────────────────────────────────────────────────────

create extension if not exists pg_cron;

-- Helper that finds polls that JUST closed (deadline_at crossed UTC
-- now within the last minute) and for which no final estimate exists.
-- Idempotent: if a poll already has is_final=true in
-- survey_poll_estimate, we skip it.
create or replace function public.enqueue_newly_closed_polls()
returns integer
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare
  cnt integer := 0;
  r record;
begin
  for r in
    select pp.post_item_id as poll_id
    from public.post_poll pp
    left join public.survey_poll_estimate est on est.poll_id = pp.post_item_id
    where pp.deadline_at <= timezone('utc', now())
      and pp.deadline_at > timezone('utc', now()) - interval '5 minutes'
      and coalesce(est.is_final, false) = false
  loop
    perform pgmq.send(
      'weighting',
      jsonb_build_object('poll_id', r.poll_id, 'final', true)
    );
    cnt := cnt + 1;
  end loop;
  return cnt;
end;
$$;

comment on function public.enqueue_newly_closed_polls() is
  'Enqueue {poll_id, final: true} for polls that closed in the last 5 min and have no final estimate yet.';

-- Schedule the cron at 1-minute granularity. 5-minute lookback gives
-- slack for a transient Supabase outage.
do $$
begin
  -- Drop any stale schedule with the same name so the migration is
  -- idempotent across re-runs.
  if exists (select 1 from cron.job where jobname = 'weighting_enqueue_closed') then
    perform cron.unschedule('weighting_enqueue_closed');
  end if;
  perform cron.schedule(
    'weighting_enqueue_closed',
    '* * * * *',
    $cmd$select public.enqueue_newly_closed_polls()$cmd$
  );
end $$;

commit;
