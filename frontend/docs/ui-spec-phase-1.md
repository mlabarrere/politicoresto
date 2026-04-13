# Politicoresto — UI Spec Exécutable Phase 1

## Objectif

Cette spécification décrit la cible UI/UX frontend exécutable pour les écrans publics et personnels majeurs de Politicoresto.

Elle est conçue pour être directement exploitable par les équipes frontend dans une architecture `thin client`:

- le frontend affiche, orchestre et compose ;
- Supabase calcule, agrège, classe, résout et contrôle les accès ;
- aucune logique métier critique ne doit être reconstituée côté React.

## Principes directeurs

- L’unité centrale du produit est le `topic`, pas le post.
- La homepage est un `feed éditorial de sujets`.
- La page Topics est un `index exhaustif et filtrable`.
- La discussion nourrit le sujet mais ne le noie pas.
- La gamification reste visible sans dominer le sens politique.
- L’état `clôturé mais en attente de résolution` est un état UI explicite.

---

## 1. Design System textuel

### 1.1 Grille

#### Desktop

- breakpoint: `>= 1280px`
- grille principale: `12 colonnes`
- homepage: `3 / 6 / 3`
- pages de détail: `8 / 4`

#### Tablet

- breakpoint: `768px à 1279px`
- grille principale: `8 colonnes`
- homepage: `2 / 6`
- la colonne de droite passe sous le feed

#### Mobile

- breakpoint: `< 768px`
- grille principale: `4 colonnes`
- empilement vertical
- aucun panneau latéral persistant

### 1.2 Espacements

- échelle: `4`, `8`, `12`, `16`, `24`, `32`, `48`
- intra-composant: `12–16`
- entre modules: `24`
- entre sections majeures: `32–48`

### 1.3 Densité

- densité visuelle: moyenne-haute
- densité informationnelle: contrôlée

Règles:

- pas plus de 3 métriques dominantes par bloc
- pas plus de 4 badges dans une Topic Card
- pas plus d’1 extrait discursif visible dans une Topic Card
- les modules latéraux restent bas et très scanables

### 1.4 Typographie

- ton visuel: presse civique, institutionnel, dense mais sobre

Niveaux:

- `Display / H1`: hero, titres de page
- `H2`: grandes sections d’écran
- `H3`: modules, cards, sections internes
- `Body`: résumés, descriptions
- `Meta`: badges, signaux, compteurs, dates

Règles:

- titres serrés, lisibles en un coup d’oeil
- résumés limités à 2–3 lignes
- les métadonnées n’écrasent jamais la question politique

### 1.5 Badges

Familles:

- `Statut`
- `Type de sujet`
- `Territoire`
- `Espace / taxonomie`

Règles:

- le badge de statut est toujours prioritaire
- style sobre, sans effet spéculatif
- une Topic Card ne doit pas dépendre des couleurs seules pour être comprise

### 1.6 CTA

Hiérarchie:

- primaire: action contextuelle centrale
- secondaire: navigation de détail
- tertiaire: suivi / découverte / sauvegarde

Libellés autorisés:

- `Se prononcer`
- `Voir le sujet`
- `Suivre`
- `Voir la résolution`
- `Suivre la résolution`

Interdits:

- vocabulaire de mise, de cote, de gain d’argent

### 1.7 Statuts UI

| Code UI | Libellé | Description |
|---|---|---|
| `open` | Ouvert | le sujet accepte encore des prises de position |
| `locked` | Verrouillé | lecture ouverte, action fermée ou suspendue |
| `pending_resolution` | Clôturé, résolution en attente | clôturé, en attente d’issue officielle ou de validation |
| `resolved` | Résolu | issue publiée et traçable |
| `archived` | Archivé | historique, faible priorité dans les flux |

Règle métier d’affichage:

- `pending_resolution` n’est jamais déduit côté frontend.
- il doit arriver comme champ backend dérivé unifié.

### 1.8 Modules latéraux

Types standard:

- tendances
- grands shifts
- cartes gagnables
- clôtures imminentes
- territoires proches
- métriques personnelles

Règles:

- modules autonomes
- lecture verticale rapide
- 1 objectif par module

---

## 2. Topic Card — composant central

## 2.1 Rôle

La Topic Card est l’objet primaire de consultation du produit.

