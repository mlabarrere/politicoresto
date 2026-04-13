begin;
create extension if not exists pgtap;
select plan(9);

select has_function('public', 'rpc_submit_prediction', array['uuid','boolean','date','numeric','uuid','integer','text'], 'prediction rpc exists');
select has_function('public', 'compute_prediction_normalized_score', array['uuid','uuid'], 'score function exists');
select has_function('public', 'validate_prediction_submission', array[]::text[], 'prediction validator exists');

select throws_ok(
  $$do $body$
  declare
    fake_topic uuid := gen_random_uuid();
  begin
    insert into public.prediction_submission(topic_id, user_id, answer_boolean, answer_numeric)
    values (fake_topic, gen_random_uuid(), true, 12);
  end
  $body$;$$,
  null,
  'validator rejects multiple answer columns'
);

select ok(exists(select 1 from pg_constraint where conname = 'prediction_question_numeric_bounds_chk'), 'numeric bounds constraint exists');
select ok(exists(select 1 from pg_constraint where conname = 'prediction_question_date_bounds_chk'), 'date bounds constraint exists');
select ok(exists(select 1 from pg_constraint where conname = 'prediction_question_ordinal_bounds_chk'), 'ordinal bounds constraint exists');
select has_view('public', 'v_topic_prediction_aggregate', 'prediction aggregate view exists');
select has_view('public', 'v_my_prediction_history', 'owner prediction history view exists');

select finish();
rollback;
