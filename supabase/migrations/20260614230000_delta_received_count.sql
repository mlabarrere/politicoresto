-- Delta — compteur « Deltas reçus » par membre (PRD §4.1 / FR-3 ; AD-9).
-- Agrège les Delta décernés sur les contenus d'un membre : ses posts racine
-- (thread_post) et ses commentaires (post). On s'appuie sur les vues publiques
-- v_thread_posts / v_post_comments, qui filtrent déjà sur la visibilité publique
-- du topic → on n'expose jamais un Delta posé sur un contenu privé.
--
-- SECURITY DEFINER : la fonction lit des vues détenues par postgres, le résultat
-- est un simple agrégat (entier). Forward-only, idempotent.

create or replace function public.count_deltas_received(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (
    coalesce((
      select count(*)
        from public.post_delta d
        join public.v_thread_posts tp on tp.id = d.target_id
       where d.target_type = 'thread_post'::public.reaction_target_type
         and tp.created_by = p_user_id
    ), 0)
    +
    coalesce((
      select count(*)
        from public.post_delta d
        join public.v_post_comments c on c.id = d.target_id
       where d.target_type = 'comment'::public.reaction_target_type
         and c.author_user_id = p_user_id
    ), 0)
  )::integer;
$$;

revoke all on function public.count_deltas_received(uuid) from public;
grant execute on function public.count_deltas_received(uuid)
  to anon, authenticated, service_role;
