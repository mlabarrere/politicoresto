---
title: PoliticoResto
status: final
created: 2026-06-12
updated: 2026-06-12
---

# PRD : PoliticoResto
*Working title — confirmer.*

## 0. Document Purpose

Ce PRD s'adresse au PM (Micky), aux parties prenantes, et aux workflows BMAD aval
(UX, architecture, epics/stories). Il **construit sur** le Product Brief v1.0
(`briefs/brief-politicoresto-2026-06-12/brief.md` + `addendum.md`) et deux dossiers
de recherche cités — produit (`docs/research/2026-06-12-state-of-the-art.md`) et UX
(`docs/research/2026-06-12-ux-patterns.md`) — qu'il ne duplique pas. Vocabulaire
ancré par le **Glossaire (§3)** ; features groupées (§4) avec **FR numérotés
globalement** (FR-1…FR-N, IDs stables) ; NFR transverses en §10 ; hypothèses
taguées `[ASSUMPTION]` inline et indexées (§9). **Juridique parqué** (domiciliation
non choisie) : documenté en guardrails (§11), non bloquant. Design technique
(redressement, transports temps réel, schéma) → `addendum.md`.

## 1. Vision

PoliticoResto prend l'**outillage du sondage politique professionnel**
(redressement statistique, représentativité, caractérisation idéologique) et le
rend **fun et grand public** : n'importe qui lance un **sondage redressé par
défaut** dont la **représentativité est visible et rassurante**. Le socle est un
**forum de débat politique** où la conversation est la fin et tout le reste un
moyen ; gravitent autour une **boussole « quel candidat me ressemble »**, un **jeu
de pronostics** (sans argent), des **soirées électorales live**, et des **tables**
(salons créés par les utilisateurs, ouverts ou anonymes).

Le produit est conçu **par et pour le politique**, **mobile-first**, avec la
**politique locale en priorité** (quartier, commune, département, son député). Tout
objet politique — territoire, élu, candidat, parti, thème — est un **nœud** qui est
aussi un **forum**, et ces nœuds forment un **graphe** navigable. Trois piliers
(**Forum ↔ Pronos ↔ Sondages**) s'enchaînent en **boucle vertueuse** : on débat, on
parie, on sonde, on revient débattre.

