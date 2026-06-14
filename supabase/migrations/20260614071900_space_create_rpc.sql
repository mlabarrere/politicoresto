-- Espaces unifiés — write-path par RPC (Epic 1, suite de Story 1.1 ; PRD AD-1 / FR-6 / FR-9).
--
-- `create_space` : création ATOMIQUE d'un Espace + membership du créateur, en security
-- definer (un seul aller-retour, intégrité garantie). Résout le point Codex : le créateur
-- d'une Table privée doit en être membre (owner) pour la voir/gérer ; un créateur de Nœud
-- en devient membre (les Nœuds sont partagés, pas « possédés »).
--
-- L'écriture passe désormais par cette RPC ; les policies d'insert directes restent en
-- filet (self-join membre, etc.). verification n'est PAS exposée → reste 'unverified'
-- (officialisation = service_role/back-office uniquement).
--
-- Forward-only, idempotent.

create or replace function public.create_space(
  p_kind          public.space_kind,
  p_title         text,
  p_slug          text default null,
  p_description   text default null,
  p_node_type     public.space_node_type default null,
  p_entity_id     uuid default null,
  p_access        public.space_access default null,
  p_identity_mode public.space_identity_mode default null
)
returns public.space
language plpgsql security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_slug  public.citext;
  v_space public.space;
  v_role  public.space_member_role;
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  -- Slug : fourni, sinon dérivé du titre (slugify minimal) + suffixe court anti-collision.
  v_slug := coalesce(
    nullif(trim(p_slug), ''),
    regexp_replace(lower(trim(p_title)), '[^a-z0-9]+', '-', 'g')
      || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)
  );

  begin
    insert into public.space (
      kind, slug, title, description, node_type, entity_id, access, identity_mode, created_by
    )
    values (
      p_kind, v_slug, p_title, p_description, p_node_type, p_entity_id, p_access, p_identity_mode, v_uid
    )
    returning * into v_space;
  exception
    when unique_violation then
      raise exception 'Un espace équivalent existe déjà (slug ou entité dupliqué)'
        using errcode = '23505';
  end;

  -- Créateur : owner d'une Table, membre d'un Nœud (objet partagé).
  v_role := case when p_kind = 'table' then 'owner'::public.space_member_role
                 else 'member'::public.space_member_role end;
  insert into public.space_member (space_id, user_id, role)
  values (v_space.id, v_uid, v_role)
  on conflict (space_id, user_id) do nothing;

  return v_space;
end;
$$;

revoke all on function public.create_space(
  public.space_kind, text, text, text, public.space_node_type, uuid,
  public.space_access, public.space_identity_mode
) from public;
grant execute on function public.create_space(
  public.space_kind, text, text, text, public.space_node_type, uuid,
  public.space_access, public.space_identity_mode
) to authenticated, service_role;
