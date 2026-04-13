begin;
create extension if not exists pgtap;
select plan(10);

select ok(
  (select count(*) > 0 from public.v_home_feed_topics),
  'home feed is not empty with the minimal ux seed'
);

select results_eq(
  $$ select count(*) from public.v_home_feed_topics where derived_lifecycle_state = 'open' $$,
  $$ values (10::bigint) $$,
  'minimal ux seed exposes ten open topics in the home feed'
);

select results_eq(
  $$ select count(*) from public.v_home_feed_topics where derived_lifecycle_state = 'pending_resolution' $$,
  $$ values (4::bigint) $$,
  'minimal ux seed exposes four pending resolution topics in the home feed'
);

select ok(
  (select count(*) = 0 from public.v_home_feed_topics where feed_reason_code is null or feed_reason_label is null),
  'feed reason code and label are always populated'
);

select ok(
  (
    select count(*) = 0
    from public.v_home_feed_topics
    where topic_card_payload is null
       or topic_card_payload ->> 'topic_title' is null
       or topic_card_payload ->> 'derived_lifecycle_state' is null
       or topic_card_payload -> 'aggregate_payload' is null
       or topic_card_payload -> 'metrics_payload' is null
       or topic_card_payload ->> 'feed_reason_label' is null
  ),
  'topic_card_payload stays consumable without extra frontend logic'
);

select ok(
  (
    select count(*) >= 1
    from (
      select *
      from public.v_home_feed_topics
      order by editorial_feed_rank
      limit 10
    ) ranked
    where derived_lifecycle_state = 'pending_resolution'
  ),
  'at least one pending resolution topic appears in the top 10 when available'
);

select ok(
  (
    select count(*) >= 2
    from (
      select *
      from public.v_home_feed_topics
      order by editorial_feed_rank
      limit 10
    ) ranked
    where primary_territory_level in ('commune', 'department', 'region')
  ),
  'top 10 contains a visible territorial mix'
);

select ok(
  (
    select count(*) >= 1
    from (
      select *
      from public.v_home_feed_topics
      order by editorial_feed_rank
      limit 10
    ) ranked
    where primary_territory_level in ('country', 'macro')
  ),
  'top 10 keeps at least one country or macro topic visible'
);

select ok(
  (
    select count(distinct space_name) >= 4
    from (
      select *
      from public.v_home_feed_topics
      order by editorial_feed_rank
      limit 10
    ) ranked
  ),
  'top 10 spans at least four distinct spaces'
);

select ok(
  (
    select count(*) >= 1
    from public.v_home_feed_topics
    where primary_territory_level = 'macro'
  ),
  'the minimal ux seed keeps at least one macro topic in the feed population'
);

select finish();
rollback;
