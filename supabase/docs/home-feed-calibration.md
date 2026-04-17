# home-feed-calibration (historique)

Statut: document historique de cadrage phase 2.
Reference canonique runtime: ../../docs/front-back-contract.md.

---

# Politicoresto — Calibration du feed homepage cible

## Objectif

Ce document formalise la calibration du feed homepage cible basé sur une future vue `v_home_feed_topics`.

Le repo ne contient pas encore:

- `v_home_feed_topics`
- `editorial_feed_score`
- `feed_reason_code`
- `feed_reason_label`

La calibration ci-dessous sert donc de référence d'implémentation pour la future couche Supabase de ranking et de re-ranking.

## Sources de vérité utilisées

- schéma Supabase actuel
- contrats UI de [ui-data-contracts-phase-2.md](./ui-data-contracts-phase-2.md)
- corpus démonstratif [minimal_ux_seed.sql](../seed/minimal_ux_seed.sql)
- vues publiques existantes:
  - `v_topic_public_summary`
  - `v_topic_prediction_aggregate`
  - `v_territory_rollup_topic_count`
  - `v_territory_rollup_prediction_activity`

## Risques produit à corriger

Le modèle de feed doit corriger en priorité:

- la domination des sujets nationaux à forte participation;
- l'invisibilité des sujets locaux à faible volume;
- l'inertie des sujets anciens devenus trop lourds dans le classement.

Le ranking final doit rester:

- lisible;
- stable;
- varié;
- explicable par un micro-signal utilisateur.

---

## 1. Modèle de scoring brut

## 1.1 Signal `activity_score`

### Définition

Le signal mesure l'activité récente autour d'un topic.

Entrées recommandées:

- volume récent de `post` visibles;
- volume récent de `prediction_submission` actives;
- récence de ces deux activités.

### Fenêtre

- fenêtre principale: `72h`
- décroissance temporelle dans cette fenêtre

### Pondération interne recommandée

- submissions récentes: `65%`
- posts récents: `35%`

### Justification

Politicoresto est centré sur le topic prédictif.
Le volume de positions doit peser plus que le volume discursif brut.

## 1.2 Signal `freshness_score`

### Définition

Le signal mesure la fraîcheur réelle d'un sujet, à partir de `last_activity_at`, jamais à partir de `created_at` seul.

### Décroissance recommandée

- pleine valeur avant `48h`
- décroissance nette après `7 jours`
- quasi nulle après `21 jours` sans activité nouvelle

### Justification

Empêcher qu'un sujet ancien mais historiquement dense monopolise durablement la homepage.

## 1.3 Signal `participation_score`

### Définition

Le signal mesure la profondeur de participation active.

### Transformation

- utiliser une compression logarithmique:
  - `ln(1 + active_prediction_count)`

### Justification

Éviter qu'un seul cluster massif domine tous les autres sujets.

## 1.4 Signal `territorial_relevance_score`

### Définition

Le signal mesure la pertinence territoriale pour l'utilisateur ou, à défaut, le besoin de représentation locale.

### Modes

- utilisateur authentifié avec territoire connu:
  - bonus de proximité hiérarchique
- utilisateur anonyme:
  - fallback neutre
  - bonus limité de représentation pour les sujets `communal`, `departmental`, `regional`

### Justification

Le local doit apparaître comme moteur de découverte et non comme simple sous-produit du national.

## 1.5 Signal `shift_score`

### Définition

Le signal mesure la variation récente de l'agrégat du topic.

### Condition d'activation

- ne l'activer que si la mesure temporelle de variation est fiable;
- sinon conserver ce signal à `0` ou proxyfié de manière explicite.

### Normalisation

Le calcul doit être adapté au `prediction_type`:

- `binary`: variation de ratio
- `categorical_closed`: variation de distribution dominante
- `date_value`: déplacement de médiane
- `bounded_*`: déplacement de médiane ou moyenne
- `ordinal_scale`: déplacement de valeur centrale

### Justification

Éviter qu'un mouvement marginal sur un type soit traité comme un “grand shift” équivalent à un autre type.

## 1.6 Signal `resolution_proximity_score`

### Définition

Le signal donne un bonus aux sujets en cycle critique.

Sous-cas:

