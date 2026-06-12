# Addendum — PoliticoResto (profondeur pour le PRD / architecture)

> Contenu qui dépasse le brief mais doit survivre pour les documents aval (PRD,
> architecture, solution design). Le brief reste à 1-2 pages ; le détail vit ici.

## A. Contraintes légales PARQUÉES (à revisiter au choix de domiciliation)

Documentées pour ne pas être surprises ; **non bloquantes** aujourd'hui.
Source détaillée et citée : `docs/research/2026-06-12-state-of-the-art.md` §Annexe.

- **RGPD Art. 9** — opinions politiques = données sensibles ; consentement
  explicite ; **DPIA obligatoire** à grande échelle (Art. 35) ; l'inférence
  d'orientation depuis le comportement est aussi de la donnée sensible (EDPB 8/2020).
- **Règlement UE 2024/900** — interdit la donnée sensible pour le ciblage
  publicitaire politique, même avec consentement. → ne pas bâtir de moteur de
  ciblage pub politique.
- **Commission des sondages (Loi 77-808)** — si un résultat est publié comme
  *représentatif* sur sujet électoral : mentions obligatoires (organisme,
  commanditaire, n, dates, texte des questions, MoE, notice) + **interdiction de
  publication la veille/jour du vote**.
- **Jeux d'argent (L320-1 / ANJ)** — pronos **sans mise** = hors champ ; un prix
  de valeur ou une « mise » (même en données) ferait basculer. → garder pronos
  gratuits, sans prix monétaire, label « gratuit sans obligation d'achat ».
- **DSA** — notice-and-action, statement of reasons, appels (modération).

### Modèle économique — tension à revisiter (PARQUÉ)
Le modèle (sondages payants B2B + cagnottes sponsor distribuées aux participants,
% plateforme) **réintroduit des flux d'argent** alors que les pronos avaient été
conçus « sans argent » pour rester hors du champ jeux d'argent. **Invariant qui
préserve la défense :** l'argent vient **toujours d'un sponsor/entreprise, jamais
d'une mise du participant** → cadre « panel rémunéré » + « jeu-concours gratuit
doté » (légal) plutôt que « jeu d'argent » (L320-1 : mise + hasard + gain). Points
durs à trancher au moment du droit : seuil de valeur des prix, qualification
loterie, fiscalité, statut des sondages payants vs Commission des sondages,
distribution transparente (tirage/score). **Ne PAS** permettre : mise des
participants, paris d'argent entre particuliers.

### Implications d'architecture à appliquer DÈS MAINTENANT (sans dépendre du droit)
1. Modéliser les **données de référence par pays/locale** (marges INSEE & équiv.,
   élections, axes idéologiques) — pas d'hypothèse France-only câblée.
2. Distinguer en first-class **sondage (revendique représentatif)** vs
   **consultation/jeu (explicitement non représentatif)**.
3. Modéliser les **mentions de provenance** d'un sondage comme données
   structurées (pas du texte libre).
4. Consentement & visibilité de la donnée politique = curseurs explicites
   (cohérent avec mode aveugle / flair opt-in).
5. **Compte certifié / KYC** : sous-système de vérification d'identité isolé —
   upload pièce d'identité + preuve d'électeur local. Données d'identité
   **chiffrées et séparées** du reste (sensibilité maximale), accès ultra-restreint,
   idéalement déléguées à un prestataire KYC plutôt que stockées en clair. Sert
   trois usages : éligibilité rému, anti-fraude, et **signal « électeur vérifié »**
   dans le redressement. *Modalités de « preuve d'électeur local » à définir
   (croisement situation électorale) — dépend aussi de la juridiction (parqué).*

## B. Existant repo à réutiliser (vérifier l'usage réel — CLAUDE.md règle #7)

- **Moteur de redressement** entièrement conçu : `docs/weighting-architecture.md`
  (Deville-Särndal/`samplics`, bornes `[0.5,2.0]`, tables `survey_ref_marginal/cell`,
  `survey_respondent_snapshot`, `survey_poll_weights/estimate`, score confiance
  0-100, worker Python `worker/`). Vue `v_post_poll_summary` expose déjà le contrat.
- **Pronos** conçus : `docs/pronos.md`, RPCs `rpc_request_prono`/`place_bet`/
  `resolve_prono`, leaderboard. **Décision Micky (2026-06-12) : garder le
  multiplicateur sentinelle / cote existant** (frisson « pari » assumé ; légal
  parqué). Option à cadrer au PRD : exposer *en plus* un score de précision
  (Brier/peer) pour le classement & la calibration, sans retirer la cote.
- **MCP** v0.1 : `frontend/app/api/mcp/[transport]/route.ts`, `docs/mcp.md`, 6
  outils, OAuth 2.1 Supabase + DCR.
- **Résidu `space_role`/`space_status`** (enum legacy/global/party/bloc) d'un
  pivot antérieur — à auditer avant de réutiliser pour les **Tables**.
