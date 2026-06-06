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

- [ ] **Composer** `frontend/components/home/post-composer.tsx` : retirer les
      items `poll` et `prono` du tableau d'onglets (le mode revient à `post`).
- [ ] **Composer page** `frontend/app/post/new/page.tsx` : ne plus passer
      `pronoAction` ; retirer l'import orphelin `requestPronoAction`.
- [ ] **Feed item** `frontend/components/app/app-feed-item.tsx` : retirer le rendu
      `PollPreview` (+ le composant local s'il devient inutilisé).
- [ ] **PostCard** `frontend/components/forum/post-card.tsx` : retirer le bloc
      `PollCardInline` + import.
- [ ] **Détail post** `frontend/app/(public)/post/[slug]/page.tsx` : retirer le
      bloc prono (imports, logique `market`/`userBets`, bannières, `PronoDetail`).
- [ ] **Sidebar** `frontend/components/home/left-sidebar.tsx` : retirer la section
      « Sondages ».
- [ ] **Drawer mobile** `frontend/components/home/mobile-nav-drawer.tsx` : retirer
      le bloc « Sondages ».
- [ ] **Tri feed** `frontend/lib/ui/feed-sort-options.ts` + `post-feed.tsx` :
      retirer l'option/les branches `sondages`/`sondage`.
- [ ] **/me** `frontend/lib/account/sections.ts` + `me/page.tsx` : retirer la
      section « Historique de vote » et le bloc Démographie (libellés
      « redressement des sondages »).
- [ ] **Routes** : neutraliser (hors build prod / `notFound()`) `app/(public)/pronos/**`,
      `app/(authenticated)/me/pronos`, `app/(authenticated)/admin/pronos/**`,
      `app/api/polls/vote`, `app/methodologie`.
- [ ] **Migration feed** : nouvelle migration *forward-only* excluant du feed les
      topics avec attachement poll (évite les « cartes nues »).
- [ ] **E2E** : sortir de `tests/e2e/` les specs `poll-*`, `prono-*`, `pronos-*`,
      `weighted-*`, `weighting-*`, `voting-history`, et le cas poll de
      `post-creation.spec.ts`. **Les déplacer** (pas `.skip` — interdit en commit).

### (2) Finir / réparer le forum

- [ ] Retirer les imports orphelins créés par le rangement (`eslint`/`tsc`).
- [ ] `npm run --prefix frontend verify` vert (prettier + eslint + auth guards +
      typecheck + unit).
- [ ] `npm run --prefix frontend test:integration && test:e2e` verts (Supabase
      local up), sans les specs gelées.
- [ ] Smoke local (`./scripts/dev.sh`) : `/`, `/post/new` (1 onglet), `/post/[slug]`,
      commentaires, votes, `/me` — UI ouverte + logs inspectés.

### (3) Déploiement prod

- [ ] **Baseline** : `supabase migration repair --status applied 20260402193700`
      sur staging puis prod avant le premier `db push` (sinon migrate échoue).
- [ ] **Runbook** `docs/runbook-prod.md` : retirer la dépendance bloquante aux
      objets SQL prono et les smoke tests `/pronos*` ; garder le smoke forum.
- [ ] **Env vars Vercel prod** : url + publishable key (client) + service role
      (server-only) présents (le build prod fait tourner la validation
      `@t3-oss/env-nextjs`).
- [ ] **Migrations prono** : `db push --include-all` les applique (objets SQL
      présents mais frontend non exposé) — acceptable.
- [ ] **Publier une GitHub Release** → déclenche `deploy-production.yml`.
- [ ] Post-déploiement : Vercel `READY`, smoke `/`, `/post/new`, `/post/[slug]`,
      `/me` ; vérifier que `/pronos`, `/admin/pronos` renvoient 404.
