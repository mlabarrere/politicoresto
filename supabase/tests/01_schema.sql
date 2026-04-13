begin;
create extension if not exists pgtap;
select plan(16);

select has_table('public', 'app_profile', 'app_profile exists');
select has_table('public', 'topic', 'topic exists');
select has_table('public', 'prediction_question', 'prediction_question exists');
select has_table('public', 'prediction_submission', 'prediction_submission exists');
select has_table('public', 'topic_resolution', 'topic_resolution exists');
select has_table('public', 'poll', 'poll exists');
select has_table('public', 'post', 'post exists');
select has_table('public', 'moderation_report', 'moderation_report exists');
select has_table('public', 'card_catalog', 'card_catalog exists');
select has_column('public', 'user_declared_vote_record', 'visibility', 'vote record visibility exists');
select has_column('public', 'space', 'space_type', 'space_type column exists');
select col_type_is('public', 'space', 'space_type', 'space_type', 'space_type enum is applied');
select col_type_is('public', 'topic', 'visibility', 'visibility_level', 'topic visibility enum is applied');
select col_type_is('public', 'prediction_question', 'prediction_type', 'prediction_type', 'prediction type enum is applied');
select has_view('public', 'v_public_profiles', 'public profile view exists');
select has_view('public', 'v_topic_prediction_aggregate', 'prediction aggregate view exists');

select finish();
rollback;