Ancre court terme : la **présidentielle française 2027** (banc d'essai). Ambition :
**la plateforme de référence politique mondiale**, multi-pays par conception, où
l'opinion citoyenne acquiert de la crédibilité et où le débat est plus sain
qu'ailleurs parce que l'architecture **récompense la qualité, pas la chaleur**.

## 2. Target User

### 2.1 Jobs To Be Done
- **Être entendu sans être enterré** : exprimer un avis politique (y compris
  minoritaire) dans un espace qui ne le « downvote » pas en silence.
- **Savoir si mon avis pèse** : lancer/consulter un sondage et connaître sa
  **représentativité réelle**.
- **Comprendre le paysage** : qui est mon député, quel candidat me ressemble, que
  pensent les gens près de chez moi.
- **Se mesurer / s'amuser** : prédire des résultats politiques et se challenger au
  classement.
- **Se retrouver entre soi** quand on le souhaite : créer un salon (table), public
  ou secret, à visage découvert ou anonyme.
- **Vivre l'événement** : suivre une soirée électorale en direct avec d'autres.
- **Citer un résultat crédible (journaliste/média)** : reprendre un sondage citoyen
  *visiblement* représentatif, avec sa **provenance** — **cible assumée dès v1** (les
  sondages sont conçus pour être citables ; cf. FR-21). *(Le démarchage presse actif
  attend le légal dé-parqué, mais le produit vise déjà cette citabilité.)*

### 2.2 Non-Users (v1)
- **Instituts/marques en self-service B2B** : la vente de sondages pro existe au
  modèle éco, mais l'outillage B2B dédié (dashboards clients, facturation) n'est
  pas un produit v1 — géré au cas par cas via back-office.
- **Annonceurs de publicité politique ciblée** : explicitement non-but (§5).
- **Parieurs en argent réel** : jamais (sans mise — cf. §11).

### 2.3 Key User Journeys

- **UJ-1. Karim lance un sondage et découvre qu'il « pèse ».**
  Karim, 24 ans, Roubaix, sent que les sondages classiques ne parlent jamais des
  gens comme lui. Authentifié (Google SSO), profil de base rempli. Depuis le
  composer, il choisit l'onglet **Sondage**, écrit « Faut-il rendre les
  transports gratuits ? », ajoute 3 options, publie dans le forum de sa **commune**. À
  mesure que les votes tombent, une carte affiche un **score de confiance** (« 48 %
  — il manque des +65 ans et des cadres pour fiabiliser »). Le redressement tourne
  en tâche de fond ; le résultat redressé + **intervalle** s'affichent.
  **Climax** : « waouh, mon sondage est *vraiment* représentatif et je vois
  pourquoi. » **Edge case** : profil incomplet → le sondage est créé mais sa propre
  réponse est marquée « partielle » et un nudge l'invite à compléter (sans bloquer).

- **UJ-2. Sophie, « orpheline de Reddit », ose reparler politique.**
  Sophie a quitté les subs politiques où ses avis étaient ensevelis. Elle arrive via
  un lien de **soirée électorale**, lit le fil sans se faire downvoter (il n'y a
  **pas de downvote public**), réagit avec **« ça m'a fait réfléchir »** à un
  commentaire d'un bord opposé. Elle rejoint la **table** « Présidentielle 2027 ».
  **Climax** : elle se sent en sécurité pour contribuer. **Resolution** : elle
  revient le lendemain pour parier sur le 1er tour.

- **UJ-3. Marc suit son député et débat localement.**
  Marc ouvre la **fiche** de son député (un **nœud-forum**), voit ses dernières
  prises de position, lit le fil de discussion, lance une **Consultation** « êtes-
  vous d'accord avec son vote sur X ? ». **Climax** : la politique locale devient
  tangible et discutable. **Resolution** : il s'abonne au nœud et reçoit les
  nouveautés.

- **UJ-4. Inès crée une table secrète et anonyme.**
  Inès veut un espace pour son collectif sans que personne ne sache qu'il existe.
  Elle crée une **table** **privée (sur invitation)** + **aveugle (anonyme)**, invite
  par lien. Dans la table, avatars et pseudos persistants sont **structurellement
  absents** ; une bannière « Vous postez anonymement » est visible au composer.
  **Climax** : discussion libre à l'abri. **Edge case** : un membre tente d'inviter
  hors-liste → refusé (accès sur invitation seulement).

- **UJ-5. Lucas vit la soirée électorale et résout ses pronos.**
  Lucas a parié sur plusieurs circonscriptions. Le soir J, il ouvre la **soirée
  électorale** : remontée des résultats en **temps réel**, **chat live** (slow mode
  en pic), et à mesure que les résultats tombent, ses **pronos se résolvent en
  direct** avec son gain de points et sa place au **classement**. **Climax** :
  l'adrénaline du direct. **Resolution** : il file commenter sur le forum (boucle).

- **UJ-6. Léa fait la boussole et trouve « son » candidat.**
  Léa, indécise, lance la **Boussole** : ~30 thèses, accord/neutre/désaccord,
  double-poids sur ce qui compte. Restitution : sa position sur 2 axes + le **match
  candidat/parti** classé. **Climax** : « ah, c'est lui le plus proche, et voici
  pourquoi (citations sourcées) ». **Resolution** : elle peut afficher le résultat
  en **flair** opt-in.

## 3. Glossary

- **Forum** — l'ensemble des espaces de discussion. Se décline en **Tables** et en
  **Forums canoniques** (nœuds-entités).
- **Topic / Sujet** — unité de discussion durable (titre, slug, statut), rattachée à
  un ou plusieurs **Nœuds**/Tables.
- **Post** — contribution racine ou de discussion à un Topic. Peut porter des
  **Médias** (image, GIF, embed YouTube) et au plus **un attachement riche** (média
  XOR sondage).
- **Commentaire** — réponse nichée à un Post (threading, profondeur capée).
- **Réaction** — signal léger attaché à un Post/Commentaire. Ensemble **fermé**
  (5-7 : d'accord, pas d'accord, source ?, bien argumenté…). Pas de downvote public.
- **Delta** — réaction phare « ça m'a fait changer d'avis / réfléchir », comptée par
  profil ; récompense le fait de faire bouger les lignes.
- **Table** — sous-forum créé par un utilisateur. Deux axes indépendants :
  **Accès** (*publique* découvrable / *privée* sur invitation, invisible aux
  non-membres) et **Mode d'identité** (*ouverte* / *aveugle* = anonyme).
- **Nœud politique (Entité)** — objet du **Graphe politique** : *Territoire*, *Élu*,
  *Candidat*, *Parti*, *Thème*. Chaque nœud est aussi un **Forum canonique**.
- **Forum canonique** — espace de discussion adossé à un Nœud (curé/seedé), par
  opposition à une Table (créée par les utilisateurs).
- **Graphe politique** — réseau de Nœuds reliés par des arêtes typées
  (candidat→parti, thème→candidats, territoire→élu, élu→parti).
- **Fiche d'élu** — vue d'un Nœud *Élu* : actu, votes, prises de position + son Forum.
- **Sondage redressé** — question + options où le résultat brut est corrigé par
  **Redressement** pour estimer une distribution représentative ; affiche un
  **Score de confiance** et un **Intervalle**.
- **Consultation** — sondage **explicitement non représentatif** (pas de revendication
  de représentativité ; pas de redressement « officiel »). Distinct du Sondage redressé.
- **Redressement** — pondération des réponses (calibration Deville-Särndal) selon les
  **Covariables** des répondants vers des marges de population de référence.
- **Covariables de redressement** — attributs du répondant utilisés pour pondérer
  (tranche d'âge, sexe, région, CSP, diplôme, vote passé).
- **Score de confiance** — entier 0-100 résumant la qualité/représentativité d'un
  Sondage redressé, décliné en **Bande** (*indicatif* / *correctable* / *robuste*).
- **Cellule-quota** — croisement démographique cible (ex. 18-24 × femme × Bretagne)
  suivi pour la représentativité et la **ré-invitation ciblée**.
- **Boussole (VAA)** — questionnaire de thèses produisant la position idéologique de
  l'utilisateur (2 axes) et un **Match candidat/parti**.
- **Thèse** — affirmation de la Boussole, notée accord(2)/neutre(1)/désaccord(0),
  pondérable par l'utilisateur (« ça compte pour moi »).
- **Prono** — entité de pronostic **durable** (peut vivre des mois) : événement à
  prédire, options, **Cote**, résolution. Vit dans un **Hub Pronos** + apparaît au feed.
- **Cote (Multiplicateur)** — gain potentiel d'une option, calculé à la résolution
  (jamais affiché avant). Sans argent.
- **Score de précision** — score propre (Brier/peer) mesurant la justesse des pronos
  d'un joueur ; alimente le **Classement** et la **Calibration**.
- **Soirée électorale** — événement live rattaché à un scrutin : résultats temps réel,
  **Chat live**, résolution des Pronos en direct.
- **Compte certifié** — compte ayant prouvé identité + qualité d'électeur local (KYC) ;
  éligible à rémunération, renforce l'anti-fraude et le poids de redressement. Badge
  **vérifié**.
- **Macaron officiel** — marqueur d'un **Compte officiel** (parti/élu/institution),
  octroyé manuellement via le **Back-office**, jamais vendu, avatar carré.
- **Flair parti** — affichage opt-in, à côté du pseudo, de l'affiliation/position
  idéologique déclarée ; supprimé en Table aveugle.
- **Trust level** — niveau de confiance gagné par lecture/participation, débloquant des
  **capacités** (créer une table, modérer…), perdable ; pas de score-karma public.
- **DM** — message privé entre membres.
- **MCP** — serveur Model Context Protocol public permettant à des agents externes
  d'accéder à PoliticoResto (lecture/écriture sous RLS via l'identité de l'utilisateur).
- **Worker de redressement** — service Python (Railway) qui calcule poids, estimations
  et Score de confiance de façon asynchrone.
- **Back-office** — console d'administration (octroi macarons, certifs, sponsors,
  modération de dernier ressort).

## 4. Features

> Convention : `[ASSUMPTION: …]` marque une inférence à confirmer. Chaque FR cite
> les UJ qu'il réalise. Le « comment » technique vit dans `addendum.md`.

### 4.1 Forum, contenu & interactions
**Description :** Le socle conversationnel (existant) étendu. Posts racine et
discussions nichées, **médias riches**, **réactions à ensemble fermé** + **Delta**,
**pas de downvote public**, threading collapsible, feed à **sorts nommés** +
« charger plus ». Réalise UJ-2, UJ-3.

#### FR-1 : Créer et lire des Topics/Posts/Commentaires
Un membre peut créer un Topic avec Post racine, répondre par Commentaires nichés, et
tout lecteur (selon visibilité) peut les lire. Réalise UJ-3.
**Consequences (testables) :**
- Un Topic publiable a toujours un Post racine ouvrable (invariant existant).
- Le threading est niché avec **collapse** de tout sous-arbre et un cap de profondeur
  (`[ASSUMPTION: 4-5 niveaux]`) puis « continuer le fil → ».
- Un Commentaire supprimé conserve la lisibilité du fil (placeholder).

#### FR-2 : Médias riches dans les Posts
Un membre peut joindre image(s), GIF, ou un **embed YouTube** à un Post.
**Consequences :**
- **Un seul attachement riche par Post** (média **XOR** sondage).
- L'embed YouTube se charge en **facade click-to-load** (pas d'iframe au render).
- Métadonnées média (dimensions, carte OG d'un lien) **snapshotées au post-time**
  côté serveur ; aucun re-fetch tiers au render (zéro layout shift).
- Alt-text requis pour les images (a11y).

#### FR-3 : Réactions (ensemble fermé) + Delta
Un membre peut réagir avec un emoji d'un **ensemble fermé** et décerner un **Delta**.
**Consequences :**
- L'ensemble de réactions est **fermé** (5-7, dont « pas d'accord » neutre) ; pas de
  palette ouverte ; **pas de compteur de downvote public**.
