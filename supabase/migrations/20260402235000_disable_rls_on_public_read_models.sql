begin;

alter table public.topic_public_summary_cache disable row level security;
alter table public.topic_prediction_aggregate_cache disable row level security;
alter table public.territory_prediction_rollup_cache disable row level security;
alter table public.home_feed_topic_cache disable row level security;

commit;