Elle doit répondre immédiatement à quatre questions:

- de quoi parle le sujet ;
- que pense la communauté ;
- que puis-je faire ;
- pourquoi ce sujet remonte dans le feed.

## 2.2 Structure exacte

### Zone A — Ligne méta

Contenu:

- badge statut
- badge type de sujet
- badge territoire
- badge espace ou taxonomie primaire

Règles:

- maximum 4 badges
- ordre de lecture stable

### Zone B — Titre

Contenu:

- titre du topic

Règles:

- 1 à 2 lignes max
- formulation politique explicite, jamais cryptique

### Zone C — Résumé

Contenu:

- description courte du sujet

Règles:

- 2 lignes max
- doit permettre de comprendre l’enjeu sans ouvrir la page

### Zone D — Question prédictive compacte

Contenu:

- libellé de la question structurée
- rappel éventuel du prediction type si nécessaire

Règles:

- formulation concise
- pas de widget lourd dans la card

### Zone E — Synthèse agrégée

Contenu selon `prediction_type`:

- `binary`: ratio principal Oui/Non ou équivalent
- `date_value`: date médiane / date dominante
- `categorical_closed`: option dominante
- `bounded_percentage`: valeur centrale en %
- `bounded_volume`: valeur centrale + unité
- `bounded_integer`: valeur centrale
- `ordinal_scale`: niveau médian

Règles:

- une lecture dominante, pas de tableau

### Zone F — Métriques principales

Contenu:

- positions actives
- signal discussion
- échéance de clôture ou de résolution

Règles:

- 3 métriques max
- valeurs comparables visuellement entre cards

### Zone G — Micro-signal feed

Contenu:

- une phrase courte:
  - `Remonte car forte activité aujourd’hui`
  - `Remonte car le consensus a bougé`
  - `Remonte car la clôture approche`
  - `Remonte car la résolution est attendue`
  - `Remonte car ce sujet concerne votre zone`
  - `Remonte car une issue vient d’être publiée`

Règles:

- toujours fournie par le backend
- jamais inférée par le frontend

### Zone H — Extrait discursif

Contenu:

- un seul extrait de post ou signal discursif

Types autorisés:

- `analysis`
- `news`
- `local`
- `moderation`
- `resolution_justification`

Règles:

- 1 extrait max
- 2 lignes max
- sert de contexte, pas de thread embarqué

### Zone I — Cartes / récompenses

Contenu:

- 1 carte visible max
- compteur `+N`
- microcopie d’obtention éventuelle

Règles:

- secondaire visuellement
- jamais plus visible que la question politique

### Zone J — Actions

Contenu standard:

- CTA primaire
- CTA secondaire
- action tertiaire `Suivre`

## 2.3 Densité et dimensions

- hauteur cible desktop: `360–460px`
- mobile: pas de scroll interne

Limites:

- 4 badges max
- résumé 2 lignes
- 3 métriques max
- 1 extrait max
- 1 bloc cartes max

## 2.4 Variantes par statut

### Open

- badge principal `Ouvert`
- CTA primaire: `Se prononcer`
- agrégat visible
- horizon de clôture visible

### Locked

- badge principal `Verrouillé`
- CTA primaire: `Voir le sujet`
- justification courte si disponible

### Pending resolution

- double signal:
  - badge `Clôturé`
  - sous-ligne `Résolution en attente`
- CTA primaire: `Suivre la résolution`
- `resolve_deadline_at` affiché si présent
- aucune interaction de saisie

### Resolved

- badge principal `Résolu`
- cartouche d’issue visible
- CTA primaire: `Voir la résolution`

### Archived

- badge principal `Archivé`
- contraste réduit
- positionnement historique

## 2.5 Variantes par type de prédiction

### Binary

- synthèse: ratio dominant
- exemple: `62 % Oui`

### Date value

- synthèse: date médiane ou date dominante
- exemple: `Médiane: 18 juin`

### Categorical closed

- synthèse: option dominante
- exemple: `Option dominante: coalition A`

### Bounded percentage

- synthèse: `48 %`

### Bounded volume

- synthèse: `1,3 M voix`

### Bounded integer

- synthèse: `34 sièges`

### Ordinal scale

- synthèse: niveau médian + libellé
- exemple: `Médiane: 4 / Tension élevée`

## 2.6 Variantes contextuelles

