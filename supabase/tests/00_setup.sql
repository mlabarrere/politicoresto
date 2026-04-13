begin;
create extension if not exists pgtap;
select no_plan();
select has_schema('public', 'public schema exists');
select has_schema('private', 'private schema exists');
select finish();
rollback;
