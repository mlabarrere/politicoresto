begin;
create extension if not exists pgtap;
select plan(14);

select row_security_is_on('public', 'app_profile', 'rls enabled on app_profile');
select row_security_is_on('public', 'topic', 'rls enabled on topic');
select row_security_is_on('public', 'post', 'rls enabled on post');
select row_security_is_on('public', 'prediction_submission', 'rls enabled on prediction_submission');
select row_security_is_on('public', 'poll', 'rls enabled on poll');
select row_security_is_on('public', 'moderation_report', 'rls enabled on moderation_report');
select row_security_is_on('public', 'audit_log', 'rls enabled on audit_log');

select policies_are('public', 'app_profile', array['app_profile_owner_select','app_profile_owner_update'], 'app_profile policies match');
select policies_are('public', 'topic', array['topic_owner_insert','topic_owner_update','topic_read'], 'topic policies match');
select policies_are('public', 'post', array['post_owner_insert','post_owner_update','post_read'], 'post policies match');
select policies_are('public', 'prediction_submission', array['prediction_submission_owner_insert','prediction_submission_owner_select','prediction_submission_owner_update'], 'prediction submission policies match');
select policies_are('public', 'poll', array['poll_owner_insert','poll_owner_update','poll_read'], 'poll policies match');
select policies_are('public', 'moderation_report', array['moderation_report_moderator_update','moderation_report_owner_insert','moderation_report_owner_select'], 'moderation report policies match');
select policies_are('public', 'card_rule', array['card_rule_admin_select','card_rule_admin_write'], 'card_rule policies match');
select policies_are('public', 'user_card_inventory', array['user_card_inventory_owner_select'], 'card inventory policies match');

select finish();
rollback;
