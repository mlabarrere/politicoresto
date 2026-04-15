begin;

create or replace function public.refresh_public_read_models()
returns void
language sql
as $$ select; $$;

commit;
