---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-politicoresto-2026-06-12/prd.md
  - _bmad-output/planning-artifacts/briefs/brief-politicoresto-2026-06-12/brief.md
  - docs/weighting-architecture.md
  - docs/pronos.md
  - docs/technique.md
  - docs/front-back-contract.md
  - docs/research/2026-06-12-state-of-the-art.md
  - docs/research/2026-06-12-ux-patterns.md
  - docs/research/2026-06-12-anti-patterns.md
workflowType: 'architecture'
project_name: 'PoliticoResto'
user_name: 'Micky'
date: '2026-06-12'
status: draft
note: 'Brouillon Fast path — rédigé d''un trait, à itérer. [ASSUMPTION] = à confirmer.'
---

# Architecture Decision Document — PoliticoResto

> Brouillon **Fast path**. S'appuie sur le PRD final (39 FR) et **réutilise** le
> design redressement (`docs/weighting-architecture.md`) et pronos (`docs/pronos.md`)
> tels quels. Le « comment » technique fin (DDL exact) descend dans les migrations à
> l'implémentation. **Contrainte de séquençage : MVP phasé — P1 d'abord** (Boussole +
> graphe/fiches + forum sûr).

## 1. Contexte & contraintes (brownfield)

**Stack imposée, non négociable :** Next.js 16 (App Router, RSC, Server Actions,
`proxy.ts`) · Supabase (Postgres + RLS + RPC + **Realtime** + Auth `@supabase/ssr` +
Storage) · worker Python **redressement** sur Railway (samplics, pgmq) · Vercel
(déploiement via GitHub Actions ; Git integration off). Libs actées : `zod`,
`@t3-oss/env-nextjs`, **Pino** (`lib/logger.ts`), Catalyst + `@base-ui/react`,
**`next-intl`** (i18n). Source de vérité métier = **backend** (vues de lecture + RPC
d'écriture ; jamais de logique métier critique en React).

**Existant à réutiliser** (audit règle #7 avant de préserver) :
- Forum : `topic`/`thread_post`/`post`/réactions, vues `v_feed_global`,
  `v_thread_detail`, RPC `create_thread`/`create_post`/`create_comment`/`react_post`.
- **Redressement** : contrat `v_post_poll_summary` déjà exposé, tables `survey_*`
  conçues, worker `worker/`. **Gelé → à rebrancher**, pas à reconcevoir.
- **Pronos** : RPC `rpc_request_prono`/`place_bet`/`resolve_prono`, vues `v_prono_*`.
  **Gelé → à rebrancher** + ajouter le **score de précision** (Brier/peer).
- **MCP** : `app/api/mcp/[transport]/route.ts` (OAuth 2.1 + DCR) — à étendre.
- **Résidu** : enums `space_role`(legacy/global/party/bloc)/`space_status` d'un pivot
  → **socle du modèle d'espaces** ci-dessous (à reprendre/remplacer, forward-only).

**Invariants projet :** RLS + ≥1 policy par table dans la même migration ; migrations
forward-only/additives (jamais réécrites) ; `service_role` server-only ; zéro
`console.*` en app ; chaque feature user-facing livrée avec E2E happy+failure.

## 2. Vue d'ensemble système

```
                 ┌───────────────────────────────────────────────┐
   Navigateur /  │  Next.js 16 (Vercel)                           │
   Agent MCP ───▶│  RSC + Server Actions + Route Handlers         │
                 │  proxy.ts (auth gate) · next-intl (/fr,/en)    │
                 └───────┬───────────────────────────────┬───────┘
                         │ @supabase/ssr (JWT getClaims)  │ Realtime (WS)
                         ▼                                ▼
                 ┌───────────────────────────────────────────────┐
                 │  Supabase Postgres                             │
                 │  • RLS default-deny  • RPC (mutations)         │
                 │  • Vues de lecture (SECURITY INVOKER)          │
                 │  • Realtime (soirées, notifs)                  │
                 │  • pgmq('weighting')  • Storage (médias, KYC)  │
                 └───────┬───────────────────────────────┬───────┘
              pgmq.read  │                                │ webhook/SQL
                         ▼                                ▼
                 ┌──────────────────┐            ┌──────────────────┐
                 │ Worker redress.  │            │ Prestataire KYC  │
                 │ (Railway, Python)│            │ (délégué)        │
                 └──────────────────┘            └──────────────────┘
```

## 3. Décisions d'architecture clés

### AD-1 — Modèle d'**espaces unifié** (Nœuds + Tables) ★ pièce maîtresse
**Décision.** Un seul concept conteneur, l'**Espace** (`space`), avec deux *natures* :
- **Nœud** (`kind='node'`) — objet **partagé** du graphe politique : `node_type ∈
  {territory, elu, candidate, party, theme}`, **dédoublonné** (un par entité/
  territoire/thème), **vérifiable**. Créable par les utilisateurs (FR-6).
- **Table** (`kind='table'`) — espace **social** créé par un utilisateur, avec deux
  axes orthogonaux : `access ∈ {public, private}` × `identity_mode ∈ {open, blind}`.

**Schéma (esquisse) :**
- `space(id, kind, slug, title, description, status, created_by, created_at, …)`
  - colonnes nœud : `node_type`, `entity_ref` (lien vers `political_entity`/élu/parti),
    `verification_status ∈ {unverified, verified, official}`.
  - colonnes table : `access`, `identity_mode`.
- `space_edge(src_space_id, dst_space_id, edge_type)` — graphe : `candidate_of_party`,
  `theme_has_candidate`, `territory_has_elu`, `elu_of_party`… (arêtes **typées**).
- `space_member(space_id, user_id, role, joined_at)` — adhésion (tables : join/leave ;
  nœuds : abonnement/suivi).
- `topic_space(topic_id, space_id)` — **N:N** : un Topic/Post/Sondage/Prono se rattache
  à **un ou plusieurs** Espaces (FR-6).

**Pourquoi.** Une seule mécanique de forum (feed, posts, RLS, modération, sondages,
pronos) sert *tout* — Nœuds comme Tables — au lieu de dupliquer. Reprend `space_role`/
`space_status` (forward-only : nouvelles colonnes/enums, anciens mirrorés une release).
**Alternative rejetée :** deux sous-systèmes séparés (entités vs groupes) → duplication
de toute la pile forum + UX incohérente.
`[ASSUMPTION: dédoublonnage des Nœuds = clé naturelle (node_type, entity_ref|territory_code) + table de synonymes ; fusion par admin.]`

### AD-2 — **Anonymat structurel** (mode aveugle)
**Décision.** L'`author_id` réel est **toujours stocké** (anti-abus, FR-11) mais
**jamais exposé** dans un Espace `identity_mode='blind'`. La dé-identification est faite
**au niveau données** (vue/RPC), pas au front.
- Pseudonyme **stable par (space_id, topic_id, author_id)** dérivé déterministe
  (hash + sel par fil) → `display_pseudonym`.
- Les **vues de lecture** d'un Espace aveugle ne **SELECT jamais** `author_id` ni
  l'avatar/handle ; elles renvoient `display_pseudonym` + un glyphe masque.
- RLS : `author_id` lisible uniquement par son propriétaire + rôles modération/audit
  (jamais par les pairs). Réactions/Deltas attachés à l'ID réel côté serveur,
  affichés dé-identifiés.

**Pourquoi.** « L'anonymat est l'absence de chrome d'identité, pas un badge »
(recherche UX) ; le faire en base garantit qu'aucun chemin (API, MCP, SSR) ne fuit
l'identité. **Alternative rejetée :** masquage au front → fuite inévitable via API/MCP.

### AD-3 — Pipeline **redressement** (réutilisation intégrale)
**Décision.** Reprendre `docs/weighting-architecture.md` **tel quel** : `submit_post_poll_vote`
écrit le `survey_respondent_snapshot` atomiquement → trigger `pgmq.send('weighting')` →
worker Railway (samplics, Deville-Särndal, bornes [0.5,2.0]) → `survey_poll_estimate` →
`v_post_poll_summary` (déjà câblé au front). Ajouts PRD : **distinction Sondage redressé
vs Consultation** (colonne `poll_kind` + la Consultation ne déclenche pas le worker) ;
**covariables manquantes** (sexe, CSP, diplôme, région dérivée, vote passé) ajoutées à
`user_private_political_profile` ; **provenance structurée** (organisme, n, dates,
questions, MoE) en table dédiée (anticipe le légal parqué).
**Pourquoi.** Design déjà verrouillé et aligné état de l'art (Civey/raking) ; ne pas
reconcevoir. `[ASSUMPTION: raking/calibration v1 ; MRP hors v1.]`

### AD-4 — **Temps réel** (soirées électorales & notifs)
**Décision.** **Supabase Realtime** (canaux Postgres changes / broadcast) :
- `election_night(id, election_id, status)` + `election_result_live(election_night_id,
  …, updated_at)` → canal Realtime ⇒ ticker (FR-28) ; **fallback** : dernier état + `MAJ
  HH:MM` si déconnexion.
- `live_chat_message` + `live_chat_settings(slow_mode_s, mode)` (slow/reaction-only/
  members-only, FR-29) ; typing throttlé client (~2 s).
- **Résolution pronos en direct** : à l'insert d'un `election_result_live`, un
  trigger/worker résout les Pronos rattachés (FR-30) → notifs Realtime.
- Notifs (FR-35) : table `notification` agrégée (vue groupée) + canal Realtime perso.
**Pourquoi.** Déjà dans la stack ; pas de WebSocket maison (NFR-4). **Robustesse > needle
NYT** : ticker simple + fallback.

### AD-5 — **Sécurité étalon-maître** (RLS + KYC isolé)
**Décision.**
- **RLS default-deny partout** ; lecture via **vues `SECURITY INVOKER`** (corrige
  l'advisor `security_definer_view` existant) ; mutations via **RPC** `security definer`
  à `search_path` fixé.
- **KYC isolé** : pièces d'identité en **Storage privé** (bucket dédié, policies
  strictes) ou **déléguées à un prestataire KYC** (on ne stocke qu'un statut +
  référence, **jamais la pièce en clair**) ; `app_profile.is_verified` dérivé. Accès
  audité.
- `service_role` server-only (worker, back-office server) ; secrets jamais loggés
  (redaction Pino) ; CSP + headers ; validation Zod à chaque entrée ; `getClaims()`
  (JWKS) côté serveur.
- **Opinion politique jamais publique par défaut** : flair opt-in, mode aveugle, certif
  optionnelle (anti privacy-zuckering, §16 PRD).
**Pourquoi.** Données sensibles (Art. 9 + KYC). `[ASSUMPTION: prestataire KYC à choisir ;
défaut = Storage privé chiffré si pas de prestataire en v1.]`

### AD-6 — **MCP public** étendu
**Décision.** Étendre le serveur existant (`mcp-handler`, OAuth 2.1 Supabase + DCR) :
nouveaux outils sondages/pronos/tables, **toujours sous l'identité utilisateur (Bearer
Supabase) → RLS s'applique**, **zéro `service_role`**. Découvrable via PRM, référencé en
registre. **Pourquoi.** Réutilise l'acquis ; un seul chemin d'autorisation (RLS) pour
GUI et agents.

### AD-7 — **i18n & multi-pays** (archi neutre juridiction)
**Décision.** `next-intl` : routing `/fr`,`/en`, messages typés, **zéro texte en dur**.
**Données de référence par pays/locale** : `country`/`locale` portés par les données
métier (marges de redressement `survey_ref_*` déjà `as_of`+source ; élections ; axes
boussole ; mailles territoriales). La distinction Sondage/Consultation et la provenance
sont **paramétrables par juridiction**. **Pourquoi.** « International dès le départ » +
domiciliation non choisie → ne câbler aucune hypothèse France-only.

### AD-8 — **Découvrabilité** (SEO + GEO/AEO)
**Décision.** Tout **SSR/RSC** (déjà) ; **JSON-LD schema.org** par type (`DiscussionForumPosting`,
`Question`, `Event` pour soirées, `Organization` pour partis/élus) ; sitemaps dynamiques ;
OG/hreflang ; **`llms.txt`** ; **zéro texte en image**. Les résultats de sondage (avec
score de représentativité) exposés en **données structurées citables**. Le **MCP** est le
canal agent. **Pourquoi.** Être cité par les LLM + capter le trafic « qui est mon député »
(aimant d'acquisition P1).

### AD-9 — Interactions : feed, réactions, **pas de downvote**, Delta
**Décision.** `reaction(target_type, target_id, user_id, kind)` avec `kind` dans un
**ensemble fermé** (enum) ; **pas de valeur downvote** ; **`delta`** = `kind` spécial
compté sur le profil destinataire. Feed via **vues à sorts nommés** (Populaire =
`last_activity_at`+`editorial_feed_rank` ; Nouveau ; Top/fenêtre) + **curseur** (déjà).
**Ranking bridging** = score dérivé (réactions cross-bord + Deltas) pondérant le rang
(FR-5, `[ASSUMPTION: heuristique v1 documentée]`). **Pourquoi.** Anti-pile-on structurel.

## 4. Patterns transverses (à imposer aux agents implémenteurs)

- **Lecture = vues `SECURITY INVOKER`** ; **écriture = RPC** `security definer`
  search_path fixé. Le front ne touche jamais une table en écriture directe.
- **RLS d'abord** : chaque nouvelle table → RLS + policies dans la **même** migration.
- **Server Components par défaut** ; `getAuthUser(supabase)` là où besoin (pas de cache
  maison). Mutations = Server Actions / Route Handlers loggées (Pino).
- **Optimistic UI** (`useOptimistic`) sur le hot-path (réactions, votes, picks, join).
- **Validation Zod** à toute frontière (forms, actions, MCP, route handlers).
- **i18n** : tout texte via `next-intl` ; clés par domaine.
- **Tests** : unit + intégration (RLS/RPC contre Supabase local) + E2E (happy+failure)
  par feature ; `signInAsSeedUser`.

## 5. Structure du code (incréments sur l'existant)

```
frontend/
  app/(public)/…              # forum, /n/[node], /t/[table], /boussole, /sondage,
                              # /pronos (hub), /soiree/[id], fiche élu
  app/api/feed, /api/polls,   # route handlers existants + nouveaux (mcp, kyc-callback)
  app/api/mcp/[transport]/    # MCP étendu
  lib/data/{public,authenticated}/  # lectures (vues)
  lib/actions/                # mutations (RPC) : spaces, posts, polls, pronos, boussole…
  lib/spaces/                 # logique d'affichage Nœud/Table + dé-identification aveugle
  lib/i18n/ (next-intl) · lib/logger.ts · lib/supabase/{client,server,middleware,auth-user}
  messages/{fr,en}.json       # i18n
supabase/migrations/          # forward-only : space*, space_edge, space_member,
                              # topic_space, reaction(kind enum), boussole_*, survey_*
                              # (rebranchés), prono_* (+ précision), live_*, notification,
                              # provenance_*, profil covariables, KYC status
worker/                       # redressement (réutilisé) + résolution pronos live ?
```

## 6. Découpage par **phase** (aligne l'architecture sur le MVP)

- **P1 — Aimant solo + forum sûr** (livrable en premier, peu de dépendances réseau) :
  - `space` (Nœud) + `space_edge` + `topic_space` + dédoublonnage ; fiches élu (lecture
    SSR + JSON-LD = SEO) ; création de Nœud par les utilisateurs.
  - **Boussole** : `boussole_quiz`/`these`/`reponse` + scoring 2/1/0 + axes 2D + match
    (positions candidats sourcées, seedées) — **single-player, partageable** (OG image).
  - **Forum sûr** : réactions ensemble fermé + **Delta** + **pas de downvote** ;
    threading collapse ; sorts nommés + charger-plus.
  - Transverse : i18n FR/EN, sécurité RLS, découvrabilité, onboarding Tables-packs.
- **P2 — Boucle de rétention** : `space` (Table : access × identity, **anonymat
  structurel AD-2**) + adhésion ; **Sondages redressés** (rebrancher worker + covariables
  + Consultation vs redressé) ; notifications ; boucle 3 piliers.
- **P3 — Rendez-vous 2027** : **Pronos** (rebrancher + score de précision) ; **Soirées
  électorales** (Realtime AD-4 + résolution live) ; MCP étendu aux nouveaux outils.

`[ASSUMPTION: le compte certifié (KYC) arrive en P2 (préalable à la rému/poids) ; les
comptes officiels/back-office en P1-P2 selon besoin de seed des fiches.]`

## 7. Risques & validation

- **Risque graphe ouvert** (squat/spam de Nœuds) → dédoublonnage + vérification + trust
  level pour créer + fusion admin (Open Q5 PRD). **Bloquant P1 à cadrer.**
- **Risque anonymat** → tester qu'aucune vue/route/MCP d'un Espace aveugle ne renvoie
  `author_id` (test d'intégration RLS dédié).
- **Risque redressement** → réutiliser les golden tests du worker ; ne pas survendre.
- **Risque temps réel** → fallback obligatoire ; charge soirée (slow mode).
- **Advisors Supabase** : convertir les vues en `SECURITY INVOKER`, fixer `search_path`
  des fonctions (dette existante à solder dans la même vague).
- **Validation** : chaque phase = `verify` vert + intégration RLS/RPC + E2E happy+failure.

## 8. Questions ouvertes d'architecture
1. **Dédoublonnage/gouvernance des Nœuds** (clé naturelle, fusion, anti-squat) — P1.
2. **KYC** : prestataire délégué vs Storage privé chiffré (AD-5).
3. **Résolution pronos live** : trigger SQL vs worker (latence soirée).
4. **Bridging ranking** : heuristique exacte (signal cross-bord).
5. **pgmq/pg_cron/pg_net** : à installer (absents) — prérequis P2/P3.
6. Reprise vs remplacement exact de `space_role`/`space_status` (auditer l'usage réel).