- **Données démographiques** partielles : `app_profile.declared_partisan_term_id`
  (socle du **flair parti**), `user_private_political_profile` (DOB, postal_code).
  **Manquent pour le redressement** : sexe, CSP, diplôme, région dérivée, vote passé.

## B-bis. Tables — modèle à deux axes + question ouverte
- **Deux axes orthogonaux** : (1) **accès** = public/découvrable ↔ privé/secret
  (invitation seulement, invisible aux non-membres) ; (2) **identité des
  participants** = ouverte ↔ aveugle (anonyme). Combinables (4 quadrants).
- Une table héberge **tout** : discussions, sondages (redressés), pronos.
- **Question ouverte (Micky) — tables thématiques par couleur/idéologie.** Non
  tranchée. Bénéfice : « chez-soi » communautaire. Risque : **entre-soi / chambre
  d'écho** (cf. recherche §6 — l'architecture doit récompenser le bridging, pas la
  ségrégation). Pistes à explorer au PRD : tables thématiques **curées/officielles**
  + exposition cross-bord via le feed bridging ; ou s'abstenir. À trancher.
- Auditer le résidu `space_role/space_status` avant réutilisation (règle #7).

## C. Roadmap explicitement post-v1
- **Replay vidéo** des soirées électorales.
- **MRP** (ventilations sous-nationales) après le raking v1.
- Langues au-delà de FR/EN.
- Réplication pays-par-pays du playbook (post-2027).

## D. Décisions de design portées par la recherche (pour le PRD)
- **Toujours un intervalle, jamais un nombre nu** ; MoE *design-effect-aware*.
- **Anti-fraude/bot existentiel** pour un sondage internet public.
- **Boussole** : démarrer scoring transparent 2/1/0 (Wahl-O-Mat) + compas 2D
  (axes FR économique × culturel) ; positions partis **sourcées** = montée en
  crédibilité (`[advanced]`).
- **Modération** : empiler structure délibérative + ranking *bridging* (pas
  l'engagement) + gates de confiance progressifs (Discourse) + transparence ;
  ne pas se fier à un classifieur de toxicité seul (biais).
- **Réputation** : débloquer des **capacités**, pas des **points-vanité** (Goodhart).

## F. NFR Sécurité — **étalon-maître** (Micky : « la plus violente possible »)
Justification : données sensibles (opinions politiques = RGPD Art. 9 ; **pièces
d'identité KYC** des comptes certifiés). Defense-in-depth, par couches :
- **Données & accès** : **RLS sur chaque table, default-deny** (CLAUDE.md #4) ;
  `service_role` **server-only**, jamais client/Edge (#5) ; chiffrement au repos +
  en transit. **Données d'identité KYC isolées/chiffrées, idéalement déléguées à
  un prestataire KYC** (ne pas stocker les pièces en clair) ; accès ultra-restreint
  + audité. Minimisation : ne stocker que le strict nécessaire.
- **Auth** : `@supabase/ssr` canonique, `getClaims()` (JWKS), jamais de session
  non vérifiée ; pas d'auth maison. MFA pour back-office/comptes officiels (à voir).
- **Anti-abus** (existentiel — cf. recherche §2/§6) : anti-fraude/bot, détection
  sockpuppet/CIB (coordination, pas texte seul), **rate limiting**, modération
  transparente type DSA (notice/appel), audit logs (Santa Clara).
- **App sec** : security headers + **CSP**, validation **Zod** systématique, zéro
  SQL brut exposé à l'UI, **secrets jamais loggés** (redaction Pino), CSRF/cookies
  `@supabase/ssr`.
- **Supply chain** : **Snyk + Codacy déjà en CI** ; lockfile pinné ; dépendances
  à jour. MCP : **OAuth 2.1 + DCR** déjà en place (suite sécurité existante).
- **Process** (quand pertinent) : DPIA (au moment du légal dé-parqué), revues de
  sécurité, pen-test, journalisation/rétention maîtrisée, plan de réponse incident.

## E. NFR Découvrabilité (SEO + GEO/AEO) — Micky
- **SEO humain** : rendu server-side (RSC/SSR — déjà la stack), HTML sémantique,
  **JSON-LD schema.org** (Article, DiscussionForumPosting, Question/Answer,
  Organization, Event pour les soirées électorales), sitemaps dynamiques,
  OpenGraph/Twitter cards, **hreflang** (couplé i18n), URLs propres/canoniques.
- **SEO agents/LLM (GEO/AEO)** : **tout le texte parsable** (zéro texte en image),
  `llms.txt` + `robots.txt` accueillants aux crawlers IA légitimes, contenu
  accessible sans JS (server-rendered), **MCP public** comme canal d'accès
  structuré pour agents. Objectif : être **cité par les LLM** sur les sujets
  politiques.
- **Conséquence d'architecture** : éviter les contenus client-only non indexables ;
  exposer les résultats de sondage (avec score de représentativité) en données
  structurées partageables/citables.
