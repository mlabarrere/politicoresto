begin;

revoke all on table public.post_poll_response from anon;
revoke all on table public.post_poll_response from authenticated;
revoke all on table public.post_poll_response from public;

grant insert, update on table public.post_poll_response to authenticated;

commit;
