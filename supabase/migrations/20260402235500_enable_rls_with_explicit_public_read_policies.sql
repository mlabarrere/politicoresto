begin;

alter table public.topic_public_summary_cache enable row level security;
alter table public.topic_prediction_aggregate_cache enable row level security;
alter table public.territory_prediction_rollup_cache enable row level security;
alter table public.home_feed_topic_cache enable row level security;

drop policy if exists topic_public_summary_cache_public_read on public.topic_public_summary_cache;
create policy topic_public_summary_cache_public_read
  on public.topic_public_summary_cache
  for select
  to anon, authenticated
  using (true);

drop policy if exists topic_prediction_aggregate_cache_public_read on public.topic_prediction_aggregate_cache;
create policy topic_prediction_aggregate_cache_public_read
  on public.topic_prediction_aggregate_cache
  for select
  to anon, authenticated
  using (true);

drop policy if exists territory_prediction_rollup_cache_public_read on public.territory_prediction_rollup_cache;
create policy territory_prediction_rollup_cache_public_read
  on public.territory_prediction_rollup_cache
  for select
  to anon, authenticated
  using (true);

drop policy if exists home_feed_topic_cache_public_read on public.home_feed_topic_cache;
create policy home_feed_topic_cache_public_read
  on public.home_feed_topic_cache
  for select
  to anon, authenticated
  using (true);

commit;