- `closing_soon`
- `pending_resolution`
- `recently_resolved`

### Effets attendus

- les sujets proches de la clôture remontent;
- les sujets `pending_resolution` ne disparaissent pas;
- les sujets résolus récemment restent visibles mais sans écraser les sujets ouverts.

## 1.7 Signal `editorial_priority_score`

### Définition

Correctif éditorial manuel à faible poids.

### Règle

- ne jamais en faire le moteur principal du feed;
- l'utiliser comme correction fine ou mise en avant d'un sujet structurel.

---

## 2. Pondérations initiales recommandées

- `activity_score`: `0.24`
- `freshness_score`: `0.18`
- `participation_score`: `0.12`
- `territorial_relevance_score`: `0.16`
- `shift_score`: `0.12`
- `resolution_proximity_score`: `0.13`
- `editorial_priority_score`: `0.05`

## Lecture des poids

- le feed reste animé par l'activité et la fraîcheur;
- la territorialité et le cycle critique reçoivent assez de poids pour corriger les biais naturels du volume;
- la participation reste importante mais compressée;
- la main éditoriale reste secondaire.

---

## 3. Ajustements comportementaux visés

## 3.1 Réduire l'effet “buzz national”

- abaisser le poids d'activité par rapport à une logique purement volumique;
- comprimer plus fortement la participation des sujets très massifs;
- renforcer le re-ranking de diversité par `space` et par `territory_level`.

## 3.2 Sauver le local faible volume

- rehausser `territorial_relevance_score`;
- ajouter un bonus modéré de représentation pour `communal`, `departmental`, `regional`;
- imposer une contrainte de présence locale dans le top 10.

## 3.3 Éviter l'inertie des sujets anciens

- baser la fraîcheur sur `last_activity_at`;
- décote forte après `7 jours`;
- aucun sujet ancien ne doit rester haut uniquement grâce à son historique.

## 3.4 Mettre en avant le cycle critique

- bonus spécifique pour:
  - clôture proche;
  - résolution attendue;
  - résolution publiée récemment.

---

## 4. Normalisation par type de sujet et type de prédiction

## 4.1 Compression pour les types à forte participation

Les types suivants génèrent souvent plus de volume brut:

- `binary`
- `categorical_closed`

Action recommandée:

- compresser davantage leur `participation_score` effectif.

## 4.2 Bonus de lisibilité pour les types moins “mass market”

Les types suivants sont souvent plus faibles en volume mais utiles pour la richesse du feed:

- `date_value`
- `ordinal_scale`
- `bounded_integer`

Action recommandée:

- léger bonus de ranking ou de re-ranking;
- à défaut, bonus de représentation dans la passe de diversification.

## 4.3 Bonus de représentation thématique

Les sujets `judicial` et `local-municipal` sont naturellement plus vulnérables à l'effacement.

Action recommandée:

- bonus modéré de visibilité dans le score ou dans le re-ranking;
- ne pas les laisser dépendre uniquement du volume brut.

---

## 5. Re-ranking de diversité

Le score brut ne suffit pas. Une passe de diversification est obligatoire.

## 5.1 Périmètre

- appliquer la diversité sur les `20` premiers candidats bruts

## 5.2 Contraintes recommandées

- pas plus de `2` sujets consécutifs du même `space`
- pas plus de `3` sujets `national/international` avant insertion d'un sujet territorial plus fin
- au moins `1` sujet `pending_resolution` dans les `8` premiers si disponible
- au moins `1` sujet `resolved` récent dans les `10` premiers si disponible
- au moins `2` sujets `communal/departmental/regional` dans les `10` premiers
- pas plus de `1` sujet `archived` dans les `15` premiers hors bloc dédié

## 5.3 Déterminisme

À score égal:

- ordre stable
- tie-break par `last_activity_at`
- puis `topic_id` déterministe

Le frontend ne doit voir que l'ordre final, jamais la phase de diversification.

---

## 6. Mapping amélioré des `feed_reason_code`

## 6.1 Codes et labels

- `high_activity`
  - label: `Remonte car l'activite se concentre ici`
- `consensus_shift`
  - label: `Remonte car le consensus a bouge`
- `closing_soon`
  - label: `Remonte car la cloture approche`
