-- Forum MVP cleanup: disable execute grants for non-MVP product endpoints.
-- Keep schema/auth/RLS structures untouched.

revoke execute on function public.place_bet(uuid, uuid, boolean, date, numeric, uuid, integer, text) from authenticated;
revoke execute on function public.publish_poll_wave(uuid) from authenticated;
revoke execute on function public.vote_poll(uuid, jsonb) from authenticated;
revoke execute on function public.rpc_set_poll_response_edit_window(uuid, integer) from authenticated;
