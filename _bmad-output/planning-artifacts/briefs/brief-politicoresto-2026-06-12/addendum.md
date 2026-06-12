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

## B. Existant repo à réutiliser (vérifier l'usage réel — CLAUDE.md règle #7)

- **Moteur de redressement** entièrement conçu : `docs/weighting-architecture.md`
  (Deville-Särndal/`samplics`, bornes `[0.5,2.0]`, tables `survey_ref_marginal/cell`,
  `survey_respondent_snapshot`, `survey_poll_weights/estimate`, score confiance
  0-100, worker Python `worker/`). Vue `v_post_poll_summary` expose déjà le contrat.
- **Pronos** conçus : `docs/pronos.md`, RPCs `rpc_request_prono`/`place_bet`/
  `resolve_prono`, leaderboard. ⚠️ revoir la mécanique « multiplicateur sentinelle/
  cote » → préférer un **score de précision (Brier/peer)** plus défendable et plus
  éloigné de la logique de pari (cf. recherche §5).
- **MCP** v0.1 : `frontend/app/api/mcp/[transport]/route.ts`, `docs/mcp.md`, 6
  outils, OAuth 2.1 Supabase + DCR.
- **Résidu `space_role`/`space_status`** (enum legacy/global/party/bloc) d'un
  pivot antérieur — à auditer avant de réutiliser pour les **Tables**.
- **Données démographiques** partielles : `app_profile.declared_partisan_term_id`
  (socle du **flair parti**), `user_private_political_profile` (DOB, postal_code).
  **Manquent pour le redressement** : sexe, CSP, diplôme, région dérivée, vote passé.

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
