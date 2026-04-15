begin;
create extension if not exists pgtap;
select plan(17);

select has_table('public', 'post_poll', 'post_poll table exists');
select has_table('public', 'post_poll_option', 'post_poll_option table exists');
select has_table('public', 'post_poll_response', 'post_poll_response table exists');
select has_table('public', 'post_poll_snapshot', 'post_poll_snapshot table exists');
select has_table('public', 'post_poll_target_distribution', 'post_poll_target_distribution table exists');

select has_view('public', 'v_post_poll_summary', 'poll public summary view exists');

select has_function('public', 'create_post_poll', array['uuid', 'text', 'timestamp with time zone', 'jsonb'], 'create_post_poll rpc exists');
select has_function('public', 'submit_post_poll_vote', array['uuid', 'uuid'], 'submit_post_poll_vote rpc exists');
select has_function('public', 'recompute_post_poll_snapshot', array['uuid'], 'recompute_post_poll_snapshot function exists');

select row_security_is_on('public', 'post_poll', 'rls enabled on post_poll');
select row_security_is_on('public', 'post_poll_option', 'rls enabled on post_poll_option');
select row_security_is_on('public', 'post_poll_response', 'rls enabled on post_poll_response');
select row_security_is_on('public', 'post_poll_snapshot', 'rls enabled on post_poll_snapshot');

select ok(not has_table_privilege('anon', 'public.post_poll_response', 'select'), 'anon cannot read raw poll responses');
select ok(not has_table_privilege('anon', 'public.post_poll_response', 'insert'), 'anon cannot write raw poll responses');
select ok(has_table_privilege('authenticated', 'public.v_post_poll_summary', 'select'), 'authenticated can read poll summary view');
select ok(not has_table_privilege('authenticated', 'public.post_poll_response', 'select'), 'authenticated has no broad raw-response select grant');

select finish();
rollback;