### Sujet très actif

- micro-signal d’activité
- extrait discursif plus récent

### Sujet local

- badge territoire plus mis en avant
- signal de proximité possible

### Sujet sensible

- signal discret `Sensible`
- pas de dramatisation graphique

### Sujet résolu

- issue et source priorisées

## 2.7 États techniques

### Loading

- skeleton:
  - 1 ligne badges
  - 2 blocs titre/résumé
  - 1 bloc agrégat
  - 1 ligne métriques

### Unavailable

- la card n’est pas rendue dans le feed
- au niveau page, remplacement par un `ScreenStateBlock`

### Not found

- non applicable au niveau du feed

---

## 3. Homepage éditoriale

## 3.1 Rôle

- entrée narrative
- utile sans connexion
- orientée sélection, hiérarchie et découverte

## 3.2 Différence avec la page Topics

- homepage: sélection éditoriale priorisée
- page Topics: inventaire large, filtrable, quasi exhaustif

## 3.3 Hiérarchie visuelle

1. Header global
2. Sous-navigation éditoriale
3. Hero très court
4. Deux premiers sujets fortement visibles
5. Feed principal
6. Modules latéraux
7. Bloc `Résolus récemment`

## 3.4 Composition desktop

### Header

Contenu:

- logo / wordmark
- recherche
- liens principaux
- connexion / profil

### Sous-navigation

Onglets:

- `Tendances`
- `Élections`
- `Judiciaire`
- `Institutions`
- `International`
- `Local`
- `Résolus`
- `Exploratoire`

### Colonne gauche

Ordre:

- `Mes repères` ou `Découvrir`
- `Mes territoires`
- `Mes espaces`
- `Explorer par taxonomie`

### Colonne centrale

Ordre:

- hero court
- 2 Topic Cards premium
- rail ou intertitre de continuité
- feed éditorial principal

### Colonne droite

Modules:

- grands shifts
- cartes gagnables
- clôtures imminentes
- près de vous
- métriques personnelles si connecté

## 3.5 Hero

Contenu:

- titre court
- sous-texte d’orientation
- CTA:
  - `Voir les sujets`
  - `Comprendre le fonctionnement`

Règles:

- faible hauteur
- ne doit pas repousser le feed sous la ligne de flottaison

## 3.6 Composition mobile

- header compact
- subnav scrollable horizontalement
- hero court
- feed principal
- modules latéraux sous le feed

## 3.7 Modules obligatoires

- `A la une`
- `Feed éditorial`
- `Grands shifts`
- `Cartes gagnables`
- `Près de vous`
- `Résolus récemment`

## 3.8 États

### Loading

- skeleton hero
- 4 skeleton Topic Cards
- 3 skeleton modules latéraux

### Empty

Message:

`Les sujets publics arrivent. Les espaces et territoires visibles seront alimentés progressivement.`

Conserver:

- navigation
- quelques espaces
- catalogue cartes

### Unavailable

- bannière en haut du feed:
  - `Certaines agrégations sont momentanément indisponibles.`

### Not found

- non applicable

---

## 4. Page Topics exhaustive

## 4.1 Rôle

- inventaire complet des topics publics
- logique de consultation rationnelle

## 4.2 Hiérarchie visuelle

1. Titre + volume total
2. Barre de filtres
3. Barre de tri
4. Résultats
5. Pagination ou chargement incrémental

## 4.3 Composition

### Header de page

Contenu:

- titre `Tous les sujets`
- sous-texte:
  - “Parcourez l’ensemble des sujets publics, filtrez par territoire, statut ou type de prédiction.”

### Barre de filtres

Filtres:

- statut
- territoire
- type de prédiction
- espace
- taxonomie
- sensible si exposé par le backend

### Barre de tri

Options:

- plus actifs
- plus récents
- clôture proche
- résolus récents

### Résultats

- `TopicCardCompact` ou `TopicCard` allégée
- volume d’affichage plus dense que homepage

## 4.4 États

### Loading

- skeleton filtres
- 12 lignes ou cards skeleton

### Empty

Message:

`Aucun sujet ne correspond aux filtres.`

### Unavailable

- bannière de lecture partielle

### Not found

- non applicable

---

## 5. Page Topic

## 5.1 Rôle

- vue de référence d’un sujet
- le sujet prime sur la discussion

