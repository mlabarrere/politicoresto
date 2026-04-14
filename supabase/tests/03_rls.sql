begin;
create extension if not exists pgtap;
select plan(8);

select row_security_is_on('public', 'app_profile', 'rls enabled on app_profile');
select row_security_is_on('public', 'topic', 'rls enabled on topic');
select row_security_is_on('public', 'post', 'rls enabled on post');
select row_security_is_on('public', 'thread_post', 'rls enabled on thread_post');
select row_security_is_on('public', 'reaction', 'rls enabled on reaction');

select policies_are('public', 'topic', array['topic_owner_insert','topic_owner_update','topic_read'], 'topic policies match');
select policies_are('public', 'post', array['post_owner_insert','post_owner_update','post_read'], 'post policies match');
select policies_are('public', 'app_profile', array['app_profile_owner_select','app_profile_owner_update'], 'app_profile policies match');

select finish();
rollback;
