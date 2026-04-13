begin;
create extension if not exists pgtap;
select plan(18);

select has_table('public', 'political_entity', 'political_entity exists');
select has_table('public', 'thread_post', 'thread_post exists');
select has_table('public', 'reaction', 'reaction exists');
select has_table('public', 'user_score', 'user_score exists');
select has_table('public', 'poll_wave', 'poll_wave exists');

select has_column('public', 'topic', 'entity_id', 'topic.entity_id exists');
select has_column('public', 'topic', 'thread_kind', 'topic.thread_kind exists');
select has_column('public', 'topic', 'campaign_cycle', 'topic.campaign_cycle exists');
select has_column('public', 'post', 'thread_post_id', 'post.thread_post_id exists');
select has_column('public', 'post', 'parent_post_id', 'post.parent_post_id exists');
select has_column('public', 'poll', 'thread_post_id', 'poll.thread_post_id exists');
select has_column('public', 'prediction_question', 'thread_post_id', 'prediction_question.thread_post_id exists');

select has_view('public', 'v_feed_global', 'v_feed_global exists');
select has_view('public', 'v_feed_entity', 'v_feed_entity exists');
select has_view('public', 'v_thread_detail', 'v_thread_detail exists');
select has_view('public', 'v_thread_posts', 'v_thread_posts exists');

select has_function('public', 'create_thread', array['text', 'text', 'uuid', 'uuid', 'timestamp with time zone'], 'create_thread exists');
select has_function('public', 'create_post', array['uuid', 'thread_post_type', 'text', 'text', 'jsonb'], 'create_post exists');

select finish();
rollback;
