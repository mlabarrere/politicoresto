# Diagnostic statique du feed `v_home_feed_topics` sur `minimal_ux_seed.sql`

## Resume

Le fichier `supabase/seed/minimal_ux_seed.sql` est bien present dans le repo et alimente un corpus de `24 topics`, `8 spaces`, tous les `prediction_type`, avec des etats publics complets.

Je n'ai pas pu executer les requetes SQL reelles du `top 10 / top 20` dans cet environnement, car aucun client DB local n'est disponible ici (`psql`, `supabase`, `docker` absents). Le diagnostic ci-dessous est donc `statique`, mais ancre dans :

- le seed minimal reel ;
- la vue `supabase/migrations/20260401233000_home_feed_views.sql` ;
- les timestamps, volumes de posts et submissions reellement seedes ;
- la formule de scoring effectivement codee.

Le biais principal du corpus minimal n'est probablement plus "tout national". Avec la formule actuelle, le risque visible devient plutot :

- `sur-prime du local/regional` ;
- `sur-prime des pending_resolution` ;
- `sur-utilisation de feed_reason_code = territory_relevant`.

## Distribution attendue sur le corpus minimal

### Etats publics presents

- `open`: `10`
- `locked`: `4`
- `pending_resolution`: `4`
- `resolved`: `4`
- `archived`: `2`

### Prediction types

- `binary`: `6`
- `categorical_closed`: `4`
- `date_value`: `4`
- `bounded_percentage`: `4`
- `bounded_volume`: `2`
- `bounded_integer`: `2`
- `ordinal_scale`: `2`

### Repartition territoriale structurelle du corpus

- `country`: plusieurs sujets nationaux sur presidentielle, gouvernement, personnalites
- `region`: Ile-de-France, Hauts-de-France, Auvergne-Rhone-Alpes
- `department`: Paris au moins
- `commune`: Paris, Marseille, Lyon, Toulouse, Lille
- `macro`: Europe

### Cohorte tres probable du haut de feed

Sans ordre exact garanti, le haut du feed devrait etre tire par ces sujets, car ils cumulent activite recente, fraicheur et/ou prime territoriale :

- `adhesion-pacte-metropolitain-idf`
- `bloc-central-candidature-2027`
- `articles-retenus-texte-decentralisation`
- `part-etats-favorables-defense-europe`
- `motion-censure-avant-automne`
- `remaniement-marseille-date`
- `participation-consultation-toulouse`
- `score-alliance-ecologiste-lyon`
- `premiere-declaration-programmatique-2027`
- `tension-cmp-texte-institutionnel`

Les `pending_resolution` les plus susceptibles de remonter haut :

- `premiere-declaration-programmatique-2027`
- `budget-paris-defections-2026`
- `primaire-centre-reformiste-regionale`
- `renvoi-metropole-marches-publics`

## Biais visibles du feed actuel

### 1. Le local est probablement sur-corrige

`territorial_relevance_score_raw` vaut :

- `1.00` commune
- `0.85` department
- `0.72` region
- `0.50` country
- `0.40` macro

Avec un poids de `0.16`, cela cree un avantage fixe important :

- commune vs country: `+0.08`
- region vs country: `+0.0352`
- commune vs macro: `+0.096`

Sur un corpus ou beaucoup de sujets ont des volumes recents proches, cet ecart structurel suffit a pousser plusieurs sujets territoriaux devant des sujets nationaux pourtant aussi actifs.

### 2. `pending_resolution` peut remonter trop haut trop facilement

`resolution_proximity_score_raw = 1.0` pour tout `pending_resolution`, soit un bonus direct de `+0.13`.

C'est plus fort que plusieurs ecarts d'activite ou de participation dans ce corpus minimal.

Resultat probable :

- un sujet clos, peu recent, mais `pending_resolution` peut depasser un sujet `open` plus vivant.

Exemple typique :

- `renvoi-metropole-marches-publics` ou `budget-paris-defections-2026` peuvent rester trop hauts malgre une activite plus ancienne.

### 3. `feed_reason_code = territory_relevant` est trop large

Le mapping actuel classe en `territory_relevant` tous les sujets dont :

- `primary_territory_level in ('commune', 'department', 'region')`
- et `territorial_relevance_score_raw >= 0.72`

En pratique, cela couvre `region`, `department` et `commune`.

Donc une grande partie des sujets territoriaux recents seront expliques comme "ce sujet concerne votre zone", meme quand la vraie raison produit est :

- l'activite ;
- la fraicheur ;
- ou une sequence locale tres vive.

Le micro-signal risque donc de devenir repetitif et peu credible.

### 4. Les sujets macro/internationaux sont penalises

`macro = 0.40` est tres bas.

Un sujet Europe pourtant frais et actif comme `part-etats-favorables-defense-europe` part avec un handicap structurel face a un sujet regional moyen.

Cela risque de sous-exposer la dimension geopolitique sur homepage.

### 5. Les vieux resolus/archives devraient peu remonter, et c'est plutot sain

`freshness_score_raw` chute correctement apres 7 jours.

Les topics resolus anciens comme `suspension-arrete-logement-paris` ou les archives comme `centralite-retour-ancien-premier-ministre` ne devraient pas dominer.

Sur ce point, la calibration actuelle semble saine.

## Ajustements precis recommandes

### Option A - Ajustement simple des ponderations

Si vous voulez corriger le feed sans toucher encore aux formules internes :

