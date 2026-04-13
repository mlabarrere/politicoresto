begin;

revoke insert, update on public.post from authenticated;

create or replace function private.trigger_refresh_public_read_models()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  perform public.refresh_public_read_models();
  return null;
end;
$$;

revoke all on function private.trigger_refresh_public_read_models() from public;
revoke all on function private.trigger_refresh_public_read_models() from anon, authenticated;

commit;