- Le **Delta** est comptabilisé sur le profil du destinataire.
- Réactions/Deltas sont **optimistes** (flip immédiat, réconciliation serveur).
- En Table aveugle, les réactions s'attachent à l'ID réel **côté serveur** (anti-abus)
  mais s'affichent **dé-identifiées**.

#### FR-4 : Feed à sorts nommés + pagination « charger plus »
Un membre peut trier le feed par **Populaire / Nouveau / Top (par fenêtre)** et
charger plus de contenu.
**Consequences :**
- Tri par défaut = **Populaire** (recency-weighted, `last_activity_at` +
  `editorial_feed_rank`), **pas d'algo opaque « pour toi »** en v1.
- Pagination par **bouton « charger plus »** (curseur), pas d'infinite-scroll auto ;
  focus déplacé sur le 1er nouvel item + skip-link (a11y WCAG 2.4.1).

#### FR-5 : Ranking « bridging » (santé du débat)
Le système favorise, dans la mise en avant, le contenu qui **réduit la division**
plutôt que l'engagement brut. Réalise UJ-2.
**Consequences :**
- Un signal de bridging (`[ASSUMPTION: dérivé des réactions cross-bord + Deltas]`)
  pondère le rang ; documenté et inspectable.
- **Out of Scope :** modération automatique de contenu par classifieur de toxicité
  (biais documenté ; non fiable seul) — voir §4.12.

**Feature-specific NFRs :** interactions hot-path < 1 frame perçue (optimiste).

### 4.2 Graphe politique & entités-nœuds
**Description :** Tout objet politique est un **Nœud** qui est aussi un **Forum**,
relié en **graphe**. **Le graphe se construit bottom-up : les utilisateurs créent
les nœuds** (leur commune, un thème, un candidat…) — la maille territoriale et le
graphe **émergent de l'usage**, pas d'une liste figée seedée d'en haut. Un amorçage
(seed `political_entity`/partis-politiciens) sert de point de départ et de
référentiel de **dédoublonnage**. **Politique locale prioritaire.** Réalise UJ-3.

#### FR-6 : Créer & naviguer le graphe politique
Un membre peut **créer/proposer un Nœud** (Territoire/Élu/Candidat/Parti/Thème),
l'ouvrir, et naviguer vers les Nœuds reliés. Réalise UJ-3.
**Consequences :**
- La création de Nœud est **ouverte aux utilisateurs** (le graphe s'auto-construit) ;
  **dédoublonnage** à la création (un même territoire/entité = un seul Nœud).
- Chaque Nœud expose son **Forum** (discussions + sondages + pronos) + un flux continu.
- Arêtes typées navigables (candidat↔parti, thème↔candidats, territoire↔élu).
- Un Post/Sondage/Prono peut être rattaché à un ou plusieurs Nœuds.
- **Out of Scope :** un Nœud créé par un utilisateur n'est **pas** « vérifié » par
  défaut (vérification/officialisation via FR-8/FR-15).

#### FR-7 : Territoires & politique locale (maille émergente)
Un membre peut créer/rejoindre le Nœud territorial de sa localité et y discuter ; la
**maille se construit d'elle-même** au gré des créations. Réalise UJ-3.
**Consequences :**
- Pas de maille imposée : commune, département, région, national — **et plus fin
  (quartier/arrondissement) dès que des utilisateurs le créent** et que les données
  le permettent.
- La résolution `code postal → ville/région` (geo.api.gouv.fr, déjà prévue pour le
  redressement) **suggère** les Nœuds territoriaux pertinents et aide au rattachement.

#### FR-8 : Fiche d'élu/candidat & vérification d'entité
Un membre peut consulter/enrichir la **Fiche** d'un Nœud élu/candidat (actu, prises de
position) ; une entité réelle peut être **vérifiée/officialisée**. Réalise UJ-3.
**Consequences :**
- La Fiche agrège des contenus sourcés (contributions des membres + curation) ;
  l'ingestion automatisée est hors v1.
- Une entité réelle (élu/parti/candidat) peut être **vérifiée** (badge) et, si elle
  s'inscrit, liée à un **Compte officiel** (macaron, FR-15) via le **Back-office**.

**Notes :** `[NOTE FOR PM]` distinction clé : **Nœud** = objet *partagé* du graphe
(un par entité/territoire/thème, dédoublonné, vérifiable) ; **Table** = salon *social*
créé par un utilisateur (FR-9). Les deux sont créables par tous, sémantiques
différentes. Résout la question « tables thématiques » du brief.

### 4.3 Tables (sous-forums utilisateurs)
**Description :** Salons créés par les utilisateurs. **Accès** (publique/privée-
invitation) × **Mode d'identité** (ouverte/aveugle), combinables. Modération déléguée.
Réalise UJ-4.

#### FR-9 : Créer et configurer une Table
Un membre (au **Trust level** requis) peut créer une Table en fixant son Accès et son
Mode d'identité. Réalise UJ-4.
**Consequences :**
- Les deux axes sont indépendants (4 combinaisons valides).
- Une Table **privée** est **invisible** aux non-membres (n'apparaît pas en recherche/
  explore) et rejoignable **sur invitation seulement**.
- Le créateur définit règles + rôles ; modération **déléguée** à la Table.

#### FR-10 : Rejoindre / quitter / inviter
Un membre peut rejoindre une Table publique (un tap), être invité à une privée, et la
quitter.
**Consequences :**
- Bouton **Join/Leave** unique + cloche notifs ; **preview avant de rejoindre**
  (règles + fils récents visibles) pour les Tables publiques.
- Invitation à une privée = lien/invite contrôlé ; tentative d'accès hors-liste refusée.

