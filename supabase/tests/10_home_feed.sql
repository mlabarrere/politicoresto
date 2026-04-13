begin;
create extension if not exists pgtap;
select plan(12);

select has_view('public', 'v_feed_topic_base', 'feed topic base view exists');
select has_view('public', 'v_feed_topic_signals', 'feed topic signals view exists');
select has_view('public', 'v_feed_topic_scored', 'feed topic scored view exists');
select has_view('public', 'v_home_feed_topics', 'home feed view exists');
select has_column('public', 'v_home_feed_topics', 'derived_lifecycle_state', 'home feed exposes derived lifecycle state');
select has_column('public', 'v_home_feed_topics', 'feed_reason_code', 'home feed exposes reason code');
select has_column('public', 'v_home_feed_topics', 'feed_reason_label', 'home feed exposes reason label');
select has_column('public', 'v_home_feed_topics', 'topic_card_payload', 'home feed exposes topic card payload');
select has_column('public', 'v_home_feed_topics', 'editorial_feed_score', 'home feed exposes editorial score');
select has_column('public', 'v_home_feed_topics', 'activity_score_raw', 'home feed exposes activity raw score');
select has_column('public', 'v_home_feed_topics', 'territorial_relevance_score_raw', 'home feed exposes territorial raw score');
select has_column('public', 'v_home_feed_topics', 'editorial_feed_rank', 'home feed exposes deterministic rank');

select finish();
rollback;
