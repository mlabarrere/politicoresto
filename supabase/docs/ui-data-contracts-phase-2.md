# Politicoresto — PHASE 2 Contrats backend orientés UI

## Objectif

Cette spécification traduit la UI Spec Phase 1 en contrats de données Supabase directement consommables par un frontend `thin client`.

Le principe est strict:

- les vues Supabase portent les calculs dérivés utiles à l’UI ;
- le frontend compose les écrans à partir de payloads stables ;
- aucun calcul métier critique, aucun ranking, aucune synthèse politique ou interprétation de cycle de vie ne doit rester côté frontend.

## Portée

Vues minimales spécifiées:

- `v_home_feed_topics`
- `v_topics_index`
- `v_topic_screen_summary`
- `v_space_screen_summary`
- `v_territory_screen_summary`
- `v_public_profile_screen_summary`
- `v_cards_showcase`
- `v_me_dashboard_summary`

Contraintes intégrées:

- champ `derived_lifecycle_state` unifié
- champs `feed_reason_code` et `feed_reason_label`
- payload compact directement exploitable par la `Topic Card`
- séparation explicite `homepage éditoriale` vs `Topics exhaustive`

---

## 1. Principes contractuels

## 1.1 Frontend thin client

Le frontend ne doit pas:

- déduire le lifecycle d’un topic ;
- recalculer les agrégats ;
- déduire la raison de remontée d’un sujet ;
- recomposer le ranking ;
- décider si un sujet est `pending_resolution` ;
- arbitrer les cas de visibilité cachée ou non disponible.

Le frontend peut:

- afficher les payloads ;
- choisir un layout selon un état déjà dérivé ;
- afficher des composants de fallback (`loading`, `empty`, `unavailable`, `not found`) ;
- passer des paramètres de filtre, tri, pagination à des vues ou RPC exposés.

## 1.2 Convention générale de payload écran

Chaque vue d’écran doit viser une structure en trois niveaux:

- `header`: informations de tête d’écran ;
- `sections`: listes ou blocs de contenu ;
- `meta`: état technique ou éditorial utile à la page.

En SQL pur, cela peut se matérialiser:

- soit par plusieurs vues atomiques ;
- soit par une vue plate stable ;
- soit par une vue enrichie avec colonnes `jsonb`.

Pour garder la compatibilité avec le schéma actuel et le style des vues existantes, la recommandation initiale est:

- vues plates avec quelques colonnes `jsonb` ciblées ;
- pas de payload totalement imbriqué tant que le besoin n’est pas stabilisé.

## 1.3 Convention de nommage

### Vues

- `v_` + portée + finalité écran
- exemples:
  - `v_home_feed_topics`
  - `v_topic_screen_summary`

### Champs dérivés normalisés

- `derived_lifecycle_state`
- `feed_reason_code`
- `feed_reason_label`
- `card_payload`
- `aggregate_payload`
- `discussion_payload`
- `territory_payload`
- `resolution_payload`
- `screen_status`

### Champs d’état technique

- `is_visible`
- `is_hidden_from_public`
- `is_unavailable`
- `empty_state_code`
- `empty_state_label`

Le frontend ne doit jamais reconstituer ces champs à partir de tables sources.

---

## 2. États techniques et sémantiques au niveau des vues

## 2.1 `derived_lifecycle_state`

Valeurs autorisées:

- `open`
- `locked`
- `pending_resolution`
- `resolved`
- `archived`

Règles de dérivation côté Supabase:

- `open`
  - `topic_status = 'open'`
- `locked`
  - `topic_status = 'locked'`
  - et le sujet n’est pas en attente de résolution
- `pending_resolution`
  - `topic_status = 'locked'`
  - `close_at < now()`
  - `topic_resolution.resolution_status = 'pending'`
  - `resolved_at is null`
- `resolved`
  - `topic_status = 'resolved'`
  - ou `topic_resolution.resolution_status = 'resolved'`
- `archived`
  - `topic_status = 'archived'`

Remarque:

- le frontend ne lit jamais directement `topic_status` pour décider du cycle de vie UI principal.
- il peut l’afficher en méta brute si besoin, mais doit se baser sur `derived_lifecycle_state` pour les variantes visuelles.

