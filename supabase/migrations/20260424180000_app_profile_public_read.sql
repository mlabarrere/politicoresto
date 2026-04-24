-- Bug critique : la seule policy SELECT sur public.app_profile était
-- `app_profile_owner_select` (user_id = auth.uid() OR is_admin()). Pas de
-- GRANT SELECT pour anon/authenticated non-propriétaire. Conséquences :
--
--  * un anonyme qui clique sur un post voit « Accès refusé » (les vues
--    v_thread_posts / v_post_comments joignent app_profile pour
--    l'affichage auteur → 42501).
--  * un utilisateur authentifié ne peut pas voir le profil public d'un
--    autre utilisateur (`/user/<username>`).
--  * Les feed cards sans auteur n'apparaissent pas non plus.
--
-- Fix : grant SELECT sur app_profile + policy publique pour les lignes
-- `profile_status = 'active'`. Les comptes soft-deleted / deactivated
-- restent cachés. La protection au niveau champ (bio visibility, last_seen
-- privé) reste pilotée côté app.

grant select on public.app_profile to anon, authenticated;

drop policy if exists app_profile_public_read on public.app_profile;

create policy app_profile_public_read
  on public.app_profile
  for select
  to anon, authenticated
  using (profile_status = 'active');

comment on policy app_profile_public_read on public.app_profile is
  'Lecture publique des profils actifs. Les comptes soft-deleted / deactivated restent cachés. La granularité de visibilité (bio masquée, etc.) est gérée côté application.';
