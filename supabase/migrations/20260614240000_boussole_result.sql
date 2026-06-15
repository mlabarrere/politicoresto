-- Boussole — position gauche/droite de l'utilisateur dans le temps
-- (PRD §4.6b / FR-41). On dérive un scalaire gauche↔droite à partir des réponses
-- au quiz (mécanique Boussole : mesure la position PROPRE de l'utilisateur, à la
-- différence des tags gauche/droite posés sur des contenus).
--
-- Données POLITIQUES PERSONNELLES → privées par défaut : RLS owner-only, jamais
-- de lecture publique (posture vie privée, cf. FR-42 opt-in séparé). Forward-only.

-- 1. Axe gauche/droite par thèse : poids de l'effet d'un « agree ».
--    -1 = être d'accord penche à gauche · +1 = penche à droite · 0 = hors-axe.
alter table public.boussole_thesis
  add column if not exists left_right_weight smallint not null default 0;

-- Poids ILLUSTRATIFS (placeholder, cohérents avec les positions seedées) — à
-- remplacer avec les positions sourcées (FR-24).
update public.boussole_thesis set left_right_weight = -1 where ordering = 1; -- + services publics/impôts → gauche
update public.boussole_thesis set left_right_weight =  1 where ordering = 2; -- réduire l'immigration → droite
update public.boussole_thesis set left_right_weight = -1 where ordering = 3; -- écologie prioritaire → gauche
update public.boussole_thesis set left_right_weight = -1 where ordering = 4; -- abaisser l'âge de la retraite → gauche
update public.boussole_thesis set left_right_weight =  0 where ordering = 5; -- intégration UE → hors axe G/D

-- 2. Résultats sauvegardés (historique → graphe temporel).
create table if not exists public.boussole_result (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.app_profile(user_id) on delete cascade,
  left_right     numeric(4, 3) not null check (left_right >= -1 and left_right <= 1),
  top_party_slug text,
  answers        jsonb not null default '{}'::jsonb,
  taken_at       timestamp with time zone not null default timezone('utc', now())
);

create index if not exists boussole_result_user_idx
  on public.boussole_result (user_id, taken_at);

alter table public.boussole_result enable row level security;

-- Lecture/écriture STRICTEMENT propriétaire — donnée politique personnelle.
drop policy if exists boussole_result_owner_read on public.boussole_result;
create policy boussole_result_owner_read on public.boussole_result
  for select using ((select auth.uid()) = user_id);

drop policy if exists boussole_result_owner_insert on public.boussole_result;
create policy boussole_result_owner_insert on public.boussole_result
  for insert with check ((select auth.uid()) = user_id);

grant select, insert on public.boussole_result to authenticated;
grant all on public.boussole_result to service_role;

-- 3. RPC d'enregistrement : insère pour l'utilisateur courant, renvoie l'id.
create or replace function public.save_boussole_result(
  p_left_right     numeric,
  p_top_party_slug text,
  p_answers        jsonb
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if p_left_right is null or p_left_right < -1 or p_left_right > 1 then
    raise exception 'left_right hors bornes [-1, 1]' using errcode = '22003';
  end if;

  insert into public.boussole_result (user_id, left_right, top_party_slug, answers)
  values (v_uid, p_left_right, p_top_party_slug, coalesce(p_answers, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.save_boussole_result(numeric, text, jsonb) from public;
grant execute on function public.save_boussole_result(numeric, text, jsonb)
  to authenticated, service_role;