#### FR-11 : Mode aveugle (anonymat structurel)
Dans une Table aveugle, l'identité des participants est **structurellement masquée**.
Réalise UJ-4.
**Consequences :**
- Avatars + pseudos persistants **absents** ; pseudo **auto par fil**
  `[ASSUMPTION: pseudo stable par (table, fil, user)]`.
- Bannière « Vous postez anonymement » au composer ; tag « anonyme » visible **avant**
  d'entrer.
- L'anonymat est **d'affichage** : les IDs réels restent côté serveur pour l'anti-abus
  (transparence assumée dans les règles).

#### FR-12 : Modération déléguée par Table
Les modérateurs d'une Table peuvent gérer le contenu et les membres de leur Table.
**Consequences :**
- Actions de modération journalisées (audit) avec **motif** (transparence type DSA).
- Le Back-office reste l'autorité de dernier ressort (§4.12).

### 4.4 Identité, profil & réputation
**Description :** Trois **marqueurs d'identité distincts** (flair / vérifié /
officiel), profil sobre, réputation en **Trust levels** (capacités, pas karma public).

#### FR-13 : Profil & Flair parti
Un membre dispose d'un profil (bannière, avatar, bio, stats) et peut activer un
**Flair parti** opt-in. Réalise UJ-6.
**Consequences :**
- Le Flair s'affiche à côté du pseudo, **opt-in**, **scopable par table**, et est
  **supprimé** en Table aveugle.
- Le profil surface le **Score de précision pronos** (épistémiquement utile) plutôt
  qu'un karma ; pas de classement-karma public en v1.
- Socle data partiel existant : `app_profile.declared_partisan_term_id`.

#### FR-14 : Compte certifié (KYC électeur)
Un membre peut demander une **certification** (pièce d'identité + preuve d'électeur
local) pour obtenir le **badge vérifié**.
**Consequences :**
- Certification **optionnelle** ; le forum/sondages restent ouverts aux non-certifiés
  (sans rému ni poids « vérifié »).
- Les **données KYC sont isolées/chiffrées**, idéalement **déléguées à un prestataire
  KYC** ; jamais en clair, accès ultra-restreint + audité (cf. NFR §10).
- Un Compte certifié renforce l'**anti-fraude** des sondages et le **poids de
  représentativité** `[ASSUMPTION: modalités exactes de la « preuve d'électeur local »
  à définir — parqué légal/produit]`.

#### FR-15 : Comptes officiels (macaron) & vérification
Un parti/élu/institution peut obtenir un **Compte officiel** (macaron) octroyé via le
Back-office.
**Consequences :**
- Le macaron est **émis manuellement**, **jamais vendu**, avatar **carré** distinctif.
- Un **badge d'affiliation** (mini-avatar) peut indiquer le vouching ; tap = qui a
  vérifié (transparence).
- Un Compte officiel publie comme tout le monde (mêmes droits + identité attestée).

#### FR-16 : Trust levels (réputation par capacités)
Un membre progresse en **Trust levels** qui débloquent des capacités.
**Consequences :**
- La progression est gagnée par lecture/participation et **perdable** (inactivité/
  sanction) ; **pas de score-karma public**.
- Capacités gatées par niveau : créer une Table publique, créer une Table aveugle,
  modérer, héberger une soirée `[ASSUMPTION: mapping niveau→capacité à fixer]`.

### 4.5 Sondage redressé (grand public)
**Description :** Le cœur « pro rendu fun ». **Redressé par défaut**,
**représentativité visible**, **toujours un intervalle**, **anti-fraude existentiel**.
Réalise UJ-1. S'appuie sur le design `docs/weighting-architecture.md` + Worker.

#### FR-17 : Capter les covariables de redressement
Le système capte les **covariables** (tranche d'âge, sexe, région, CSP, diplôme, vote
passé) via le profil, en **profilage progressif**.
**Consequences :**
- Capture progressive (prompts ≤ 2 questions, reliés à un bénéfice : « pour que ton
  vote compte ») ; jamais bloquante.
- Champs manquants → covariable « unknown » de 1re classe (pas d'exclusion).
- Manquent au schéma actuel : sexe, CSP, diplôme, région dérivée, vote passé (à créer).

#### FR-18 : Créer un Sondage redressé ou une Consultation
Un membre peut créer un **Sondage redressé** (revendique la représentativité) ou une
**Consultation** (non représentative, explicitement labellisée). Réalise UJ-1.
**Consequences :**
- Le système **distingue en first-class** Sondage redressé vs Consultation.
- Création via composer (onglet Sondage, swap **sondage XOR média**) ; durée + « vote
  final » indiqués près des options.
- `[ASSUMPTION: par défaut, tout sondage politique est « redressé » ; la Consultation
  est un choix explicite.]`

#### FR-19 : Voter (final) + snapshot démographique
Un membre vote une fois (final) ; le système fige un **snapshot** des covariables au
moment du vote.
**Consequences :**
- Vote **final** (`on conflict do nothing` + garde « déjà voté » — existant).
- Snapshot écrit **atomiquement** avec le vote ; ancre la date de référence.
- Un vote avec profil incomplet est accepté et marqué **partiel**.

#### FR-20 : Redressement automatique + Score de confiance
Le système **redresse automatiquement** chaque Sondage redressé et produit un **Score
de confiance** + **Intervalle**. Réalise UJ-1.
**Consequences :**
- Redressement **asynchrone** (Worker) ; résultat brut **et** redressé disponibles.
- **Toujours un intervalle** (MoE incluant le design-effect), jamais un nombre nu.
- Le Score (0-100) + **Bande** (indicatif/correctable/robuste) sont affichés en clair
  (jauge + libellé), **sans jargon** (`deff`/IPF jamais exposés au lecteur) ;
  en-dessous d'un seuil, le redressé n'est pas présenté comme fiable
  (`[ASSUMPTION: seuil score<40 → pas de résultat corrigé, cf. design existant]`).
- Ne **jamais survendre** : message clair que le redressement corrige la
  représentativité, pas le biais de mesure.

#### FR-21 : Représentativité visible + ré-invitation ciblée
Le système montre **ce qui manque** pour fiabiliser et permet de **ré-inviter** les
**Cellules-quotas** sous-remplies. Réalise UJ-1.
**Consequences :**
- Affichage « il manque des {cellule} » en langage clair (pas de `deff` brut).
- Mécanisme de **ré-invitation ciblée** des cellules en retard `[ASSUMPTION: nudge/
  notif v1 ; ciblage fin v2]`.

#### FR-22 : Anti-fraude / qualité des réponses
Le système détecte et atténue la fraude (multi-compte, bot) et la mauvaise qualité.
**Consequences :**
- Détection bot/doublon + flags qualité (speeders, straight-lining).
- **Testable :** une 2e réponse du même compte au même sondage est **rejetée** ; une
  réponse marquée frauduleuse **n'entre pas** dans le calcul redressé et reste **tracée**.
- `[ASSUMPTION: les Comptes certifiés et les signaux de coordination renforcent le filtrage]`.

**Feature-specific NFRs :** transparence méthodologique (page `/methodologie`,
existant) ; **provenance structurée** d'un sondage (organisme, n, dates, questions,
MoE) modélisée en données (anticipe le légal parqué — cf. §11).

