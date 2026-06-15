---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-politicoresto-2026-06-12/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/briefs/brief-politicoresto-2026-06-12/brief.md
  - docs/research/2026-06-12-ux-patterns.md
  - docs/research/2026-06-12-anti-patterns.md
scope: 'Phase 1 (Boussole + Graphe/fiches + Forum sûr + transverses)'
status: draft
note: 'Brouillon Fast path — P1 uniquement. [ASSUMPTION] à confirmer.'
---

# PoliticoResto — Epic Breakdown (Phase 1)

## Overview
Découpage **Phase 1 du MVP** (tête de pont validée) : **aimant solo + espace sûr**
= Boussole (virale) + Graphe/fiches (SEO) + Forum sûr (« pas comme Reddit »), sur le
socle d'**espaces unifiés** (AD-1), avec i18n + sécurité + découvrabilité dès le départ.
P2 (sondages/tables/notifs) et P3 (pronos/soirées) **hors de ce document**.

## Requirements Inventory (P1)

### Functional Requirements (sous-ensemble P1)
- **FR-1** Créer/lire Topics/Posts/Commentaires (threading collapse, cap profondeur).
- **FR-2** Médias riches (image/GIF/YouTube facade ; 1 attachement riche/post).
- **FR-3** Réactions ensemble **fermé** + **Delta** ; **pas de downvote public** ; optimiste.
- **FR-4** Feed **sorts nommés** (Populaire/Nouveau/Top) + **« charger plus »** (a11y).
- **FR-5** Ranking **bridging** (`[ASSUMPTION: heuristique v1 simple, sans algo lourd]`).
- **FR-6** **Créer & naviguer** le graphe (Nœuds créables, dédoublonnage, arêtes typées).
- **FR-7** Nœuds **territoires** (maille émergente) + rattachement via code postal.
- **FR-8** **Fiche élu/candidat** + vérification/officialisation d'entité.
- **FR-13** Profil + **Flair** opt-in (P1 : support du flair = résultat Boussole).
- **FR-23** Passer la **Boussole** (thèses, scoring 2/1/0, double-poids).
- **FR-24** Restitution 2 axes + **match candidat/parti** (positions sourcées) + partage.
- **FR-32** Navigation (bottom-tab mobile / 3 colonnes desktop) + Créer.
- **FR-33** Recherche 3 segments (Débats/Tables/Membres) + Explorer localisé.
- **FR-34** Onboarding (Google One Tap, username-only, Tables-packs, empty states à CTA).
- **FR-39** i18n FR/EN (next-intl, zéro texte en dur, hreflang).

