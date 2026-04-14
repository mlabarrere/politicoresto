begin;
create extension if not exists pgtap;
select plan(5);

select has_trigger('public', 'app_profile', 'app_profile_touch_updated_at', 'app_profile touch trigger exists');
select has_trigger('public', 'topic', 'validate_topic_visibility_before_write', 'topic visibility trigger exists');
select has_trigger('public', 'post', 'capture_post_revision_before_update', 'post revision trigger exists');
select has_trigger('auth', 'users', 'on_auth_user_created', 'auth provisioning trigger exists');
select has_function('public', 'touch_updated_at', array[]::text[], 'touch_updated_at trigger function exists');

select finish();
rollback;