### 4.6 Boussole / candidat-match (VAA)
**Description :** « Quel candidat me ressemble » — quiz de **Thèses**, scoring
**transparent 2/1/0**, restitution 2 axes + match. Réalise UJ-6.

#### FR-23 : Passer la Boussole
Un membre répond à un jeu de **Thèses** (accord/neutre/désaccord, double-poids).
**Consequences :**
- Scoring **transparent 2/1/0** (Wahl-O-Mat) ; l'utilisateur peut marquer une Thèse
  « ça compte pour moi » (poids doublé).
- Jeu de thèses **curé** par scrutin/territoire `[ASSUMPTION: ~30 thèses présidentielle
  2027 en v1]`.

#### FR-24 : Restitution & match candidat/parti
Le système restitue la position de l'utilisateur (2 axes) et un **classement de
proximité** candidats/partis. Réalise UJ-6.
**Consequences :**
- Axes FR **économique × culturel** (pas lib/auth US).
- Positions des candidats/partis **sourcées** (citation inspectable) `[ASSUMPTION:
  positionnement expert/curé v1 ; v2 enrichi]`.
- Le résultat peut être affiché en **Flair** opt-in (FR-13).

### 4.7 Pronos (jeu de pronostics, sans argent)
**Description :** Entité **durable** (mois), **Hub dédié** + apparition feed, **Cote**
(frisson) **+ Score de précision** (classement/calibration), résolution en soirée.
**Sans argent.** Réalise UJ-5. S'appuie sur `docs/pronos.md`.

#### FR-25 : Demander / publier un Prono
Un membre demande un Prono ; un modérateur le publie (ouvre les paris). 
**Consequences :**
- Cycle demande → validation (modo) → ouverture → résolution (existant).
- Le Prono est une **entité durable** (deadline lointaine possible) avec **fil de
  discussion persistant**, vit dans le **Hub Pronos** et apparaît au feed.

#### FR-26 : Parier (sans argent)
Un membre place un pari sur une ou plusieurs options. Réalise UJ-5.
**Consequences :**
- **Aucune mise** du participant (invariant légal §11) ; pas de prix monétaire requis.
- La **Cote/Multiplicateur** n'est calculée et affichée **qu'à la résolution**.

#### FR-27 : Résolution, points, classement & calibration
À la résolution, le système attribue les points, met à jour le **Classement** et la
**Calibration**. Réalise UJ-5.
**Consequences :**
- Résolution par le modo (option(s) gagnante(s)) ; propagation des points + bannière
  rétroactive + notifs (existant).
- **Décision :** on garde la **Cote** (frisson) **ET** un **Score de précision**
  (Brier/peer) par joueur, alimentant le **Classement** + un **reliability diagram**
  perso (calibration). Les deux coexistent.
- Résolution **en direct** possible pendant une Soirée électorale (FR-30).

### 4.8 Soirées électorales (live)
**Description :** Événement temps réel : résultats live, **chat modéré**, résolution
pronos en direct. Réalise UJ-5. **Robustesse > esbroufe** (cf. recherche : la
« needle » NYT est fragile).

#### FR-28 : Suivre les résultats en temps réel
Un membre suit la remontée des résultats d'un scrutin en direct. Réalise UJ-5.
**Consequences :**
- Visualisation **simple** (barre / carte / ticker) alimentée par **Supabase Realtime**.
- **Testable (résilience) :** si le canal temps réel se coupe, le **dernier état + un
  horodatage « MAJ HH:MM »** restent affichés — jamais d'écran vide ni de chiffre périmé
  sans marqueur.
- `[ASSUMPTION: source des résultats = saisie back-office/officielle en v1 ; ingestion
  automatisée selon dispo.]`

#### FR-29 : Chat live modéré
Un membre participe au chat live d'une Soirée. Réalise UJ-5.
**Consequences :**
- **Modes de modération d'abord** : slow mode (≈10 s en pic), reaction-only,
  members-only ; typing throttlé (~2 s).
- Sondages **live** dans le chat (réutilise les RPC sondage).

#### FR-30 : Résolution des pronos en direct
Les Pronos rattachés au scrutin se **résolvent en direct** au fil des résultats.
Réalise UJ-5.
**Consequences :**
- Au passage d'un résultat, les Pronos concernés se résolvent et notifient les
  parieurs en temps réel.

### 4.9 Messagerie privée (DM)
#### FR-31 : Échanger des messages privés
Un membre peut envoyer/recevoir des **DM**.
**Consequences :**
- Conversations 1:1 `[ASSUMPTION: groupes = v2]`. **RLS self-only testable :** un tiers
  ne peut lire/charger une conversation dont il n'est pas participant.
- Un membre peut **bloquer** un autre → les DM d'un expéditeur bloqué sont **refusés**.
- Au-delà de N messages/minute, l'envoi est **temporisé** (anti-spam).

### 4.10 Découverte, navigation & onboarding
**Description :** Bottom-tab-bar mobile / 3 colonnes desktop ; recherche 3 segments ;
onboarding « Tables packs ». Réalise UJ-2.

#### FR-32 : Navigation (mobile + desktop)
Le système offre une navigation cohérente mobile-first.
**Consequences :**
- **Mobile** : bottom-tab-bar (≤5, labellisée) **Accueil · Explorer · ➕ Créer
  (centre) · Activité · Profil** ; **Desktop** : 3 colonnes (rail tables/feeds ·
  feed · rail contexte du nœud/table).
- Bouton **Créer** persistant ; depuis l'Accueil, **choix de la cible** (table/nœud)
  forcé.

#### FR-33 : Recherche & Explorer
Un membre peut chercher (3 segments **Débats / Tables / Membres**) et explorer.
**Consequences :**
- Une requête retourne les **3 segments** ; une **Table privée n'apparaît jamais**
  dans les résultats d'un non-membre.
- Tendances **fenêtrées** (24 h / 7 j) ; le rang d'une Table dépend de la **vélocité
  d'activité + diversité des contributeurs**, **pas** du nombre brut de membres.
