-- Boussole multi-axes — compas 2D (PRD §4.6b / FR-40). On étend le poids d'axe
-- scalaire (left_right_weight, FR-41) à deux axes structurants pour un compas :
--   · economic_weight : effet d'un « agree » sur l'axe ÉCONOMIQUE
--       −1 = interventionniste/étatiste (gauche éco) · +1 = marché/libéral (droite éco)
--   · cultural_weight : effet d'un « agree » sur l'axe CULTUREL
--       −1 = progressiste · +1 = conservateur
-- 0 = hors-axe. Le scoring (réutilise computeLeftRight par axe) reste côté client.
--
-- ⚠️ POIDS ILLUSTRATIFS (placeholder, cohérents avec les positions déjà seedées) —
-- à remplacer avec des positions sourcées (FR-24). Forward-only, idempotent.

alter table public.boussole_thesis
  add column if not exists economic_weight smallint not null default 0,
  add column if not exists cultural_weight smallint not null default 0;

-- 1. + services publics / + impôts → économique gauche
update public.boussole_thesis set economic_weight = -1, cultural_weight =  0 where ordering = 1;
-- 2. réduire l'immigration → culturel conservateur
update public.boussole_thesis set economic_weight =  0, cultural_weight =  1 where ordering = 2;
-- 3. transition écologique prioritaire → culturel progressiste
update public.boussole_thesis set economic_weight =  0, cultural_weight = -1 where ordering = 3;
-- 4. abaisser l'âge de départ à la retraite → économique gauche
update public.boussole_thesis set economic_weight = -1, cultural_weight =  0 where ordering = 4;
-- 5. intégration UE → hors des deux axes v1 (axe européen ultérieur)
update public.boussole_thesis set economic_weight =  0, cultural_weight =  0 where ordering = 5;