## 5.2 Hiérarchie visuelle

1. Hero topic
2. Statut / territoire / espace / taxonomie
3. Question prédictive
4. Synthèse agrégée
5. Action utilisateur
6. Discussion structurée
7. Résolution / attente de résolution
8. Cartes et sujets liés

## 5.3 Composition desktop

### Colonne centrale

Ordre:

- hero topic
- bloc question prédictive complet
- bloc synthèse collective
- bloc état du sujet
- bloc posts nourriciers

### Colonne droite

Ordre:

- territoire
- espace
- taxonomie
- cartes liées
- sujets voisins
- audit de résolution

## 5.4 Sections détaillées

### Hero topic

Contenu:

- titre
- résumé
- badges
- timeline:
  - `open_at`
  - `close_at`
  - `resolve_deadline_at`

### Question prédictive

Contenu:

- libellé complet
- bornes ou options si fournies
- règles de mise à jour déjà calculées côté backend

### Synthèse collective

Contenu:

- agrégat central
- participation
- dispersion si utile

### État du sujet

Cas spécifiques:

- `pending_resolution`
  - texte:
    - `Les prises de position sont closes. Résolution attendue avant [date].`

### Posts nourriciers

Règles:

- la liste affiche les posts liés par type
- les posts servent à documenter le sujet
- ils n’ouvrent pas un thread infini avant la question prédictive

### Résolution

Si résolu:

- issue
- note
- source(s)

Si pending resolution:

- attente
- date cible
- état officiel de suivi

### Découvrir plus

- topics voisins
- cartes liées

## 5.5 États

### Loading

- skeleton hero
- skeleton question
- 3 skeleton posts

### Empty

- discussion vide gérée dans sa section
- résolution absente gérée dans sa section

### Unavailable

- une section indisponible n’empêche pas le rendu global

### Not found

Message:

`Ce sujet n’est pas disponible publiquement.`

---

## 6. Page Espace

## 6.1 Rôle

- présenter un cadre éditorial cohérent

## 6.2 Hiérarchie visuelle

1. En-tête d’espace
2. Scopes visibles
3. Tabs de contenu
4. Flux de topics de l’espace
5. Polls, résolus ou archives

## 6.3 Composition

### Header

Contenu:

- nom
- description
- type d’espace

### Scopes visibles

Contenu:

- territoires couverts
- taxonomies principales

### Tabs

- `Sujets`
- `Polls`
- `Résolus`
- `Archives`

### Sidebar

- territoires couverts
- taxonomies dominantes
- stats de l’espace

## 6.4 États

### Loading

- skeleton header
- skeleton tabs
- skeleton cards

### Empty

Message:

`Cet espace est visible mais ne contient pas encore de sujets publics.`

### Unavailable

- une tab peut être absente sans bloquer le reste

### Not found

Message:

`Cet espace n’est pas public ou n’existe pas.`

---

## 7. Page Territoire

## 7.1 Rôle

- moteur d’exploration locale et territoriale

## 7.2 Hiérarchie visuelle

1. Hero territoire
2. Rollups de sujets et d’activité
3. Sujets actifs locaux
4. Sujets remontés des niveaux enfants
5. Résolus récents
6. Profils publics associés
7. Cartes territoriales

## 7.3 Composition

### Header

Contenu:

- nom
- niveau
- parent
- enfants

### Modules

- activité globale
- feed local
- comparaisons simples
- profils visibles
- cartes liées au territoire

## 7.4 États

### Loading

- skeleton header
- skeleton rollups
- skeleton liste

### Empty

Message:

`Aucun sujet public visible ici pour le moment.`

Complément:

- proposer parent ou enfants

### Unavailable

- rollups absents mais liste encore rendable

### Not found

Message:

`Territoire introuvable.`

---

## 8. Profil public

## 8.1 Rôle

- montrer une identité politique publique structurée

## 8.2 Hiérarchie visuelle

1. Identité publique
2. Territoire public
3. Cartes visibles
4. Activité récente
5. Réputation ou spécialisation visible
6. Sujets récents

## 8.3 Composition

### Hero profil

Contenu:

- display name
- bio
- territoire public

### Sections

- cartes visibles
- activité récente
- contributions récentes
- thèmes dominants si exposés

## 8.4 États

