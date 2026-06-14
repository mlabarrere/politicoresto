-- Delta — réaction phare « ça m'a fait changer d'avis / réfléchir » (PRD §4.1 / FR-3 ;
-- AD-9 ; r/changemyview). INDÉPENDANT du tag gauche/droite (un membre peut faire les
-- deux sur une même cible) → table dédiée, on ne surcharge PAS `reaction`.
--
-- Cible polymorphe (thread_post | comment), comme `reaction` (pas de FK sur target_id).
-- Toggle via RPC `toggle_delta`. Lecture publique (compteur). Forward-only, idempotent.

create table if not exists public.post_delta (
  target_type public.reaction_target_type not null,
  target_id   uuid not null,
  user_id     uuid not null references public.app_profile(user_id) on delete cascade,
  created_at  timestamp with time zone not null default timezone('utc', now()),
  primary key (target_type, target_id, user_id)
);

create index if not exists post_delta_target_idx
  on public.post_delta (target_type, target_id);
create index if not exists post_delta_user_idx
  on public.post_delta (user_id);

alter table public.post_delta enable row level security;

-- Lecture publique : le Delta est un signal public (compteur + « qui »).
drop policy if exists post_delta_public_read on public.post_delta;
create policy post_delta_public_read on public.post_delta
  for select using (true);

grant select on public.post_delta to anon, authenticated;
grant all on public.post_delta to service_role;

-- RPC toggle : décerne le Delta s'il est absent, le retire sinon.
-- Retourne true (décerné) / false (retiré). Écriture uniquement via cette RPC.
create or replace function public.toggle_delta(
  p_target_type public.reaction_target_type,
  p_target_id   uuid
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_deleted integer;
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  delete from public.post_delta
   where target_type = p_target_type
     and target_id = p_target_id
     and user_id = v_uid;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    return false;
  end if;

  insert into public.post_delta (target_type, target_id, user_id)
  values (p_target_type, p_target_id, v_uid);
  return true;
end;
$$;

revoke all on function public.toggle_delta(public.reaction_target_type, uuid) from public;
grant execute on function public.toggle_delta(public.reaction_target_type, uuid)
  to authenticated, service_role;
