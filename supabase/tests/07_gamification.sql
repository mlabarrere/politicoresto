begin;
create extension if not exists pgtap;
select plan(8);

select has_table('public', 'card_family', 'card family exists');
select has_table('public', 'card_catalog', 'card catalog exists');
select has_table('public', 'card_rule', 'card rule exists');
select has_table('public', 'user_card_inventory', 'user card inventory exists');
select has_table('public', 'card_grant_event', 'card grant event exists');
select has_function('public', 'award_card', array['uuid','uuid','card_grant_reason_type','audit_entity_type','uuid','jsonb'], 'award_card function exists');
select has_view('public', 'v_public_user_card_showcase', 'public card showcase view exists');
select has_view('public', 'v_my_card_inventory', 'private card inventory view exists');

select finish();
rollback;