### Loading

- skeleton hero
- 3 modules skeleton

### Empty

Message:

`Ce profil public n’a pas encore d’activité visible.`

### Unavailable

- certains blocs peuvent être masqués selon visibilité

### Not found

Message:

`Profil introuvable ou non public.`

---

## 9. Espace personnel

## 9.1 Rôle

- poste de pilotage individuel

## 9.2 Hiérarchie visuelle

1. Résumé personnel
2. Prédictions actives
3. Résolutions attendues
4. Réputation
5. Cartes récentes
6. Recommandations

## 9.3 Composition

### Header

Contenu:

- avatar
- nom
- résumé d’activité

### Modules

- mes prédictions
- sujets suivis
- mes cartes
- réputation
- sujets à revoir bientôt

## 9.4 États

### Loading

- skeleton dashboard

### Empty

Message:

`Votre espace est prêt. Commencez par suivre un sujet ou prendre position.`

### Unavailable

- certaines vues privées peuvent être momentanément indisponibles

### Not found

- non applicable

---

## 10. Inventaire de cartes

## 10.1 Rôle

- rendre lisible la collection et la progression

## 10.2 Hiérarchie visuelle

1. Résumé d’inventaire
2. Filtres
3. Grille de cartes
4. Détail famille / rareté

## 10.3 Composition

### Header

Contenu:

- total cartes
- familles représentées

### Filtres

- famille
- rareté
- obtenues / à découvrir

### Carte individuelle

Contenu:

- label
- rareté
- description
- quantité
- date de première obtention

## 10.4 États

### Loading

- skeleton grille

### Empty

Message:

`Aucune carte obtenue pour le moment.`

### Unavailable

- peu probable, mais bloc d’alerte si vue partielle

### Not found

- non applicable

---

## 11. Réputation / historique

## 11.1 Rôle

- rendre l’historique d’activité compréhensible

## 11.2 Hiérarchie visuelle

1. Résumé réputation
2. Ledger d’événements
3. Performance sur sujets résolus
4. Bonus / pénalités
5. Historique détaillé

## 11.3 Composition

### Header

Contenu:

- score total
- nombre d’événements

### Sections

- timeline réputation
- précision récente
- contributions
- bonus cartes

## 11.4 États

### Loading

- skeleton résumé
- skeleton ledger

### Empty

Message:

`Aucun historique exploitable pour le moment.`

### Unavailable

- bloc de continuité:
  - `Une partie du calcul de réputation est indisponible pour le moment.`

### Not found

- non applicable

---

## 12. Responsive global

### Desktop

- lecture comparative
- navigation latérale stable
- contexte à droite
- feed central prioritaire

### Tablet

- feed prioritaire
- colonne de droite sous le feed
- colonne de gauche en modules compacts ou drawer

### Mobile

Ordre:

1. header
2. subnav
3. contenu principal
4. contexte secondaire

Règles:

- Topic Cards mono-colonne
- aucun tableau dense
- métriques compactées
- pas de double sidebar

---

## 13. Règles frontend strictes

Le frontend ne doit pas:

- déduire le statut dérivé ;
- recalculer le ranking ;
- deviner la raison de remontée dans le feed ;
- recomposer les agrégats ;
- interpréter la relation entre clôture et résolution sans champ backend dédié.

Le frontend doit:

- afficher les champs fournis par les vues ou RPC ;
- adapter le layout en fonction d’un état déjà dérivé ;
- gérer `loading`, `empty`, `unavailable`, `not found`.

---

## 14. Composants à prévoir

- `TopicCard`
- `TopicCardCompact`
- `LifecycleBadge`
- `FeedReasonMicrocopy`
- `PredictionSummaryBlock`
- `DiscussionSignal`
- `CardRewardInline`
- `TerritoryChip`
- `SpaceContextChip`
- `ScreenStateBlock`

---

## 15. Critères d’acceptation

- chaque écran a une hiérarchie visuelle explicite ;
- la distinction homepage / page Topics est nette ;
- la Topic Card est définie comme composant principal ;
- l’état `pending_resolution` est traité comme état UI distinct ;
- les états `empty`, `loading`, `unavailable`, `not found` sont prévus ;
- le responsive desktop / tablet / mobile est défini ;
- aucune logique métier critique n’est réintroduite côté frontend.
