begin;

-- Keep a single canonical react_post signature to avoid PostgREST overload ambiguity.
drop function if exists public.react_post(text, uuid, text);

grant execute on function public.react_post(public.reaction_target_type, uuid, public.reaction_type) to authenticated;

commit;
