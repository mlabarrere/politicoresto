begin;

revoke all on function public.rpc_get_private_political_profile() from public, anon;
revoke all on function public.rpc_upsert_private_political_profile(uuid, uuid, integer, text, jsonb) from public, anon;
revoke all on function public.rpc_delete_private_political_profile() from public, anon;
revoke all on function public.rpc_list_private_vote_history() from public, anon;
revoke all on function public.rpc_upsert_private_vote_record(uuid, uuid, uuid, integer, text, uuid, text, text, text, jsonb) from public, anon;
revoke all on function public.rpc_upsert_private_vote_record(uuid, uuid, uuid, integer, text, uuid, text, text, text, jsonb, jsonb, timestamptz) from public, anon;
revoke all on function public.rpc_delete_private_vote_record(uuid) from public, anon;
revoke all on function public.rpc_list_sensitive_consents() from public, anon;
revoke all on function public.rpc_upsert_sensitive_consent(public.consent_type, public.consent_status, text, text) from public, anon;
revoke all on function public.rpc_delete_sensitive_consent(uuid) from public, anon;
revoke all on function public.rpc_update_thread_post(uuid, text, text, jsonb) from public, anon;
revoke all on function public.rpc_delete_thread_post(uuid) from public, anon;
revoke all on function public.rpc_update_comment(uuid, text) from public, anon;
revoke all on function public.rpc_delete_comment(uuid) from public, anon;
revoke all on function public.rpc_set_poll_response_edit_window(uuid, integer) from public, anon;
revoke all on function public.vote_poll(uuid, jsonb) from public, anon;

grant execute on function public.rpc_get_private_political_profile() to authenticated;
grant execute on function public.rpc_upsert_private_political_profile(uuid, uuid, integer, text, jsonb) to authenticated;
grant execute on function public.rpc_delete_private_political_profile() to authenticated;
grant execute on function public.rpc_list_private_vote_history() to authenticated;
grant execute on function public.rpc_upsert_private_vote_record(uuid, uuid, uuid, integer, text, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.rpc_upsert_private_vote_record(uuid, uuid, uuid, integer, text, uuid, text, text, text, jsonb, jsonb, timestamptz) to authenticated;
grant execute on function public.rpc_delete_private_vote_record(uuid) to authenticated;
grant execute on function public.rpc_list_sensitive_consents() to authenticated;
grant execute on function public.rpc_upsert_sensitive_consent(public.consent_type, public.consent_status, text, text) to authenticated;
grant execute on function public.rpc_delete_sensitive_consent(uuid) to authenticated;
grant execute on function public.rpc_update_thread_post(uuid, text, text, jsonb) to authenticated;
grant execute on function public.rpc_delete_thread_post(uuid) to authenticated;
grant execute on function public.rpc_update_comment(uuid, text) to authenticated;
grant execute on function public.rpc_delete_comment(uuid) to authenticated;
grant execute on function public.rpc_set_poll_response_edit_window(uuid, integer) to authenticated;
grant execute on function public.vote_poll(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