## 2.2 `feed_reason_code`

Valeurs minimales recommandées:

- `high_activity`
- `consensus_shift`
- `closing_soon`
- `pending_resolution`
- `territory_relevant`
- `recently_resolved`
- `editorial_priority`
- `space_highlight`

## 2.3 `feed_reason_label`

Libellé frontend-ready, par exemple:

- `Remonte car forte activité aujourd’hui`
- `Remonte car le consensus a bougé`
- `Remonte car la clôture approche`
- `Remonte car la résolution est attendue`
- `Remonte car ce sujet concerne votre zone`
- `Remonte car une issue vient d’être publiée`

Le frontend n’a pas à mapper les codes en microcopie.

## 2.4 Gestion des cas `empty / unavailable / hidden / not found`

### Empty

- la vue renvoie zéro ligne ;
- ou renvoie un `empty_state_code` connu si l’écran doit garder une structure.

### Unavailable

- l’objet existe mais certains calculs agrégés ou sous-blocs sont indisponibles ;
- la vue doit exposer:
  - `is_unavailable = true`
  - et éventuellement `unavailable_reason`

### Hidden

- l’objet existe mais n’est pas visible pour le rôle courant ;
- ne pas l’exposer publiquement ;
- côté écran, cela se manifeste le plus souvent comme `not found`.

### Not found

- aucune ligne car l’objet n’existe pas ou n’est pas accessible ;
- la vue ne porte pas l’état `not_found` dans le résultat ;
- l’absence de ligne vaut `not found`.

---

## 3. Dépendances de tables et sources

## 3.1 Tables sources principales

- `topic`
- `space`
- `prediction_question`
- `prediction_option`
- `prediction_submission`
- `prediction_submission_history`
- `topic_resolution`
- `topic_resolution_source`
- `post`
- `poll`
- `poll_question`
- `poll_option`
- `poll_response`
- `topic_taxonomy_link`
- `taxonomy_term`
- `space_scope`
- `topic_territory_link`
- `territory_reference`
- `territory_closure`
- `app_profile`
- `user_visibility_settings`
- `card_catalog`
- `user_card_inventory`
- `card_grant_event`
- `reputation_ledger`

## 3.2 Vues existantes réutilisables

- `v_topic_public_summary`
- `v_topic_prediction_aggregate`
- `v_public_profiles`
- `v_public_user_card_showcase`
- `v_territory_rollup_topic_count`
- `v_territory_rollup_prediction_activity`
- `v_my_prediction_history`
- `v_my_reputation_summary`
- `v_my_card_inventory`
- `v_resolution_audit_trail`
- `v_poll_public_results`

Recommandation:

- composer les nouvelles vues à partir de ces vues existantes quand cela évite la duplication ;
- mais ne pas hésiter à recalculer proprement si les vues actuelles sont trop minimales pour la cible écran.

---

## 4. Payload compact standard pour `Topic Card`

## 4.1 Finalité

Le frontend doit pouvoir rendre une `Topic Card` complète à partir d’une seule ligne.

## 4.2 Colonnes requises

- `topic_id uuid`
- `topic_slug citext`
- `topic_title text`
- `topic_description text`
- `derived_lifecycle_state text`
- `topic_status topic_status`
- `visibility visibility_level`
- `is_sensitive boolean`
- `space_id uuid`
- `space_slug citext`
- `space_name text`
- `primary_taxonomy_slug citext`
- `primary_taxonomy_label text`
- `primary_territory_id uuid`
- `primary_territory_slug text`
- `primary_territory_name text`
- `primary_territory_level territory_level`
- `prediction_type prediction_type`
- `prediction_question_title text`
- `aggregate_payload jsonb`
- `metrics_payload jsonb`
- `discussion_payload jsonb`
- `card_payload jsonb`
- `resolution_payload jsonb`
- `feed_reason_code text`
- `feed_reason_label text`
- `editorial_feed_score numeric`
- `last_activity_at timestamptz`
- `open_at timestamptz`
- `close_at timestamptz`
- `resolve_deadline_at timestamptz`

## 4.3 Charges JSON recommandées

### `aggregate_payload`

Clés minimales:

