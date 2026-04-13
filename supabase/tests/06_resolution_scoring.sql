begin;
create extension if not exists pgtap;
select plan(7);

select has_function('public', 'resolve_topic', array['uuid','text','boolean','date','numeric','uuid','integer','resolution_source_type','text','text','text'], 'resolve_topic function exists');
select has_table('public', 'topic_resolution_source', 'resolution source table exists');
select has_table('public', 'prediction_score_event', 'prediction score table exists');
select col_not_null('public', 'prediction_score_event', 'normalized_score', 'normalized score is required');
select ok(exists(select 1 from pg_constraint where conname = 'prediction_score_event_submission_unique'), 'one final score per submission');
select has_view('public', 'v_resolution_audit_trail', 'resolution audit view exists');
select has_function('public', 'log_audit_event', array['audit_entity_type','uuid','text','jsonb'], 'audit logger exists');

select finish();
rollback;
