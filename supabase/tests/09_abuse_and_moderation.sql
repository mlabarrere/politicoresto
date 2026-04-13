begin;
create extension if not exists pgtap;
select plan(10);

select has_table('public', 'moderation_report', 'moderation report exists');
select has_table('public', 'moderation_action', 'moderation action exists');
select has_table('public', 'anti_abuse_signal', 'anti abuse signal exists');
select has_table('public', 'audit_log', 'audit log exists');
select has_view('public', 'v_moderation_queue', 'moderation queue view exists');
select has_view('public', 'v_abuse_signals_recent', 'abuse signals view exists');
select has_function('public', 'rpc_report_content', array['moderation_target_type','uuid','text','text'], 'report rpc exists');
select ok(exists(select 1 from pg_type where typname = 'anti_abuse_signal_type'), 'anti abuse enum exists');
select ok(exists(select 1 from pg_type where typname = 'moderation_action_type'), 'moderation action enum exists');
select ok(exists(select 1 from pg_type where typname = 'moderation_report_status'), 'moderation report status enum exists');

select finish();
rollback;