- `primary_value`
- `primary_label`
- `secondary_value`
- `secondary_label`
- `unit_label`
- `submission_count`
- `distribution_hint`

### `metrics_payload`

Clés minimales:

- `active_prediction_count`
- `visible_post_count`
- `time_label`

### `discussion_payload`

Clés minimales:

- `excerpt_type`
- `excerpt_title`
- `excerpt_text`
- `excerpt_created_at`

### `card_payload`

Clés minimales:

- `primary_card_slug`
- `primary_card_label`
- `primary_card_rarity`
- `additional_count`

### `resolution_payload`

Clés minimales:

- `resolution_status`
- `resolved_label`
- `resolved_at`
- `resolution_note`
- `source_label`
- `source_url`

---

## 5. Vues contractuelles détaillées

## 5.1 `v_home_feed_topics`

### Rôle

- alimenter la homepage éditoriale ;
- fournir un flux déjà classé et déjà expliqué ;
- servir directement de source à la `Topic Card`.

### Différence fonctionnelle

- contrairement à `v_topics_index`, cette vue porte un ranking éditorial et une raison de remontée.

### Colonnes

#### Identité

- `topic_id uuid`
- `topic_slug citext`
- `topic_title text`
- `topic_description text`

#### Cycle de vie

- `topic_status topic_status`
- `derived_lifecycle_state text`
- `visibility visibility_level`
- `is_sensitive boolean`
- `open_at timestamptz`
- `close_at timestamptz`
- `resolve_deadline_at timestamptz`

#### Contexte

- `space_id uuid`
- `space_slug citext`
- `space_name text`
- `primary_taxonomy_slug citext`
- `primary_taxonomy_label text`
- `primary_territory_id uuid`
- `primary_territory_slug text`
- `primary_territory_name text`
- `primary_territory_level territory_level`

#### Prédiction

- `prediction_type prediction_type`
- `prediction_question_title text`
- `aggregate_payload jsonb`

#### Social / activité

- `metrics_payload jsonb`
- `discussion_payload jsonb`
- `card_payload jsonb`
- `resolution_payload jsonb`

#### Ranking

- `editorial_feed_score numeric`
- `feed_reason_code text`
- `feed_reason_label text`
- `last_activity_at timestamptz`

### Calculs dérivés côté Supabase

- `derived_lifecycle_state`
- `editorial_feed_score`
- `feed_reason_code`
- `feed_reason_label`
- `aggregate_payload`
- `metrics_payload`
- `discussion_payload`
- `card_payload`
- `resolution_payload`
- `last_activity_at`

### Sources

- `topic`
- `space`
- `prediction_question`
- `v_topic_prediction_aggregate`
- `post`
- `topic_resolution`
- `topic_resolution_source`
- `topic_taxonomy_link` + `taxonomy_term`
- `topic_territory_link` + `territory_reference`
- `card_catalog` et éventuellement `card_rule` si on veut lier des récompenses potentielles

### Cas d’usage UI

- homepage
- blocs `A la une`
- homepage mobile

### Cas empty / unavailable / hidden / not found

- `empty`: 0 ligne
- `unavailable`: ligne avec `is_unavailable` implicite via payload incomplet déconseillée ; préférer une ligne complète ou aucune ligne
- `hidden`: non exposé
- `not found`: non applicable, vue de liste

## 5.2 `v_topics_index`

### Rôle

- alimenter la page Topics exhaustive ;
- fournir un inventaire public, moins éditorialisé que la homepage.

### Différence fonctionnelle

- pas de logique forte de mise en avant éditoriale ;
- ranking léger ou tri neutre ;
- toujours exploitable par `TopicCardCompact`.

### Colonnes

- `topic_id uuid`
- `topic_slug citext`
- `topic_title text`
- `topic_description text`
- `topic_status topic_status`
- `derived_lifecycle_state text`
- `visibility visibility_level`
- `is_sensitive boolean`
- `space_id uuid`
- `space_slug citext`
- `space_name text`
- `primary_taxonomy_slug citext`
- `primary_taxonomy_label text`
- `primary_territory_id uuid`
- `primary_territory_name text`
- `primary_territory_level territory_level`
- `prediction_type prediction_type`
- `prediction_question_title text`
- `aggregate_payload jsonb`
- `metrics_payload jsonb`
- `resolution_payload jsonb`
- `feed_reason_code text`
- `feed_reason_label text`
- `default_sort_score numeric`
- `last_activity_at timestamptz`
- `created_at timestamptz`

