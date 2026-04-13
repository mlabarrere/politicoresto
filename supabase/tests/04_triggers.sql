begin;
create extension if not exists pgtap;
select plan(7);

select has_trigger('public', 'app_profile', 'app_profile_touch_updated_at', 'app_profile touch trigger exists');
select has_trigger('public', 'topic', 'validate_topic_visibility_before_write', 'topic visibility trigger exists');
select has_trigger('public', 'poll', 'validate_poll_visibility_before_write', 'poll visibility trigger exists');
select has_trigger('public', 'prediction_submission', 'validate_prediction_submission_before_write', 'prediction validation trigger exists');
select has_trigger('public', 'prediction_submission', 'snapshot_prediction_submission_after_write', 'prediction history trigger exists');
select has_trigger('public', 'post', 'capture_post_revision_before_update', 'post revision trigger exists');
select has_trigger('auth', 'users', 'on_auth_user_created', 'auth provisioning trigger exists');

select finish();
rollback;