- `pending_resolution`
  - label: `Remonte car la resolution est attendue`
- `recently_resolved`
  - label: `Remonte car une issue vient d'etre publiee`
- `territory_relevant`
  - label: `Remonte car ce sujet concerne votre zone`
- `editorial_priority`
  - label: `Remonte car ce sujet structure la sequence`
- `balanced_injection`
  - label: `Remonte pour diversifier le feed`

## 6.2 Règles d'affectation

- `consensus_shift` seulement si la variation est réellement mesurée
- `territory_relevant` seulement si la proximité territoriale est le moteur principal
- `balanced_injection` pour les sujets injectés par le re-ranking sans être dominants en score brut

---

## 7. Mesures et diagnostics à exiger

## 7.1 Distributions du top feed

Mesurer le top `10` et le top `20` par:

- `space`
- `topic_nature`
- `prediction_type`
- `derived_lifecycle_state`
- `territory_level`

## 7.2 Corrélations à surveiller

- rang vs `active_prediction_count`
- rang vs `visible_post_count`
- rang vs âge du topic
- rang vs âge de `last_activity_at`

## 7.3 Indicateurs de santé

- part de sujets `communal/departmental/regional` dans le top 10 / top 20
- part de `pending_resolution` + `recently_resolved` dans le top 10 / top 20
- nombre de `spaces` distincts dans le top 10 / top 20
- part de `binary` + `categorical_closed` dans le top 12

---

## 8. Scénarios de validation UX

## 8.1 National dominant

- corpus où les sujets nationaux ont 3x plus de submissions que le local
- attente:
  - au moins `2` sujets territoriaux fins dans le top 10

## 8.2 Local fragile

- corpus avec plusieurs sujets communaux à faible volume mais activité récente
- attente:
  - au moins `1` sujet local dans les `8` premiers

## 8.3 Pending resolution

- corpus avec `3` sujets `pending_resolution`
- attente:
  - au moins `1` en haut de feed si des sujets clos existent

## 8.4 Resolved recent

- sujet résolu depuis moins de `72h`
- attente:
  - visible, mais sans écraser les sujets ouverts les plus importants

## 8.5 Vieux sujet dense

- sujet ancien avec gros historique et activité faible
- attente:
  - il ne domine pas un sujet récent en mouvement

## 8.6 Monoculture de space

- un espace avec beaucoup de sujets actifs
- attente:
  - il ne monopolise pas le haut de feed

## 8.7 Biais prediction type

- attente:
  - le top 12 ne se réduit pas presque entièrement à `binary` et `categorical_closed`

---

## 9. Implémentation backend recommandée

## 9.1 Couche préparatoire

Créer une couche SQL intermédiaire avec les signaux bruts:

- `activity_score_raw`
- `freshness_score_raw`
- `participation_score_raw`
- `territorial_relevance_score_raw`
- `shift_score_raw`
- `resolution_proximity_score_raw`
- `editorial_priority_score_raw`

## 9.2 Vue finale

Créer ensuite `v_home_feed_topics` avec:

- `editorial_feed_score`
- `feed_reason_code`
- `feed_reason_label`
- ordre final déjà stabilisé

## 9.3 Re-ranking

Si la diversification est trop lourde pour une simple vue SQL:

- utiliser un RPC feed côté Supabase
- garder le frontend en consommation simple du résultat final

---

## 10. Critères d'acceptation

La calibration est jugée correcte si:

- le top 10 n'est pas dominé par un seul `space`
- le top 10 garde une présence locale visible
- les sujets `pending_resolution` ou `recently_resolved` apparaissent quand ils existent
- les vieux sujets denses ne conservent pas artificiellement le haut du feed
- la microcopie `feed_reason_label` reste explicable et crédible
- le frontend peut consommer l'ordre et les labels sans logique locale

---

## 11. Hypothèses

- La calibration porte sur le feed cible futur, pas sur une vue déjà présente dans le repo.
- Les seeds actuels servent de corpus de démonstration, pas de benchmark final.
- Le territoire utilisateur peut être inconnu en anonyme, donc `territorial_relevance_score` doit avoir un fallback neutre.
- Le `shift_score` reste désactivé ou proxyfié tant qu'une source temporelle fiable de variation agrégée n'existe pas.