### Calculs dérivés côté Supabase

- `derived_lifecycle_state`
- `aggregate_payload`
- `metrics_payload`
- `resolution_payload`
- `default_sort_score`

### Notes

- `feed_reason_*` peut être nullable sur cette vue, mais il est préférable de conserver les colonnes pour homogénéité de composant.
- si peu pertinent, utiliser:
  - `feed_reason_code = 'index_default'`
  - `feed_reason_label = null`

### Cas empty / unavailable / hidden / not found

- `empty`: 0 ligne après filtre
- `unavailable`: bannière si la requête échoue, pas via le dataset
- `hidden`: non exposé
- `not found`: non applicable

## 5.3 `v_topic_screen_summary`

### Rôle

- fournir la donnée structurée nécessaire à la page Topic ;
- éviter les N requêtes actuelles sur `topic`, `prediction_question`, `options`, `posts`, `aggregate`.

### Structure recommandée

Une ligne par topic visible, enrichie par colonnes `jsonb`.

### Colonnes

#### Header

- `topic_id uuid`
- `topic_slug citext`
- `topic_title text`
- `topic_description text`
- `topic_status topic_status`
- `derived_lifecycle_state text`
- `visibility visibility_level`
- `is_sensitive boolean`
- `open_at timestamptz`
- `close_at timestamptz`
- `resolve_deadline_at timestamptz`
- `locked_reason text`

#### Contexte

- `space_id uuid`
- `space_slug citext`
- `space_name text`
- `primary_taxonomy_slug citext`
- `primary_taxonomy_label text`
- `taxonomy_payload jsonb`
- `territory_payload jsonb`

#### Prédiction

- `prediction_type prediction_type`
- `prediction_question_title text`
- `question_payload jsonb`
- `aggregate_payload jsonb`

#### Résolution

- `resolution_payload jsonb`

#### Discussion

- `discussion_summary_payload jsonb`
- `posts_payload jsonb`

#### Découverte

- `cards_payload jsonb`
- `related_topics_payload jsonb`

#### Technique

- `screen_status text`
- `is_unavailable boolean`
- `unavailable_reason text`

### Calculs dérivés côté Supabase

- `derived_lifecycle_state`
- `question_payload`
  - options
  - bornes
  - `allow_submission_update`
- `aggregate_payload`
- `resolution_payload`
- `discussion_summary_payload`
- `posts_payload`
  - posts déjà triés et limités si l’UI le veut
- `cards_payload`
- `related_topics_payload`
- `screen_status`

### Cas d’état

- `empty`: non applicable au niveau topic complet, mais certaines sections peuvent avoir des payloads vides
- `unavailable`: la ligne existe et `is_unavailable = true` pour une section calculée absente
- `hidden`: pas de ligne
- `not found`: pas de ligne

## 5.4 `v_space_screen_summary`

### Rôle

- alimenter la page Espace ;
- fournir header + scopes + tabs principales.

### Colonnes

#### Header

- `space_id uuid`
- `space_slug citext`
- `space_name text`
- `space_description text`
- `space_type space_type`
- `space_status space_status`
- `visibility visibility_level`
- `created_at timestamptz`

#### Contexte

- `scope_payload jsonb`
- `territory_scope_payload jsonb`
- `taxonomy_scope_payload jsonb`

#### Collections d’écran

- `featured_topics_payload jsonb`
- `polls_payload jsonb`
- `resolved_topics_payload jsonb`
- `archive_topics_payload jsonb`

#### Synthèse

- `metrics_payload jsonb`
- `screen_status text`
- `empty_state_code text`
- `empty_state_label text`

### Calculs dérivés côté Supabase

- compter les topics visibles de l’espace par lifecycle ;
- préparer les topics en payload compact de Topic Card ou TopicCardCompact ;
- fournir les tabs déjà séparées.

### Cas