- L'Explorer propose des Nœuds/Tables « près de chez vous » via la donnée territoriale.

#### FR-34 : Onboarding & empty states
Un nouvel arrivant est guidé pour éviter le « feed vide ». Réalise UJ-2.
**Consequences :**
- **Google One Tap** ; onboarding **username-only** + profilage progressif (existant).
- **« Tables packs »** : choisir 2-4 intérêts → rejoindre en un tap un bundle de
  Tables/Nœuds + feed seedé.
- Chaque **empty state** porte **un CTA**, jamais de mur vide.

#### FR-35 : Notifications
Un membre reçoit des notifications agrégées.
**Consequences :**
- Centre **2 onglets** ; l'onglet **Mentions** ne contient **que** les @-mentions
  (sous-ensemble strict des notifications).
- **Agrégation testable :** N événements (même verbe, même cible) = **une seule ligne**
  (« X et 4 autres… »), pas N lignes ; badge plafonné à **9+** puis point.
- Déclencheurs : réponses, mentions, réactions/Deltas, résolutions de pronos,
  nouveautés des Tables/Nœuds suivis.

### 4.11 Back-office (admin)
#### FR-36 : Administration
Un administrateur peut octroyer les **macarons officiels**, gérer les
**certifications**, les **sponsors**, et exercer la modération de dernier ressort.
**Consequences :**
- **Toute** action d'octroi (macaron / certif / sponsor) est **journalisée** (acteur,
  cible, horodatage, motif) et consultable.
- Accès **refusé** (403/redirect) à tout compte non-admin (gardé RLS/`is_moderator()`) ;
  MFA requise `[ASSUMPTION: MFA back-office]`.

### 4.12 Modération & intégrité (transverse)
**Description :** Empilement « santé du débat » : structure + bridging (FR-5) + Trust
levels (FR-16) + transparence. Réalise UJ-2.

#### FR-37 : Signalement & traitement transparent
Un membre peut signaler ; le système traite avec **transparence**.
**Consequences :**
- **Signalement privé** comme voie de démotion (pas de downvote public).
- Décisions de modération : **motif** communiqué + voie d'**appel** (esprit DSA/Santa
  Clara) ; journal d'audit.
- Détection de **coordination** (brigading/sockpuppet) par signaux comportementaux,
  **pas** par classifieur de toxicité seul (biais documenté).

