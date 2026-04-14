begin;
create extension if not exists pgtap;
select plan(7);

select has_index('public', 'reaction', 'reaction_target_user_unique', 'reaction uniqueness index exists');
select col_not_null('public', 'topic', 'title', 'topic title is required');
select col_not_null('public', 'post', 'body_markdown', 'comment body is required');

select throws_ok(
  $$insert into public.topic(created_by, slug, title, open_at, close_at) values (gen_random_uuid(), 'bad-window', 'Bad', now(), now() - interval '1 hour')$$,
  null,
  'topic window check rejects reversed dates'
);

select throws_ok(
  $$insert into public.post(author_user_id, post_type, body_markdown) values (gen_random_uuid(), 'discussion', 'x')$$,
  null,
  'post parent check rejects orphan post'
);

select is(public.visibility_rank('public'::public.visibility_level), 1, 'public visibility rank is lowest restriction');
select is(public.visibility_rank('moderators_only'::public.visibility_level), 4, 'moderators_only visibility rank is most restrictive');

select finish();
rollback;
