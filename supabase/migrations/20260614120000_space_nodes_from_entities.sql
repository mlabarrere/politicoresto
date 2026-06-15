-- Amorçage du graphe : un Espace-Nœud (kind='node') par entité politique seedée
-- (PRD AD-1 / FR-6 / FR-8). « L'amorçage `political_entity` sert de référentiel »
-- (brief addendum §G) : les partis/candidats déjà seedés deviennent les Nœuds
-- canoniques du graphe, marqués 'verified' (entités réelles vérifiées par la
-- plateforme ; l'officialisation par compte officiel = service_role/back-office).
--
-- Mapping : political_entity.type → space.node_type (party→party, candidate→candidate ;
-- 'bloc' exclu, pas de node_type équivalent en v1). slug/name réutilisés.
-- Forward-only, idempotent (on conflict do nothing sur le slug unique).

insert into public.space (kind, slug, title, node_type, entity_id, verification)
select
  'node'::public.space_kind,
  pe.slug,
  pe.name,
  (case pe.type
     when 'party'     then 'party'
     when 'candidate' then 'candidate'
   end)::public.space_node_type,
  pe.id,
  'verified'::public.space_verification
from public.political_entity pe
where pe.type in ('party', 'candidate')
on conflict (slug) do nothing;