### 4.13 MCP public (accès agents)
#### FR-38 : Serveur MCP public étendu
Un agent externe (au nom d'un utilisateur authentifié) peut lire/écrire via **MCP**
sous RLS.
**Consequences :**
- Outils MCP exposés (en plus de l'existant) : **sondages** (lire résultats redressés,
  voter), **pronos** (parier, leaderboard), **tables** (créer/rejoindre/poster, y c.
  mode aveugle).
- **Testable :** un appel MCP au nom d'un utilisateur ne lit/écrit **que** ce que la
  RLS de cet utilisateur autorise (une Table privée non rejointe reste **invisible**) ;
  **aucun `service_role`** dans le chemin.
- Le serveur est **découvrable** (PRM `/.well-known/oauth-protected-resource`) et
  **référencé dans ≥1 registre MCP public**.

### 4.14 Internationalisation (i18n)
#### FR-39 : Plateforme internationalisée FR/EN
L'UI est internationalisée dès le départ (FR/EN), prête pour d'autres langues.
**Consequences :**
- **next-intl** : textes externalisés (zéro texte en dur), routing localisé,
  hreflang.
- **Données de référence par pays/locale** (marges, élections, axes) — l'ossature
  s'internationalise, le contenu métier reste par pays (architecture neutre juridiction).
- `[ASSUMPTION: FR + EN au lancement ; autres langues = roadmap.]`

## 5. Non-Goals (Explicit)
- **Pas de jeu d'argent** : aucune mise du participant, aucun pari en argent réel
  entre particuliers, aucun prix monétaire conditionné à une mise (cf. §11).
- **Pas de ciblage publicitaire politique** sur données sensibles.
- **Pas de downvote public** ni de classement-karma public (choix de design anti-pile-on).
- **Pas de classifieur de toxicité** comme juge automatique du contenu (biais).
- **Pas de replay vidéo** des soirées en v1 (roadmap).
- **Pas de MRP** (ventilations sous-nationales fines) en v1 (raking d'abord).
- **Pas de self-service B2B** (sondages pros gérés au cas par cas).
- **Pas de devenir un média éditorialisant** : la plateforme outille la conversation,
  elle ne produit pas la ligne éditoriale.

## 6. MVP Scope

### 6.1 In Scope (v1)
Forum + posts riches + réactions fermées/Delta + feed sorts nommés/charger-plus ;
Graphe politique (territoires/local, fiche élu, candidats, partis, thèmes) ; Tables
(public/privé × ouvert/aveugle, modération déléguée) ; Profil/Flair, Compte certifié
KYC, Comptes officiels, Trust levels ; Sondage redressé grand public (redressement
auto, score de confiance, intervalle, anti-fraude, ré-invitation) + Consultation ;
Boussole VAA ; Pronos durables (sans argent, cote + score de précision, hub) ;
Soirées électorales (résultats live, chat modéré, résolution pronos live) ; DM ;
Découverte/nav (bottom-tab/3 colonnes, recherche 3 segments, onboarding tables-packs,
notifications) ; Back-office ; MCP public étendu ; i18n FR/EN ; Modération/intégrité.

### 6.2 Out of Scope for MVP
- Replay vidéo des soirées — `[NOTE FOR PM]` émotionnellement load-bearing ; revisiter
  si le temps le permet.
- MRP / ventilations sous-nationales fines (raking d'abord).
- Maille « quartier/arrondissement » si données indisponibles (commune+ d'abord).
- Self-service B2B sondages ; rémunération « qualité » (exploratoire) ; DM de groupe.
- Ingestion automatisée des fiches d'élus & des résultats live (saisie/curation v1).
- Conformité juridique active (DPIA, Commission des sondages) — parqué (§11).

## 7. Success Metrics
*`[HYPOTHÈSE]` — cibles à chiffrer avec Micky.*

**Primary**
- **SM-0 — Rétention (métrique-nord) :** part des nouveaux **revenant à J7 et J30**
  (le vrai test d'existence de la plateforme). Valide §15bis + la boucle 3 piliers.
- **SM-1 — Activation sondage :** part des nouveaux qui lancent **ou** votent un
  Sondage redressé en J+7. Valide FR-18/19.
- **SM-2 — Représentativité atteinte :** part des Sondages redressés atteignant la
  Bande **« robuste »**. Valide FR-20/21/22.
- **SM-3 — Rétention boucle 3 piliers :** part des actifs touchant ≥2 piliers
  (forum/sondage/prono) par semaine. Valide §12 (IA) + FR-25/18/1.

**Secondary**
- **SM-4 — Santé du débat :** ratio réponses délibératives (Deltas, réactions
  cross-bord) / réactions à chaud. Valide FR-3/5.
- **SM-5 — Engagement pronos :** parieurs actifs + amélioration de la calibration
  moyenne. Valide FR-26/27.
- **SM-6 — Soirée :** participants à une Soirée revenant à la suivante. Valide FR-28/30.

**Counter-metrics (ne pas optimiser)**
- **SM-C1 — Outrage :** part de contenu à chaud/clivant dans le top feed — **ne doit
  pas** monter avec l'engagement (contrebalance SM-3/SM-5).
- **SM-C2 — Faux représentatif :** nb de Sondages affichés « robustes » mais invalidés
  a posteriori (fraude/biais) — **garder bas** (contrebalance SM-2).
- **SM-C3 — Entre-soi :** part d'utilisateurs n'étant jamais exposés à un autre bord —
  **garder bas** (contrebalance la rétention).

## 8. Open Questions
*(Résolues le 2026-06-12 : journalistes = cible assumée v1 ; pronos = Cote + Score de
précision ; maille = émergente via nœuds créés par les utilisateurs.)*
1. Chiffrage des cibles SM (par Micky).
2. **Modèle économique** : validation juridique (parqué) ; périmètre v1 de la rému.
3. **Compte certifié** : modalités exactes de la « preuve d'électeur local » + choix
   du prestataire KYC.
4. **Trust levels** : mapping précis niveau → capacité.
5. **Gouvernance des Nœuds** : dédoublonnage/anti-spam/fusion des Nœuds créés par les
   utilisateurs ; qui peut renommer/scinder ; modération d'un Nœud.
6. **Sources** : fiches d'élus & résultats live (curation vs ingestion future).
7. **Domiciliation** : pays/entité (débloque le légal et fixe les données de référence).

## 9. Assumptions Index
- §4.1 FR-1 — cap de threading 4-5 niveaux.
- §4.1 FR-5 — signal de bridging dérivé des réactions cross-bord + Deltas.
- §4.5 FR-21 — ré-invitation ciblée : nudge/notif v1, ciblage fin v2.
- §4.5 FR-22 — Comptes certifiés + signaux de coordination renforcent le filtrage anti-fraude.
- §4.11 FR-36 — MFA back-office.
- §4.2 FR-6/7 — graphe & maille créés par les utilisateurs (gouvernance des Nœuds à
  cadrer — cf. Open Q5).
- §4.3 FR-11 — pseudo anonyme stable par (table, fil, user).
- §4.4 FR-14 — modalités « preuve d'électeur local » à définir ; KYC délégué.
- §4.4 FR-16 — mapping Trust level → capacité à fixer.
- §4.5 FR-18 — sondage politique « redressé » par défaut, Consultation = choix explicite.
- §4.5 FR-20 — seuil score<40 → pas de résultat corrigé présenté comme fiable.
- §4.6 FR-23/24 — ~30 thèses 2027 ; positions candidats curées v1.
- §4.8 FR-28 — résultats live saisis/curés en v1.
- §4.9 FR-31 — DM 1:1 en v1 (groupes v2).
- §4.14 FR-39 — FR+EN au lancement.

---

## 10. NFR transverses (Cross-Cutting)

- **NFR-1 Sécurité (étalon-maître, defense-in-depth).** RLS **default-deny** sur
  chaque table ; `service_role` **server-only** ; chiffrement au repos + transit ;
  **données KYC isolées/chiffrées, idéalement déléguées** ; secrets jamais loggés
  (redaction Pino) ; CSP + security headers ; validation Zod systématique ; supply-
  chain (Snyk/Codacy en CI) ; MCP OAuth 2.1 + DCR. Aucune donnée sensible en clair.
- **NFR-2 Anti-abus.** Anti-fraude/bot, détection de coordination (brigading/
  sockpuppet) par signaux, rate limiting, audit logs.
- **NFR-3 Découvrabilité (SEO + GEO/AEO).** Rendu **server-side**, HTML sémantique,
  **JSON-LD schema.org** (DiscussionForumPosting, Question, Event…), sitemaps, OG,
  hreflang ; **tout le texte parsable** (zéro texte en image), `llms.txt` ; MCP
  public. But : être **cité par les LLM**.
- **NFR-4 Temps réel.** Soirées + notifs via **Supabase Realtime** ; dégradation
  gracieuse + fallback ; pas de WebSocket maison.
- **NFR-5 Performance perçue.** `useOptimistic` sur le hot-path ; **skeletons** RSC
  (`loading.tsx`) + streaming Suspense ; prefetch ; zéro layout shift (aspect-ratio).
- **NFR-6 Accessibilité.** WCAG 2.2 AA (contraste 4.5:1, cibles 44×44, focus-visible
  non masqué, reduced-motion) ; primitives **Base UI + Catalyst**.
- **NFR-7 i18n / multi-pays.** Ossature internationalisée (next-intl) ; **données de
  référence par locale/pays** ; **architecture neutre vis-à-vis de la juridiction**.
- **NFR-8 Observabilité.** Logs structurés Pino (`lib/logger.ts`), zéro `console.*`
  en app ; corrélation requêtes ; advisors Supabase.
- **NFR-9 Qualité/Tests.** Pyramide (unit/intégration/E2E) ; toute feature
  user-facing livrée avec **E2E happy + failure** (CLAUDE.md #11) ; `verify` vert.

## 11. Constraints & Guardrails

### 11.1 Légal — **PARQUÉ** (domiciliation non choisie ; non bloquant)
Documenté pour ne pas être surpris ; à revisiter au choix du pays/entité. Détail
cité : `docs/research/2026-06-12-state-of-the-art.md` §Annexe + brief addendum §A.
- **Jeux d'argent (FR L320-1/ANJ)** : pronos **sans mise** = hors champ. **Invariant
  produit** : le participant ne mise jamais ; l'argent (modèle éco) vient des
  sponsors, pas des joueurs. Pas de prix conditionné à une mise.
- **RGPD Art. 9 / CNIL** : opinions politiques = données sensibles ; minimisation,
  consentement, **DPIA** à grande échelle. KYC = données très sensibles.
- **Commission des sondages (FR)** : si un résultat est publié comme *représentatif*
  sur sujet électoral → mentions structurées (organisme, n, dates, questions, MoE,
  notice) + interdiction de publication veille/jour de vote. → **modéliser la
  provenance en first-class** et **distinguer Sondage redressé vs Consultation** dès
  le schéma (fait en FR-18/§4.5).
- **DSA** : notice-and-action, motif, appels (couvert FR-37).
- **EU 2024/900** : pas de ciblage pub politique sur données sensibles (non-but §5).

### 11.2 Sécurité & Vie privée
Voir NFR-1/2/7. Curseurs d'exposition de la donnée politique = explicites (mode
aveugle, flair opt-in, certif optionnelle). Inférence d'orientation = traitée comme
donnée sensible.

### 11.3 Coût
Free-tier Supabase visé au départ (un seul projet = prod) ; Worker sur Railway. Pas
de provisioning automatique avant choix de domiciliation.

## 12. Information Architecture

- **Trois piliers en boucle vertueuse** : Forum ↔ Pronos ↔ Sondages, chacun
  **destination de premier rang**, navigation **sans friction**.
- **Deux familles de forums** : **Forums canoniques** (Nœuds-entités, curés) et
  **Tables** (utilisateurs) — UX cohérente, gouvernance distincte.
- **Surfaces** : Accueil (feed) · Explorer (recherche/découverte localisée) · Créer ·
  Hub Pronos · Soirées · Activité/Notifs · Profil · DM · Back-office.
- **Mobile** bottom-tab-bar ; **Desktop** 3 colonnes (cf. FR-32).

## 13. Monétisation `[HYPOTHÈSE — légal parqué]`
L'argent entre par les **pros/sponsors, jamais par les participants** (invariant
§11). (1) **Sondages payants (B2B)** — le moteur de redressement est l'actif
vendable. (2) **Sondages/pronos sponsorisés dotés** — cagnotte sponsor distribuée aux
**Comptes certifiés**, commission plateforme. (3) **(Exploratoire) rémunérer la
qualité** — financée plateforme/sponsors/partis, **transparence du financement
obligatoire** (anti-astroturfing). Détail : brief §Modèle économique.

## 14. Why Now
Forum déjà en prod + moteur de redressement déjà conçu et **gelé** → dégel et
finition. **Ancre 2027** (présidentielle française) = premier grand rendez-vous et
banc d'essai d'un produit conçu pour être mondial. Fenêtre : être installé **avant**
la campagne.

## 15. Aesthetic & Tone
**Copier la simplicité des réseaux sociaux modernes** (Reddit/X/Threads), mobile-
first, un seul accent chromatique, sobriété. **Ton** : la rigueur d'un institut,
l'énergie d'un jeu ; **honnêteté statistique** (jamais survendre) ; **fun et
rassurant** (le score de représentativité est ludique, pas anxiogène). Spécifications
de design system : `docs/research/2026-06-12-ux-patterns.md`.

## 15bis. Acquisition & Rétention — le vrai problème
**Principe (recadrage Micky 2026-06-12) :** le risque #1 n'est pas la conformité (parquée)
ni la complétude des features — c'est le **cold-start** : *attirer des gens et les faire
rester*. Une plateforme sociale, c'est d'abord ce problème.

- **Piège réseau :** sondages (votants), tables (membres), pronos (joueurs) ont tous
  besoin de masse. → il faut de la **valeur « solo » (sans réseau) dès l'arrivée**.
- **Aimants d'acquisition :** (1) **Boussole** = valeur solo + **partage viral** ;
  (2) **graphe/fiches** = **aimant SEO/GEO** (« qui est mon député ») ; (3) **wedge
  orphelins de Reddit** = audience qui cherche déjà une alternative ; (4) **2027 +
  soirées** = crochet rendez-vous (raison de venir *maintenant*).
- **Moteur de rétention :** **boucle 3 piliers** + **pronos durables** (mois) +
  **notifications** + **Tables packs** (anti-feed-vide).
- **Métrique-nord = rétention** (revenir), **pas** le nombre d'inscrits (cf. SM-3 ;
  ajout d'une **SM-0 rétention J7/J30** ci-dessous).

### MVP phasé (confirmé Micky 2026-06-12)
Le MVP **ne sort pas les 15 axes d'un coup** ; il se séquence autour de l'acquisition/
rétention :
- **P1 — Aimant solo + espace sûr :** Boussole (virale) · graphe/fiches (SEO) · forum
  **sûr** (pas de downvote = « pas comme Reddit ») · onboarding Tables-packs.
- **P2 — Boucle de rétention :** Sondages redressés (différenciateur) · Tables ·
  notifications · boucle 3 piliers.
- **P3 — Rendez-vous 2027 :** Pronos durables · Soirées électorales.
- **Transverse dès P1 :** i18n · sécurité · MCP · découvrabilité.

Ce phasage est **confirmé** (Micky, 2026-06-12) et **fixe l'ordre des epics/stories**.
Le périmètre §6 reste « v1 complète » ; ce §15bis en fixe l'**ordre de construction**.
**P1 est la tête de pont** : Boussole (aimant viral solo) + graphe/fiches (SEO) +
forum sûr.

## 16. Anti-patterns à éviter (guardrail de conception)
**Principe :** le produit vise l'**auto-organisation libre (façon Reddit)** — mais le
hands-off pur recrée les pathologies de Reddit (modération biaisée, chambres d'écho,
pile-ons). On ne modère pas *plus*, on **conçoit mieux le terrain**. Catalogue complet
et statut de mitigation : `docs/research/2026-06-12-anti-patterns.md`. À **interdire**
explicitement et/ou **renforcer** :
- **Dark patterns bannis** : ranking à l'outrage (→ bridging FR-5), infinite-scroll/
  autoplay (→ charger-plus FR-4), feed voyeur (→ FR-35), notifs/badges manipulateurs
  (fausse urgence), **roach-motel** (→ suppression/export de compte sans friction,
  surtout KYC), privacy-zuckering (→ opinion **jamais publique par défaut**), vente de
  vérification (→ FR-15).
- **Pièges du modèle Reddit à neutraliser par structure** : **capture/biais des
  modérateurs** (→ limites de pouvoir + méta-modération — `[NOTE FOR PM]` à renforcer),
  domination méga-communautés (→ FR-33), brigading/sockpuppets (→ FR-22/37), pile-ons
  (→ pas de downvote + Delta FR-3), **gatekeeping anti-nouveaux** (→ trust levels qui
  débloquent sans humilier, FR-16/34), Goodhart/karma-farming (→ pas de karma public),
  abus d'anonymat (→ responsabilisation serveur FR-11).
- **Risque nouveau (nœuds créés par les utilisateurs)** : **squat/usurpation/spam de
  Nœuds** → dédoublonnage + vérification d'entité (FR-8) + macaron (FR-15) + Open Q5.