- `empty`: espace existe, zéro sujet visible
- `unavailable`: certaines tabs nulles ou `screen_status = 'partial'`
- `hidden`: pas de ligne
- `not found`: pas de ligne

## 5.5 `v_territory_screen_summary`

### Rôle

- alimenter la page Territoire ;
- rendre visibles rollups, hiérarchie et flux locaux.

### Colonnes

#### Header

- `territory_id uuid`
- `territory_slug text`
- `territory_name text`
- `territory_level territory_level`
- `country_code text`
- `region_code text`
- `department_code text`
- `commune_code text`

#### Hiérarchie

- `parent_payload jsonb`
- `children_payload jsonb`

#### Rollups

- `rollup_topics_count integer`
- `rollup_prediction_count integer`
- `rollup_payload jsonb`

#### Collections d’écran

- `local_topics_payload jsonb`
- `child_topics_payload jsonb`
- `resolved_topics_payload jsonb`
- `profiles_payload jsonb`
- `cards_payload jsonb`

#### Synthèse

- `screen_status text`
- `empty_state_code text`
- `empty_state_label text`

### Calculs dérivés côté Supabase

- rollups par `territory_closure`
- hiérarchie parent/enfants
- topics locaux et topics hérités
- profils publics du territoire
- cartes territoriales visibles ou recommandées

### Cas

- `empty`: territoire existe mais aucun sujet public
- `unavailable`: rollups absents mais page encore rendable
- `hidden`: non exposé publiquement
- `not found`: pas de ligne

## 5.6 `v_public_profile_screen_summary`

### Rôle

- alimenter la page Profil public ;
- enrichir l’actuelle `v_public_profiles`.

### Colonnes

#### Header

- `user_id uuid`
- `username citext`
- `display_name text`
- `bio text`
- `avatar_url text`
- `public_territory_id uuid`
- `public_territory_name text`
- `created_at timestamptz`

#### Collections d’écran

- `cards_payload jsonb`
- `recent_topics_payload jsonb`
- `recent_activity_payload jsonb`
- `dominant_taxonomy_payload jsonb`

#### Synthèse

- `public_reputation_payload jsonb`
- `screen_status text`
- `empty_state_code text`
- `empty_state_label text`

### Calculs dérivés côté Supabase

- enrichissement du territoire public
- cartes visibles publiques
- sujets récents liés au profil, si exposition autorisée
- activité récente publique
- éventuels thèmes dominants à partir des topics publics

### Cas

- `empty`: profil public sans activité visible
- `unavailable`: un sous-bloc public n’est pas calculable
- `hidden`: profil non public, pas de ligne
- `not found`: pas de ligne

## 5.7 `v_cards_showcase`

### Rôle

- alimenter page catalogue / cartes publiques ;
- fournir catalogue + signaux de rareté et d’obtention visible.

### Colonnes

- `card_id uuid`
- `card_slug citext`
- `card_label text`
- `card_description text`
- `family_id uuid`
- `family_slug citext`
- `family_label text`
- `family_type card_family_type`
- `rarity card_rarity`
- `is_stackable boolean`
- `is_active boolean`
- `public_owner_count integer`
- `showcase_payload jsonb`

### Calculs dérivés côté Supabase

- nombre de détenteurs publics depuis `v_public_user_card_showcase`
- éventuels exemples de profils publics possédant la carte
- payload de présentation compact

### Cas

- `empty`: 0 carte active
- `unavailable`: nombre de détenteurs non calculable mais catalogue visible
- `hidden`: cartes inactives non exposées
- `not found`: non applicable à une vue liste

## 5.8 `v_me_dashboard_summary`

### Rôle

- alimenter l’espace personnel authentifié ;
- remplacer l’assemblage actuel de vues privées isolées par un résumé écran cohérent.

### Colonnes

#### Header

- `user_id uuid`
- `display_name text`
- `avatar_url text`
- `public_territory_id uuid`
- `public_territory_name text`

#### Résumés

- `reputation_payload jsonb`
- `active_predictions_payload jsonb`
- `pending_resolutions_payload jsonb`
- `cards_payload jsonb`
- `recommendations_payload jsonb`

#### Technique

- `screen_status text`
- `empty_state_code text`
- `empty_state_label text`

