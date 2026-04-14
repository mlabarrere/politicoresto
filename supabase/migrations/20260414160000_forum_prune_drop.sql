begin;

-- Drop obsolete views/functions/tables in compact loops.
do $$
declare
  v text;
  f text;
  t text;
begin
  foreach v in array array[
    'v_abuse_signals_recent','v_entity_leaderboard','v_feed_entity','v_feed_topic_base','v_feed_topic_scored','v_feed_topic_signals',
    'v_global_leaderboard','v_home_feed_topics','v_moderation_queue','v_my_card_inventory','v_my_prediction_history','v_my_reputation_summary',
    'v_parliamentary_groups','v_political_bloc_sidebar','v_poll_public_results','v_poll_wave_summary','v_resolution_audit_trail',
    'v_territory_rollup_prediction_activity','v_territory_rollup_topic_count','v_topic_prediction_aggregate','v_topic_public_summary',
    'v_user_scores','v_public_user_card_showcase'
  ] loop
    execute format('drop view if exists public.%I cascade', v);
  end loop;

  foreach f in array array[
    'place_bet(uuid, uuid, boolean, date, numeric, uuid, integer, text)',
    'vote_poll(uuid, jsonb)','publish_poll_wave(uuid)','compute_scores(uuid)','compute_scores()',
    'resolve_topic(uuid, public.resolution_status, text, boolean, date, numeric, uuid, integer, text, jsonb)',
    'refresh_public_read_models()','refresh_territory_closure()','get_feed_entity(uuid, integer, uuid, uuid)',
    'rpc_submit_prediction(uuid, boolean, date, numeric, uuid, integer, text)','rpc_create_poll(uuid, text, text, timestamptz, timestamptz, jsonb)',
    'rpc_create_topic_with_prediction(uuid, text, text, timestamptz, timestamptz, public.visibility_level, jsonb)',
    'rpc_set_poll_response_edit_window(uuid, integer)','rpc_record_analytics_event(text, text, text, jsonb)',
    'rpc_apply_moderation_action(public.moderation_target_type, uuid, public.moderation_action_type, text)',
    'rpc_report_content(public.moderation_target_type, uuid, text, text)',
    'rpc_list_private_vote_history()','rpc_upsert_private_vote_record(uuid, uuid, uuid, integer, text, uuid, text, text, text, jsonb)',
    'rpc_delete_private_vote_record(uuid)','rpc_list_sensitive_consents()','rpc_upsert_sensitive_consent(public.consent_type, public.consent_status, text, text)',
    'rpc_delete_sensitive_consent(uuid)','rpc_record_consent(public.consent_type, public.consent_status, text, text)',
    'global_space_id()','get_feed_entity(uuid, integer, uuid, uuid)'
  ] loop
    execute 'drop function if exists public.' || f || ' cascade';
  end loop;

  foreach t in array array[
    'prediction_score_event','prediction_submission_history','prediction_submission','prediction_option','prediction_question',
    'poll_response_settings','poll_response','poll_option','poll_question','poll','poll_wave','user_score','reputation_ledger',
    'card_grant_event','user_card_inventory','card_rule','card_catalog','card_family','space_scope','space',
    'topic_taxonomy_link','topic_territory_link','taxonomy_term','taxonomy_axis','territory_closure','territory_reference',
    'analytics_events','political_bloc_definition','parliamentary_group_party_map','parliamentary_group_reference',
    'moderation_action','moderation_report','anti_abuse_signal','audit_log','user_consent','user_declared_vote_record','user_visibility_settings',
    'home_feed_topic_cache','topic_public_summary_cache','topic_prediction_aggregate_cache','territory_prediction_rollup_cache'
  ] loop
    execute format('drop table if exists public.%I cascade', t);
  end loop;
end $$;

truncate table public.reaction restart identity;
truncate table public.post restart identity cascade;
truncate table public.thread_post restart identity cascade;
truncate table public.topic_resolution_source restart identity cascade;
truncate table public.topic_resolution restart identity cascade;
truncate table public.topic restart identity cascade;

insert into public.political_entity(type, slug, name, metadata)
values
  ('party', 'lfi', 'La France insoumise', '{}'::jsonb),
  ('party', 'ps', 'Parti socialiste', '{}'::jsonb),
  ('party', 'epr', 'Ensemble pour la Republique', '{}'::jsonb),
  ('party', 'lr', 'Les Republicains', '{}'::jsonb),
  ('party', 'rn', 'Rassemblement national', '{}'::jsonb)
on conflict (slug) do nothing;

commit;
