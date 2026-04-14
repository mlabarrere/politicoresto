begin;
create extension if not exists pgtap;
select plan(8);

select has_function('public', 'create_thread', array['text', 'text', 'uuid', 'uuid', 'timestamp with time zone'], 'create_thread exists');
select has_function('public', 'create_post', array['uuid', 'thread_post_type', 'text', 'text', 'jsonb'], 'create_post exists');
select has_function('public', 'create_comment', array['uuid', 'uuid', 'text'], 'create_comment exists');
select has_function('public', 'react_post', array['reaction_target_type', 'uuid', 'reaction_type'], 'react_post exists');

select has_view('public', 'v_feed_global', 'v_feed_global exists');
select has_view('public', 'v_thread_detail', 'v_thread_detail exists');
select has_view('public', 'v_thread_posts', 'v_thread_posts exists');
select has_view('public', 'v_post_comments', 'v_post_comments exists');

select finish();
rollback;