### Calculs dérivés côté Supabase

- résumé réputation depuis `v_my_reputation_summary`
- prédictions actives utiles à l’écran depuis `prediction_submission` et `topic`
- sujets verrouillés / clos à suivre
- inventaire cartes depuis `v_my_card_inventory`
- recommandations initiales si prévues

### Cas

- `empty`: utilisateur sans activité
- `unavailable`: une sous-vue privée indisponible
- `hidden`: non applicable pour l’utilisateur propriétaire
- `not found`: non applicable

---

## 6. Calculs dérivés à faire côté Supabase

## 6.1 Lifecycle unifié

Calcul à centraliser dans une expression SQL commune ou une vue intermédiaire:

- `derived_lifecycle_state`

Recommandation:

- créer une vue interne ou une expression réutilisable de cycle de vie topic ;
- ne pas réécrire la logique dans chaque requête finale.

## 6.2 Ranking homepage

Le ranking homepage doit être calculé côté Supabase.

Sortie minimale:

- `editorial_feed_score`
- `feed_reason_code`
- `feed_reason_label`

Entrées recommandées:

- activité récente des posts
- activité récente des submissions
- proximité temporelle de clôture
- proximité de résolution
- fraîcheur de résolution
- variation d’agrégat si disponible
- priorité éditoriale manuelle éventuelle

## 6.3 Synthèses agrégées

À calculer côté Supabase:

- agrégat principal par type de prédiction
- compteurs de posts visibles
- compteurs de prédictions actives
- date d’activité récente
- issue résolue lisible

## 6.4 Payloads compacts

À assembler côté Supabase:

- `aggregate_payload`
- `metrics_payload`
- `discussion_payload`
- `card_payload`
- `resolution_payload`
- `scope_payload`
- `rollup_payload`

## 6.5 États techniques

À standardiser si besoin:

- `screen_status`
  - `ready`
  - `partial`
  - `empty`
- `empty_state_code`
- `empty_state_label`

---

## 7. Convention homepage éditoriale vs Topics exhaustive

## 7.1 Homepage éditoriale

Source:

- `v_home_feed_topics`

Doit porter:

- ranking éditorial
- raison de remontée
- payload complet de Topic Card
- volume limité et hiérarchisé

## 7.2 Topics exhaustive

Source:

- `v_topics_index`

Doit porter:

- inventaire complet
- filtres et tris compatibles
- payload compact
- pas de dépendance à un moteur éditorial fort

Règle:

- le frontend doit pouvoir implémenter la différence entre ces deux écrans sans logique métier additionnelle, seulement par changement de source de données et de layout.

---

## 8. Critères d’acceptation backend pour implémentation frontend

Le frontend peut implémenter la UI sans logique métier locale si, et seulement si:

- chaque `Topic Card` peut être rendue à partir d’une seule ligne de vue ;
- `derived_lifecycle_state` est fourni pour tous les topics rendus ;
- `feed_reason_code` et `feed_reason_label` sont fournis pour la homepage ;
- l’agrégat principal est déjà résumé selon le `prediction_type` ;
- les sections `discussion`, `cards`, `resolution`, `territory`, `scope` existent déjà sous forme de payload exploitable ;
- la différence homepage vs Topics exhaustive est portée par des vues distinctes ;
- les cas `empty`, `unavailable`, `hidden`, `not found` sont documentés et stables ;
- aucun écran ne nécessite de joindre côté frontend plusieurs tables brutes pour reconstruire un état métier ;
- les vues privées et publiques restent cohérentes avec la RLS existante ;
- la page Topic ne dépend plus d’une agrégation ad hoc dispersée sur 4 ou 5 requêtes côté frontend.

---

## 9. Recommandations d’implémentation ultérieure

- ajouter un fichier SQL de migration dédié aux nouvelles vues publiques et privées orientées UI ;
- ajouter ensuite les types TypeScript correspondants dans `frontend/lib/types/views.ts` ;
- puis faire converger `frontend/lib/data/public/*` et `frontend/lib/data/authenticated/*` vers ces vues ;
- enfin simplifier les pages Next.js pour qu’elles consomment un seul contrat par écran majeur.
