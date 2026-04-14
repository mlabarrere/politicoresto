begin;
create extension if not exists pgtap;
select plan(11);

select has_table('public', 'app_profile', 'app_profile exists');
select has_table('public', 'topic', 'topic exists');
select has_table('public', 'thread_post', 'thread_post exists');
select has_table('public', 'post', 'post exists');
select has_table('public', 'reaction', 'reaction exists');
select has_table('public', 'political_entity', 'political_entity exists');
select has_table('public', 'user_private_political_profile', 'user_private_political_profile exists');

select has_view('public', 'v_feed_global', 'v_feed_global exists');
select has_view('public', 'v_thread_detail', 'v_thread_detail exists');
select has_view('public', 'v_thread_posts', 'v_thread_posts exists');
select has_view('public', 'v_post_comments', 'v_post_comments exists');

select finish();
rollback;
