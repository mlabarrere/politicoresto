begin;
create extension if not exists pgtap;
select plan(8);

select has_table('public', 'territory_reference', 'territory reference exists');
select has_table('public', 'territory_closure', 'territory closure exists');
select has_function('public', 'refresh_territory_closure', array[]::text[], 'closure refresh function exists');
select has_view('public', 'v_territory_rollup_topic_count', 'territory topic rollup view exists');
select has_view('public', 'v_territory_rollup_prediction_activity', 'territory prediction rollup view exists');
select ok(exists(select 1 from public.territory_reference where territory_code = 'world'), 'world seed exists');
select ok(exists(select 1 from public.territory_reference where territory_code = 'europe'), 'europe seed exists');
select ok(exists(select 1 from public.territory_reference where territory_code = 'france'), 'france seed exists');

select finish();
rollback;