- `activity_score`: `0.26` au lieu de `0.24`
- `freshness_score`: `0.20` au lieu de `0.18`
- `participation_score`: `0.11` au lieu de `0.12`
- `territorial_relevance_score`: `0.12` au lieu de `0.16`
- `resolution_proximity_score`: `0.11` au lieu de `0.13`
- `shift_score`: `0.15` en cible future, mais `0` tant qu'il n'existe pas
- `editorial_priority_score`: `0.05`

Effet recherche :

- reduire la sur-prime geographique ;
- redonner la main a la fraicheur reelle ;
- eviter qu'un `pending_resolution` peu actif passe devant un `open` tres vivant.

### Option B - Ajustement plus fin sans trop bouger les poids

Si vous preferez garder les poids proches du cadrage initial, ajuster surtout le `territorial_relevance_score_raw` :

- commune: `0.88` au lieu de `1.00`
- department: `0.78` au lieu de `0.85`
- region: `0.66` au lieu de `0.72`
- country: `0.56` au lieu de `0.50`
- macro: `0.48` au lieu de `0.40`

Effet :

- l'ecart local/national reste visible ;
- mais ne suffit plus a lui seul a renverser des sujets nationaux plus vivants.

### Ajustement recommande sur `resolution_proximity_score_raw`

- `pending_resolution`: `0.85` au lieu de `1.0`
- `recently_resolved`: `0.80` au lieu de `0.85`
- `closing_soon`: conserver la plage actuelle

Effet :

- conserver le signal de cycle critique ;
- eviter qu'il ecrase trop souvent l'activite reelle.

## Ajustements recommandes sur `feed_reason_code`

### Probleme actuel

- `territory_relevant` est trop souvent emis.
- Il devient un motif par defaut pour presque tout ce qui n'est ni pending ni recently_resolved.

### Mapping conseille

- `pending_resolution`
  - si `derived_lifecycle_state = 'pending_resolution'`
- `recently_resolved`
  - si `resolved_at >= now() - interval '72 hours'`
- `closing_soon`
  - si `open` et `close_at <= now() + interval '72 hours'`
- `high_activity`
  - si `activity_score_raw >= territorial_relevance_score_raw`
- `territory_relevant`
  - seulement si :
    - niveau `commune` ou `department`
    - et `activity_score_raw < 0.55`
    - et le sujet n'est pas deja capture par pending/resolved/closing
- `editorial_priority`
  - reserve au futur
- fallback :
  - `high_activity`

### Effet attendu

- les sujets locaux tres vivants seront expliques comme des sujets vivants, pas juste "locaux" ;
- `territory_relevant` redeviendra un signal utile et rare ;
- le micro-signal gagnera en credibilite editoriale.

## Diagnostic UX attendu sur top 10 / top 20

### Ce que je m'attends a voir aujourd'hui sur le corpus minimal

- `top 10`
  - bonne presence de regional/communal
  - probablement `2 a 4` nationaux
  - au moins `1` pending_resolution bien place
  - faible presence macro
- `top 20`
  - couverture raisonnable des spaces
  - mais surrepresentation probable de :
    - `municipales-grandes-villes`
    - `gouvernement-institutions`
    - `presidentielle-2027`
  - et sous-representation relative de :
    - `geopolitique-europe`
    - `personnalites-strategies`
    - `archived`

### Biais les plus probables a confirmer sur base reelle

- trop de `territory_relevant` dans les `feed_reason_code`
- `pending_resolution` parfois surclassant des `open` plus frais
- sous-visibilite des sujets `macro` pourtant actifs
- legere compression reelle des types, mais pas forcement domination extreme des `binary`

## Requetes de validation a executer des qu'un acces SQL local est disponible

1. `select count(*) from public.v_home_feed_topics;`
2. `select derived_lifecycle_state, count(*) from public.v_home_feed_topics group by 1 order by 1;`
3. `select prediction_type, count(*) from public.v_home_feed_topics group by 1 order by 2 desc;`
4. `select primary_territory_level, count(*) from public.v_home_feed_topics group by 1 order by 2 desc;`
5. `select space_name, count(*) from public.v_home_feed_topics group by 1 order by 2 desc;`
6. `select editorial_feed_rank, topic_slug, space_name, prediction_type, derived_lifecycle_state, primary_territory_level, editorial_feed_score, feed_reason_code from public.v_home_feed_topics order by editorial_feed_rank limit 10;`
7. `select editorial_feed_rank, topic_slug, activity_score_raw, freshness_score_raw, participation_score_raw, territorial_relevance_score_raw, resolution_proximity_score_raw from public.v_home_feed_topics order by editorial_feed_rank limit 20;`
8. `select feed_reason_code, count(*) from public.v_home_feed_topics group by 1 order by 2 desc;`
9. `select count(*) filter (where primary_territory_level in ('commune','department','region')) as territorial_top10, count(*) filter (where primary_territory_level in ('country','macro')) as national_macro_top10 from (select * from public.v_home_feed_topics order by editorial_feed_rank limit 10) t;`
10. `select topic_slug, topic_card_payload from public.v_home_feed_topics where topic_card_payload is null or topic_card_payload ->> 'title' is null;`

## Hypotheses retenues

- Le diagnostic est `statique`, faute d'execution SQL reelle dans cet environnement.
- Le seed minimal est suffisamment recent et coherent pour estimer les premiers rangs du feed.
- `shift_score_raw` et `editorial_priority_score_raw` restent a `0`, donc les ecarts observes viendront surtout de :
  - activite ;
  - fraicheur ;
  - participation ;
  - territoire ;
  - proximite de resolution.