### NonFunctional Requirements (P1)
- **NFR-1** Sécurité : RLS default-deny + vues `SECURITY INVOKER` + `service_role` server-only.
- **NFR-3** Découvrabilité : SSR + JSON-LD + sitemaps + OG + hreflang + `llms.txt` (l'aimant SEO).
- **NFR-5** Perf perçue : `useOptimistic`, skeletons RSC, prefetch, zéro CLS.
- **NFR-6** A11y : WCAG 2.2 AA (contraste 4.5:1, cibles 44px, focus-visible, reduced-motion).
- **NFR-8** Observabilité : Pino, zéro `console.*`.
- **NFR-9** Tests : unit + intégration RLS/RPC + E2E happy+failure par feature.

### Additional Requirements (Architecture)
- **AD-1** Modèle d'**espaces unifié** : `space`/`space_edge`/`space_member`/`topic_space` ;
  reprise/remplacement forward-only de `space_role`/`space_status` (auditer l'usage).
- **AD-9** `reaction(kind enum fermé)` ; pas de valeur downvote ; `delta` = kind spécial.
- **AD-10** **Stratégie UI** : Catalyst+Base UI ; **boucle visuelle** (run+screenshot) obligatoire.
- Vues `SECURITY INVOKER` + `search_path` fixé (solder la dette advisor au passage).
- **Dédoublonnage des Nœuds** (clé naturelle + fusion admin) — prérequis FR-6.

### UX Design Requirements
- **UX-DR1** Tokens : supprimer les 3 vars custom `--spacing-*` ; échelle typo 4 rôles.
- **UX-DR2** Dark mode (variante `.dark` + `prefers-color-scheme` + toggle persistant).
- **UX-DR3** Kill-switch `prefers-reduced-motion` (corrige `scroll-smooth`).
- **UX-DR4** Bottom-tab-bar mobile (Accueil·Explorer·➕·Activité·Profil) + desktop 3 colonnes.
- **UX-DR5** Cartes légères (bord 1px, radius 8px, ombre au hover) ; dividers en thread.
- **UX-DR6** Composer 2 archétypes (modal réponse / page nouveau post + onglets type).
- **UX-DR7** Picker de réactions **fermé** (hover/tap, pas de palette ouverte).
- **UX-DR8** Threading niché + collapse + « continuer le fil ».
- **UX-DR9** Skeletons `loading.tsx` + Suspense ; optimistic sur le hot-path.
- **UX-DR10** Empty states avec **1 CTA** ; onboarding **Tables-packs**.

### FR Coverage Map
| FR | Epic.Story |
|---|---|
| FR-39, NFR-1/8, AD-1 | E1.1, E1.2, E1.3 |
| FR-1/2/3/4/5, AD-9, UX-DR5/6/7/8/9 | E2.1–E2.5 |
| FR-6/7/8, NFR-3 | E3.1–E3.4 |
| FR-13/23/24 | E4.1–E4.4 |
| FR-32/33/34, UX-DR4/10 | E5.1–E5.4 |
| NFR-3 (SEO/GEO) | E6.1–E6.2 |

## Epic List
- **E1 — Fondation : espaces unifiés, i18n, sécurité baseline** (enabler).
- **E2 — Forum sûr (interactions saines)**.
- **E3 — Graphe politique & fiches (aimant SEO)**.
- **E4 — Boussole VAA (aimant viral solo)**.
- **E5 — Navigation, découverte & onboarding**.
- **E6 — Découvrabilité (SEO + GEO/AEO)**.

---

## Epic 1 : Fondation — espaces unifiés, i18n, sécurité baseline
Poser le socle réutilisable par tout le reste : modèle d'espaces, i18n, garde-fous RLS.

### Story 1.1 : Modèle d'espaces unifié (Nœud + Table)
As a **développeur de la plateforme**, I want **un modèle `space` unique à deux natures
(Nœud / Table) avec arêtes et adhésion**, So that **forum, graphe et tables partagent la
même pile**.
**Acceptance Criteria:**
- **Given** une migration forward-only, **When** elle s'applique, **Then** `space`,
  `space_edge`, `space_member`, `topic_space` existent **avec RLS activée + ≥1 policy**.
- **Given** l'enum legacy `space_role/space_status`, **When** on l'audite, **Then** sa
  reprise **ou** son remplacement est tracé (forward-only, anciennes colonnes mirrorées 1 release).
- **Given** un Topic, **When** on le rattache à plusieurs Espaces, **Then** `topic_space`
  enregistre la relation N:N et la lecture résout tous les Espaces.

### Story 1.2 : Garde-fous sécurité baseline (RLS + vues INVOKER)
As a **responsable sécurité**, I want **RLS default-deny et des vues `SECURITY INVOKER`**,
So that **aucune fuite de données et la dette advisor est soldée**.
**Acceptance Criteria:**
- **Given** une nouvelle table, **When** la migration la crée, **Then** RLS est **enabled**
  et au moins une policy est livrée **dans la même migration**.
- **Given** les vues de lecture, **When** l'audit advisor tourne, **Then** **zéro**
  `security_definer_view` ERROR sur les vues touchées.
- **Given** un appel client, **When** il tente une écriture directe en table, **Then** c'est
  **refusé** (écriture uniquement via RPC).

### Story 1.3 : i18n FR/EN (next-intl)
As a **utilisateur international**, I want **l'app en FR et EN dès le départ**, So that
**la plateforme est mondiale par conception**.
**Acceptance Criteria:**
- **Given** `next-intl` configuré, **When** je visite `/en` ou `/fr`, **Then** l'UI est
  rendue dans la locale, avec `hreflang` et **zéro texte en dur** (lint).
- **Given** un nouveau composant, **When** il affiche du texte, **Then** ce texte provient
  d'un fichier de messages (clé par domaine).
- **Given** les données de référence, **When** elles sont modélisées, **Then** elles portent
  un `country`/`locale` (archi neutre juridiction).

---

## Epic 2 : Forum sûr (interactions saines)
Le « pas comme Reddit » : on s'exprime sans se faire enterrer. Réutilise le forum existant.

### Story 2.1 : Réactions à ensemble fermé + Delta (sans downvote)
As a **membre**, I want **réagir via un set fermé et décerner un Delta**, So that
**j'exprime un désaccord sans pile-on et je valorise ce qui me fait réfléchir**.
**Acceptance Criteria:**
- **Given** un post, **When** j'ouvre le picker, **Then** seules **5-7 réactions fermées**
  s'affichent (dont « pas d'accord » neutre), **aucun downvote public**.
- **Given** un commentaire, **When** je lui décerne un **Delta**, **Then** le compteur Delta
  du destinataire s'incrémente (visible sur son profil).
- **Given** une réaction, **When** je clique, **Then** l'UI **flippe optimistiquement** dans
  la même frame et se réconcilie serveur (rollback si échec).

### Story 2.2 : Threading niché + collapse
As a **lecteur de débat**, I want **des fils nichés repliables avec une profondeur bornée**,
So that **un débat reste lisible sur mobile**.
**Acceptance Criteria:**
- **Given** un fil profond, **When** il dépasse `[ASSUMPTION: 4-5]` niveaux, **Then** un lien
  **« continuer le fil → »** remplace l'imbrication.
- **Given** un sous-arbre, **When** je clique sur le trait/`[-]`, **Then** il se **replie**.

### Story 2.3 : Feed à sorts nommés + « charger plus »
As a **membre**, I want **trier le feed et charger plus sans scroll infini**, So that
**je garde le contrôle et l'accessibilité**.
**Acceptance Criteria:**
- **Given** le feed, **When** je choisis un tri, **Then** **Populaire** (défaut, recency-
  weighted) / **Nouveau** / **Top** s'appliquent ; **aucun algo « pour toi » opaque**.
- **Given** la fin de page, **When** je clique **« charger plus »**, **Then** le lot suivant
  s'insère, le **focus va au 1er nouvel item**, et un **skip-link** permet d'atteindre le footer.

### Story 2.4 : Posts riches (médias)
As a **membre**, I want **joindre image/GIF/YouTube**, So that **mes posts sont vivants**.
**Acceptance Criteria:**
- **Given** un post, **When** j'attache un média, **Then** **un seul** attachement riche est
  permis (média **XOR** sondage).
- **Given** un lien YouTube, **When** la carte s'affiche, **Then** c'est une **facade**
  (l'iframe ne charge qu'au clic).
- **Given** une image sans alt, **When** je tente de publier, **Then** l'**alt-text est requis**.

### Story 2.5 : Ranking bridging (santé du débat, v1 simple)
As a **plateforme**, I want **mettre en avant ce qui réduit la division**, So that
**l'outrage n'est pas récompensé**.
**Acceptance Criteria:**
- **Given** un contenu, **When** son rang est calculé, **Then** un **signal bridging** simple
  (réactions cross-bord + Deltas) le pondère, **documenté et inspectable**.
- **Given** la v1, **When** on évalue le coût, **Then** l'heuristique reste **simple** (pas
  d'algo lourd) `[ASSUMPTION]`.

---

## Epic 3 : Graphe politique & fiches (aimant SEO)
La valeur informationnelle « qui est mon député » + le graphe auto-construit.

### Story 3.1 : Créer & naviguer un Nœud
As a **membre**, I want **créer/proposer un Nœud et naviguer vers les Nœuds reliés**, So that
**le graphe politique se construit et s'explore**.
**Acceptance Criteria:**
- **Given** la création, **When** je crée un Nœud existant (même territoire/entité), **Then**
  le **dédoublonnage** m'oriente vers le Nœud existant (pas de doublon).
- **Given** un Nœud, **When** je l'ouvre, **Then** son **Forum** (discussions) et ses **arêtes
  typées** (candidat↔parti, territoire↔élu) sont navigables.

### Story 3.2 : Nœud territorial via code postal
As a **citoyen**, I want **trouver le Nœud de ma commune/département**, So that **je parle de
ce qui se passe près de chez moi**.
**Acceptance Criteria:**
- **Given** mon code postal, **When** je l'utilise, **Then** la résolution `geo.api.gouv.fr`
  **suggère** les Nœuds territoriaux pertinents.
- **Given** une maille absente, **When** un membre la crée, **Then** elle apparaît (maille **émergente**).

### Story 3.3 : Fiche d'élu/candidat (SSR + SEO)
As a **visiteur (même non connecté / journaliste)**, I want **une fiche d'élu lisible et
indexable**, So that **je m'informe et je peux la citer**.
**Acceptance Criteria:**
- **Given** une fiche, **When** un crawler la charge, **Then** elle est **server-rendered**
  avec **JSON-LD** (`Person`/`Organization`) et une URL canonique.
- **Given** une fiche, **When** je la consulte, **Then** actu/prises de position sourcées +
  le **Forum** de l'entité sont présents.

### Story 3.4 : Vérification / officialisation d'entité
As a **modérateur/admin**, I want **vérifier une entité réelle**, So that **on distingue le
vrai député du faux Nœud**.
**Acceptance Criteria:**
- **Given** un Nœud créé par un user, **When** rien n'est fait, **Then** il est **non vérifié**
  par défaut.
- **Given** une entité réelle, **When** l'admin la vérifie, **Then** un **badge** apparaît ;
  l'**usurpation** (faux « officiel ») est bloquée/signalable.

---

## Epic 4 : Boussole VAA (aimant viral solo)
La porte d'entrée : valeur immédiate sans réseau + partage.

### Story 4.1 : Passer la Boussole
As a **citoyen indécis**, I want **répondre à des thèses (accord/neutre/désaccord, double-
poids)**, So that **je situe mes idées sans m'inscrire dans un réseau**.
**Acceptance Criteria:**
- **Given** le quiz, **When** je réponds, **Then** le scoring est **2/1/0** transparent et je
  peux marquer une thèse **« ça compte pour moi »** (poids doublé).
- **Given** un set de thèses, **When** il se charge, **Then** il est **curé** par scrutin
  `[ASSUMPTION: ~30 thèses présidentielle 2027]`.

### Story 4.2 : Restitution 2 axes + match candidat
As a **citoyen**, I want **voir ma position et quel candidat me ressemble**, So that **je
comprends le paysage**.
**Acceptance Criteria:**
- **Given** mes réponses, **When** je termine, **Then** ma position s'affiche sur **2 axes
  (économique × culturel)** + un **classement de proximité** candidats/partis.
- **Given** une position de candidat, **When** je la consulte, **Then** elle est **sourcée**
  (citation inspectable).

### Story 4.3 : Partage du résultat (viralité)
As a **utilisateur**, I want **partager mon résultat**, So that **j'amène d'autres gens**.
**Acceptance Criteria:**
- **Given** mon résultat, **When** je le partage, **Then** une **OG image** générée + un lien
  s'affichent correctement sur les réseaux.
- **Given** le partage, **When** un visiteur arrive, **Then** il peut **passer la Boussole**
  sans compte (capture top-of-funnel).

### Story 4.4 : Flair résultat opt-in
As a **membre**, I want **afficher ma boussole en flair (optionnel)**, So that **je choisis
ma visibilité politique**.
**Acceptance Criteria:**
- **Given** mon résultat, **When** je l'active en flair, **Then** il s'affiche à côté du pseudo,
  **opt-in**, **scopable**, et **jamais public par défaut**.

---

## Epic 5 : Navigation, découverte & onboarding
Faire entrer et ne pas tomber dans une salle vide.

### Story 5.1 : Navigation mobile + desktop
As a **utilisateur mobile-first**, I want **une nav familière**, So that **je m'y retrouve
immédiatement**.
**Acceptance Criteria:**
- **Given** mobile, **When** j'ouvre l'app, **Then** une **bottom-tab-bar** (Accueil·Explorer·
  ➕·Activité·Profil), labellisée, scroll-to-top au re-tap.
- **Given** desktop, **When** je navigue, **Then** **3 colonnes** (rail espaces · feed · contexte).

### Story 5.2 : Recherche 3 segments
As a **membre**, I want **chercher débats/tables/membres**, So that **je trouve et je découvre
des espaces**.
**Acceptance Criteria:**
- **Given** une requête, **When** je cherche, **Then** **3 segments** ; une **Table privée
  n'apparaît jamais** pour un non-membre.
- **Given** les tendances, **When** elles s'affichent, **Then** elles sont **fenêtrées** et
  pondérées **vélocité+diversité** (pas nb de membres brut).

### Story 5.3 : Onboarding (One Tap + Tables-packs)
As a **nouvel arrivant**, I want **m'inscrire vite et atterrir sur du contenu**, So that **je
ne rebondis pas sur un feed vide**.
**Acceptance Criteria:**
- **Given** une session Google, **When** j'arrive, **Then** **One Tap** + onboarding
  **username-only**.
- **Given** l'onboarding, **When** je choisis 2-4 intérêts, **Then** je **rejoins en un tap**
  un bundle de Nœuds/Tables et mon feed est seedé.

### Story 5.4 : Empty states à CTA
As a **utilisateur**, I want **toujours une action proposée**, So that **je ne bute jamais sur
un mur vide**.
**Acceptance Criteria:**
- **Given** un état vide (feed/activité), **When** il s'affiche, **Then** il porte **headline +
  1 CTA** (jamais de mur vide).

---

## Epic 6 : Découvrabilité (SEO + GEO/AEO)
L'aimant d'acquisition machine : être trouvé par Google **et** cité par les LLM.

### Story 6.1 : SEO classique (SSR + structured data + sitemaps)
As a **moteur de recherche**, I want **un contenu server-rendered et structuré**, So that
**PoliticoResto se classe sur « qui est mon député »**.
**Acceptance Criteria:**
- **Given** une page (fiche, forum, boussole), **When** un crawler la charge, **Then**
  **JSON-LD** approprié + OG + canonical + **hreflang** sont présents.
- **Given** le site, **When** Google l'explore, **Then** un **sitemap dynamique** liste les
  pages publiques.

### Story 6.2 : GEO/AEO (parsable + llms.txt)
As a **agent LLM**, I want **un contenu entièrement parsable**, So that **je peux citer
PoliticoResto sur la politique**.
**Acceptance Criteria:**
- **Given** une page, **When** un agent la lit, **Then** **aucun texte n'est piégé dans une
  image** ; le contenu est accessible sans JS (server-rendered).
- **Given** la racine, **When** un agent cherche, **Then** **`llms.txt`** est servi.

---

## Stress-test persona (consigne Micky)
Pour chaque rôle, P1 le sert-il ? tensions / gardes-fous.

| Persona | Ce qu'il vit en P1 | Verdict | Garde-fou / à surveiller |
|---|---|---|---|
| **Gauchiste ultra-fermé** (veut « avoir raison », tendance à dominer/capturer la modération) | Il poste, réagit, mais **ne peut pas downvoter pour enterrer** un avis adverse ; le **bridging** met en avant le cross-bord | ✅ servi **mais bridé** | Pas de modération déléguée en P1 (tables = P2) → **risque de capture reporté** ; surveiller qu'il ne « Delta-farm » pas entre alliés (anti-gaming) |
| **Droitiste qui a honte de parler** (le wedge orphelins-Reddit) | Il lit sans être agressé, réagit « pas d'accord » de façon **neutre**, **n'est pas enterré** ; **flair opt-in** (il peut rester discret) | ✅✅ **cœur de cible P1** | L'anonymat fort (table aveugle) est **P2** → en P1 sa sécurité repose sur **pas-de-downvote + flair optionnel** ; vérifier qu'aucune réaction ne soit humiliante |
| **Journaliste** | Consulte **fiches d'élus** (SSR/SEO, citables), passe la **Boussole**, cite | ✅ servi (info + citabilité) | Les **sondages représentatifs** (sa vraie valeur) sont **P2** → en P1 on lui donne l'info/fiches, pas encore la donnée chiffrée |
| **Politicien officiel** | Trouve **sa fiche** (nœud), peut être **vérifié** ; publie comme tout le monde | ⚠️ partiel | **Compte officiel/macaron + back-office** : à confirmer en P1 (au moins la **vérification** d'entité, Story 3.4) ; publication officielle complète peut glisser P2 |
| **Parti officiel** | A un **Nœud parti**, relié à ses candidats ; vérifiable | ⚠️ partiel | Idem : présence + vérification en P1 ; **macaron** complet selon back-office |
| **Troll / usurpateur** (persona adverse) | Tente de créer un **faux Nœud « officiel »** d'un parti/élu | 🛑 **risque** | **Dédoublonnage + vérification + non-vérifié par défaut** (Story 3.1/3.4) ; **Open Q5 gouvernance des Nœuds = à trancher avant P1** |

**Conclusions du stress-test (à porter en backlog) :**
1. **Le wedge (droitiste honteux) est bien servi en P1** ; sa sécurité maximale (anonymat)
   arrive en P2 → s'assurer que P1 ne contient **aucune mécanique humiliante**.
2. **Capture par le gauchiste fermé** : non bloquante en P1 (pas de modération déléguée),
   **mais** prévoir dès P2 limites de pouvoir modo + méta-modération.
3. **Officiels/partis** : décider si **macaron/back-office** entre en P1 ou P2 (a minima la
   **vérification d'entité** est P1). `[À TRANCHER]`
4. **Gouvernance des Nœuds (anti-usurpation/spam)** : **prérequis P1** (Story 3.1/3.4 +
   Open Q5 PRD) — sinon le graphe ouvert est exploitable dès le lancement.
