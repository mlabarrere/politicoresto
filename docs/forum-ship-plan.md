# Plan de mise en prod — Forum (Tranche 1)

> **Décision de positionnement (2026-06-06).** PoliticoResto est un **forum de
> débat politique** augmenté d'outils politiques « pro » (sondage redressé,
> pronostics). La conversation est la fin ; tout le reste est moyen. Critère
> d'existence d'une feature : _est-ce que ça augmente la conversation ?_
>
> **Règle de discipline (WIP = 1).** Une tranche n'est *finie* que quand elle est
> **en prod et utilisée**. Tant que la tranche N n'est pas en prod, interdiction
> de toucher à la tranche N+1. On ne supprime rien (migrations forward-only) — on
> **range**.

## Séquence

| Tranche | Contenu | État |
| --- | --- | --- |
| **1 — Forum** | topics, posts, commentaires, réactions, feed, auth | 🎯 en cours (cette branche) |
| 2 — Sondage | sondage redressé + score de représentativité + invitation ciblée | 🧊 gelé |
| 3 — Pronos | jeu de pronostics scorés | 🧊 gelé |

## Constat d'audit (2026-06-06)

Le forum est **fonctionnellement complet** : aucune feature manquante, pas de
TODO/placeholder dans les chemins forum, tests E2E happy + failure présents. Le
seul travail pour shipper « forum seul » est de **ranger** sondage/prono hors du
chemin de prod (code conservé, débranché) + l'hygiène de déploiement.

Deux acquis de l'audit : la **nav globale est déjà 100 % forum**, et les **pronos
purs sont déjà invisibles dans le feed** (filtre OP `type === 'article'`).

## Checklist

### (1) Ranger sondage/prono hors prod — code conservé, usages débranchés

- [x] **Composer** `frontend/components/home/post-composer.tsx` : réécrit
      forum-only (plus d'onglets poll/prono ; un seul flux post).
- [x] **Composer page** `frontend/app/post/new/page.tsx` : ne passe plus
      `pronoAction` ; import `requestPronoAction` retiré.
- [x] **Feed item** `frontend/components/app/app-feed-item.tsx` : `PollPreview`
      retiré. Conséquence : un topic-sondage résiduel s'affiche en discussion
      normale (poll masqué), **pas** en carte nue.
- [x] **PostCard** `frontend/components/forum/post-card.tsx` : bloc
      `PollCardInline` + import retirés.
- [x] **Détail post** `frontend/app/(public)/post/[slug]/page.tsx` : bloc prono
      retiré (un topic `market` accédé en direct dégrade en discussion).
- [x] **Sidebar** `frontend/components/home/left-sidebar.tsx` : section
      « Sondages » retirée.
- [x] **Drawer mobile** `frontend/components/home/mobile-nav-drawer.tsx` : bloc
      « Sondages » retiré.
- [x] **Tri feed** `frontend/lib/ui/feed-sort-options.ts` : option `sondages`
      retirée (les branches mortes de `post-feed.tsx` sont désormais inatteignables).
- [x] **/me** `frontend/lib/account/sections.ts` + `me/page.tsx` : section
      « Historique de vote » et bloc Démographie retirés.
- [x] **Routes** : `app/(public)/pronos/**`, `me/pronos`, `admin/pronos/**`,
      `methodologie` réduites à un stub `notFound()` (route conservée pour
      `typedRoutes`, 404 en prod) ; `api/polls/vote` renvoie 404.
- [~] **Migration feed** : **non nécessaire** — `PollPreview` étant retiré, un
      topic-sondage dégrade en discussion. Une migration d'exclusion reste
      *optionnelle* si l'on veut masquer ces topics entièrement.
- [x] **E2E** : specs `poll-*`, `prono-*`, `pronos-*`, `weighted-*`,
      `weighting-*`, `voting-history` **déplacées** vers `tests/_frozen-e2e/`
      (exclue de tsconfig + eslint + testDir Playwright) ; cas poll retiré de
      `post-creation.spec.ts`. Les tests d'**intégration** poll/prono restent —
      ils visent le backend (RPC) qui n'est **pas** gelé.
- [x] **Surfaces résiduelles** (audit « carré ») : page d'édition ne propose
      plus le `PollEditForm` (un post-sondage résiduel s'édite en article) ;
      cloche **Notifications** retirée du header + requête `user_notification`
      retirée de `AppShell` ; route `/me/notifications` en stub `notFound()`
      (le système de notif n'est produit que par le backend prono, gelé).

### (2) Finir / réparer le forum

- [x] Imports orphelins retirés ; tests unitaires des features gelées
      (composer-tabs, sondages sidebar, section votes) supprimés/adaptés.
- [x] `npm run --prefix frontend verify` **vert** (prettier + eslint + auth
      guards + typecheck + 451 tests unit).
- [ ] `npm run --prefix frontend test:integration && test:e2e` verts (Supabase
      local up) — **non exécuté dans cette session** (pas de stack Supabase) ;
      laissé à la CI / au prochain run local.
- [ ] Smoke local (`./scripts/dev.sh`) : `/`, `/post/new` (1 flux), `/post/[slug]`,
      commentaires, votes, `/me` — UI ouverte + logs inspectés.

### (3) Déploiement prod — **différé (décision 2026-06-06)**

**Constat Supabase (audit MCP).** Le compte Supabase connecté ne voit qu'un
projet **« Marto » (`pmzeiwrrciutmdvifyex`) — une app d'inventaire, pas
PoliticoResto.** La prod référence `gzdpisxkavpyfmhsktcg`, invisible depuis ce
compte. Aucune des 73 migrations PoliticoResto n'y est appliquée.

**Décision.** On reste **local-first** ; le projet Supabase de prod sera créé
**plus tard** par le propriétaire. Pas de provisioning automatique.

**Modèle recommandé (free tier).** **Un seul** projet Supabase = prod (pas de
split staging/prod : le tier gratuit n'a ni branching ni 2e env « propre »).
Le pipeline CI à deux environnements devra être simplifié en conséquence.

**Steps turnkey (quand le projet existe) :**

1. Créer un projet Supabase (région EU), récupérer : `project_ref`, URL,
   `publishable key`, `service_role key`, `db password`.
2. GitHub → secrets : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROD_PROJECT_REF`,
   `SUPABASE_PROD_DB_PASSWORD` (+ Vercel : `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID`). Simplifier/retirer les secrets `*_STAGING_*`.
3. Vercel → env prod : URL Supabase + publishable key (client) + `service_role`
   (server-only). Le build prod fait tourner la validation `@t3-oss/env-nextjs`.
4. **Baseline** : `supabase migration repair --status applied 20260402193700`
   sur le projet avant le premier `db push` (sinon migrate échoue).
5. `supabase db push` (73 migrations ; prono/poll inclus côté DB, frontend non
   exposé — acceptable).
6. **Runbook** `docs/runbook-prod.md` : retirer la dépendance bloquante aux
   objets SQL prono + les smoke `/pronos*` ; refléter le mono-projet.
7. Merger #65, publier une **GitHub Release** → `deploy-production.yml`.
8. Post-déploiement : smoke `/`, `/post/new`, `/post/[slug]`, `/me` ; vérifier
   que `/pronos`, `/admin/pronos`, `/me/notifications` renvoient 404.
