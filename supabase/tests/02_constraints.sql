begin;
create extension if not exists pgtap;
select plan(12);

select has_index('public', 'prediction_submission', 'prediction_submission_one_active_per_user_topic_idx', 'single active submission index exists');
select col_not_null('public', 'topic', 'title', 'topic title is required');
select col_not_null('public', 'post', 'body_markdown', 'post body is required');
select col_not_null('public', 'prediction_question', 'prediction_type', 'prediction type is required');
select col_not_null('public', 'poll', 'title', 'poll title is required');

select throws_ok(
  $$insert into public.post(author_user_id, post_type, body_markdown) values (gen_random_uuid(), 'discussion', 'x')$$,
  null,
  'post parent check rejects orphan post'
);

select throws_ok(
  $$insert into public.topic(created_by, slug, title, open_at, close_at) values (gen_random_uuid(), 'bad-window', 'Bad', now(), now() - interval '1 hour')$$,
  null,
  'topic window check rejects reversed dates'
);

select throws_ok(
  $$insert into public.poll(created_by, title, open_at, close_at) values (gen_random_uuid(), 'bad poll', now(), now() + interval '1 day')$$,
  null,
  'poll parent check rejects orphan poll'
);

select is(public.visibility_rank('public'::public.visibility_level), 1, 'public visibility rank is lowest restriction');
select is(public.visibility_rank('moderators_only'::public.visibility_level), 4, 'moderators_only visibility rank is most restrictive');
select ok(exists(select 1 from public.taxonomy_axis where slug = 'ideology'), 'taxonomy seeds exist');
select ok(exists(select 1 from public.territory_reference where territory_code = 'france'), 'territory seeds exist');

select finish();
rollback;
