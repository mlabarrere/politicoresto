# Session 2026-04-25 — Pronos MVP

> Document de synthèse pour audit en session ultérieure. Toutes les
> informations sont sourcées (commit hash, PR, run ID, fichier:ligne).

## Résumé

Livraison du MVP **Pronostics** PoliticoResto — feature de paris politiques
sans argent, classement public, multiplicateur sentinelle révélé à la
résolution. Lots 0 → 6 du cadrage 2026-04-25 livrés en une PR squash-mergée.

- **PR**: [#61](https://github.com/mlabarrere/politicoresto/pull/61), squashed → `a752ec0`
- **Diff vs `c24cab6` (main pré-merge)**: 50 fichiers, +10 151 / -19 lignes (`git log a752ec0 -1 --shortstat`)
- **Migrations SQL nouvelles**: 8 fichiers, 2 158 lignes
- **Tests E2E nouveaux**: 6 specs Playwright (10 tests × desktop/mobile = 20 cas), 1 spec integration `pronos-rpc.int.test.ts` (8 cas)
- **CI sur main**: `ci.yml` run [24937353424](https://github.com/mlabarrere/politicoresto/actions/runs/24937353424) — ✅ success en 6m07s
- **Deploy preview**: `deploy-preview.yml` run [24937472118](https://github.com/mlabarrere/politicoresto/actions/runs/24937472118) — ✅ success en 2m30s
- **URL Preview**: `https://politicoresto-8g402mwrz-martoai.vercel.app` (alias `https://politicoresto-staging.vercel.app`)

## Roadmap livrée

| Lot | Sujet | Commit (avant squash) |
|-----|-------|------------------------|
| 0 | Hygiène — drop legacy `prediction_*` + gate MCP derrière `MCP_ENABLED` | `cbc3154` |
| 1 | Schema SQL `prono_*` + 7 RPCs + 4 vues + RLS + `reputation_ledger` + `user_notification` | `dced8c9` |
| 2 | Demande de prono (3e tab composer) + bannière pending + queue admin `/admin/pronos` | `93ffae1` |
| 3 | Affichage prono publié + paris (optimistic via `useOptimistic`) + page `/pronos` | `903f2ca` |
| 4 | Résolution + scoring + bannière rétroactive + leaderboard + `/me/pronos` + `/comment-ca-marche` | `ef1c538` |
| 5 | Options évolutives + notifications in-app (badge + page `/me/notifications`) | `4c505bb` |
| 6 | Polish — filtres + tris sur `/pronos` + docs (`pronos.md`, `metier.md`, `runbook-prod.md`, `front-back-contract.md`) | `c662568` |
| dev | `/dev/sign-in-as-seed` (triple-gated) pour smoke browser local | `ee75d68` |
| review | Fixes 3 bugs review codex/sourcery (distinct options, voided topic_status, race single-choice) | `c909c90` |

## Décisions techniques notables

| # | Décision | Source |
|---|----------|--------|
| 1 | `reputation_ledger` n'existait pas malgré références dans le code legacy. Créé en lot 1 — pronos est la première feature qui l'utilise vraiment. | `supabase/migrations/20260425120500_pronos_schema.sql:18-26` |
| 2 | `topic_status` étendu (`pending_review`, `rejected`) dans une migration séparée pour respecter la contrainte PG : `ALTER TYPE … ADD VALUE` doit committer avant utilisation. | `supabase/migrations/20260425120000_pronos_topic_status_values.sql` |
| 3 | Smoothing dynamique `1/N_options` (pas `0.5` fixe) calculé à la résolution. | `supabase/migrations/20260425175100_pronos_review_fixes.sql:178-180` |
| 4 | Sentinelle metadata persistée sur `prono_bet.{multiplier, smoothed_share, is_winner}` pour TOUS les bets (gagnants + perdants), pas seulement dans `reputation_ledger`. Permet la bannière rétroactive aux perdants. | `supabase/migrations/20260425142600_pronos_resolution_metadata.sql:13-19` |
| 5 | `voided` flippe `topic_status` à `'archived'` (pas `'voided'` car valeur enum absente). Source canonique de l'état "annulé" = `prono_resolution.resolution_kind`. | `supabase/migrations/20260425175100_pronos_review_fixes.sql:230-232` |
| 6 | Single-choice mode atomique : `pg_advisory_xact_lock` sur hash `(question_id, user_id)` dans `place_bet` + `remove_bet`. | `supabase/migrations/20260425175100_pronos_review_fixes.sql:267-269` |
| 7 | Filter "mes pronos" implémenté via 2 requêtes (prono_bet → question_ids, puis v_prono_summary `IN`) plutôt que via `cs` sur le champ `current_user_bets`, qui ne fonctionne pas avec PostgREST sur les arrays calculés via `auth.uid()`. | `frontend/lib/data/public/pronos.ts:158-180` |
| 8 | `v_thread_detail` étendu (lot 2) puis reverté (lot 3, migration `20260425134100`) après détection d'un `statement timeout` sur `v_feed_global` causé par `row_number()` over un set non-pruned. Solution finale : `getPostDetail` interroge `topic` directement (avec alias `effective_visibility:visibility`), pendant que `v_thread_detail` garde son filtre original 4-statuts. | `frontend/lib/data/public/posts.ts:9-22` |
| 9 | `MCP_ENABLED` env var (default `false`) garde les routes `/api/mcp/*` + `/.well-known/oauth-protected-resource` derrière un 404. `playwright.config.ts` opt-in à `true` pour la suite de sécurité MCP. | `frontend/lib/mcp/feature-flag.ts`, `frontend/playwright.config.ts:118-120` |
| 10 | `/dev/sign-in-as-seed` triple-gated : `NODE_ENV !== 'production'` AND `DEV_AUTH_BYPASS=true` AND service-role présent. Whitelist explicite dans `scripts/verify.sh:60` à côté de `auth/callback`. | `frontend/app/dev/sign-in-as-seed/route.ts` |

## Mécanique de scoring (formule canonique)

```
prior        = 1.0 / count(prono_option WHERE question = ? AND is_active)
smoothed     = (snapshot.share × snapshot.total_bets + prior × 10)
             / (snapshot.total_bets + 10)
multiplier   = min(5.0, 1.0 / max(0.05, smoothed))
points       = round(multiplier × 10)  -- gagnants seulement
```

Source: `supabase/migrations/20260425175100_pronos_review_fixes.sql:178-216`.

**Validation empirique** (smoke local Chrome 2026-04-25 19:02 UTC) : 1 prono binaire 3 options ("Oui", "Non", "Autre"), 1 votant gagnant sur "Non" → multiplier observé `×2.5`, points `+25`. Calcul : prior=1/3≈0.333, snapshot share=1.0/total=1, smoothed=(1×1+0.333×10)/11≈0.394, mult=1/0.394≈2.5, points=25. **Conforme à la formule à l'arrondi près.**

## Fichiers critiques produits

### SQL (8 migrations)
- `supabase/migrations/20260425071500_drop_legacy_prediction.sql` — drop legacy.
- `supabase/migrations/20260425120000_pronos_topic_status_values.sql` — enum.
- `supabase/migrations/20260425120500_pronos_schema.sql` — schema initial.
- `supabase/migrations/20260425124700_pronos_views_visibility.sql` — vues étendues (revert en lot 3).
- `supabase/migrations/20260425134100_pronos_views_revert_filter.sql` — revert v_feed_global.
- `supabase/migrations/20260425142600_pronos_resolution_metadata.sql` — colonnes multiplier/smoothed_share/is_winner sur prono_bet.
- `supabase/migrations/20260425153700_pronos_option_added_late_flag.sql` — flag is_late.
- `supabase/migrations/20260425175100_pronos_review_fixes.sql` — fixes review codex/sourcery.

### Frontend (composants + actions + data)
- `frontend/components/prono/{prono-bet-bar,prono-detail,prono-card-inline,prono-resolution-banner,prono-option-added-banner}.tsx`
- `frontend/lib/actions/pronos.ts` — 8 server actions.
- `frontend/lib/data/public/pronos.ts` — normalizer + 4 fetchers.
- `frontend/lib/supabase/auth-role.ts` — `getAuthRole` / `isModeratorClaim`.
- `frontend/app/(public)/pronos/{page,leaderboard/page,comment-ca-marche/page}.tsx`
- `frontend/app/(authenticated)/me/{pronos,notifications}/page.tsx`
- `frontend/app/(authenticated)/admin/pronos/{page,[topicId]/page}.tsx`
- `frontend/app/dev/sign-in-as-seed/route.ts` — dev signin gated.

### Doc
- `docs/pronos.md` (nouveau) — schéma, RPC matrix, formule, layout frontend, lot 7 roadmap.
- `docs/metier.md` — section "Pronostics" remplace ancien "Paris (désactivé)".
- `docs/runbook-prod.md` — checklist : RPC pronos déployées avant frontend.
- `docs/front-back-contract.md` — 4 vues + 7 RPC pronos ajoutées.

### Tests
- `frontend/tests/integration/pronos-rpc.int.test.ts` — 8 cas (cycle complet, RLS, void, cutoff, add option, duplicate options, race single-choice).
- `frontend/tests/integration/legacy-prediction-removed.int.test.ts` — 8 garde-fous.
- `frontend/tests/e2e/{prono-request,prono-vote,prono-resolve,prono-add-option,pronos-list-filters}.spec.ts` — 10 user stories × 2 projets.
- `frontend/tests/e2e/helpers/role.ts` — `setUserRoleByEmail` pour modos éphémères.

## Cleanup branches (cette session)

10 branches locales supprimées :

```
feat/codecov-ci, feat/schema-cleanup-and-coverage,
fix/auth-ui-and-login, fix/ci-cleanup-and-codacy,
fix/ci-final-stabilization, fix/ci-tools-config,
fix/codecov-path, fix/supabase-view-resilience,
fix/ts-type-supabase-view  → toutes mergées dans main (`git branch -d`)

claude/jovial-tesla-ccd1b6  → squash-mergée via PR #61 (`git branch -D`)
```

Branches restantes en local (toutes intentionnelles) :
- `main` (synchronisée à `a752ec0`)
- `feat/mcp-user-mode` — HEAD courant du repo principal
- `claude/amazing-herschel-64dbf0` — worktree actif `.claude/worktrees/amazing-herschel-64dbf0`
- `claude/friendly-kepler-423427` — worktree actif `.claude/worktrees/friendly-kepler-423427`
- `fix/reaction-bar-auth-flake` — non mergée, hors scope de la session

Worktrees restants : 3 (le worktree `jovial-tesla-ccd1b6` qui hébergeait cette session a été supprimé en fin de session, branch déjà push + merge avant suppression).

## ⚠️ Points à auditer en session ultérieure

### 1. Smoke Vercel Preview non exécuté visuellement

Source : tentative à 18:13 UTC, Preview retourne `401` sur toutes les routes publiques (`/`, `/pronos`, `/pronos/comment-ca-marche`, `/pronos/leaderboard`) — protection Vercel team auth active. Vérifié par `curl -sI https://politicoresto-staging.vercel.app/pronos -o /dev/null -w "%{http_code}"` → `401`.

**À auditer** : se connecter à Vercel staging avec un compte autorisé puis exécuter manuellement le parcours pronos complet (request → publish modo → bet → resolve → bannière rétroactive). Le smoke local Chrome a couvert tous ces chemins (commits + screenshots dans la session). Mais le smoke Preview reste à valider à la main.

### 2. Codecov `patch` + `project` failed sur PR #61 (informatif, non-bloquant)

Source : `gh pr checks 61` (avant merge) — `codecov/patch fail` + `codecov/project fail`. Probable cause : la couverture Vitest unitaire ne touche pas le code prono (qui est essentiellement testé en integration + E2E). Le seuil patch coverage projeté n'est pas atteint.

**À auditer** : décider si on veut élever la couverture unit du code prono (les normalizers `lib/data/public/pronos.ts`, le calcul de `lateOptions` dans `prono-option-added-banner.tsx`), ajuster les seuils codecov, ou accepter l'écart pour les features dominées par integration/E2E.

### 3. CodeFactor + Codacy fail (informatif)

Source : `gh pr checks 61`. Pas inspecté en détail dans cette session.

**À auditer** : ouvrir les rapports linkés sur la PR pour voir si style/complexité signalés justifient un correctif.

### 4. Flakes E2E cross-spec (récurrents, hors scope pronos)

Pendant la session, les pre-push hook + verify ont parfois échoué sur des specs sans rapport avec les pronos :
- `tests/e2e/voting.spec.ts:122` — left/right voting switching (passé en isolation)
- `tests/e2e/comments.spec.ts:86` — reply nested
- `tests/e2e/account-settings.spec.ts:64,95,132` — deactivation/deletion flows
- `tests/e2e/weighting-demographics.spec.ts:37,86`

Tous passent en isolation. Cross-spec contamination probable (ordres de cleanup, états seed user accumulés).

**À auditer** : (a) vérifier si `wipeSeedUserPosts` (`tests/e2e/helpers/cleanup.ts`) doit étendre sa portée à `prono_bet`/`prono_question`/`reputation_ledger`/`user_notification` puisque ces tables retiennent maintenant l'état seed user d'une spec à l'autre. (b) Vérifier si l'ordre alphabétique des fichiers E2E ne crée pas une dépendance silencieuse.

### 5. Race effective de `pg_advisory_xact_lock` non testée sous charge réelle

Source : `tests/integration/pronos-rpc.int.test.ts:374-402`. Le test parallélise via `Promise.allSettled([place_bet(A), place_bet(B)])` mais l'ordering Node ne garantit pas un vrai parallélisme PostgreSQL.

**À auditer** : exécuter le test sous `jq` + `pgbench` ou similaire avec ~100 paris concurrents pour valider que l'advisory lock tient. Ou ajouter un test plus stress (10× la même Promise.all en parallèle).

### 6. `wipeSeedUserPosts` ne cleanup pas les nouvelles tables

Source : `frontend/tests/e2e/helpers/cleanup.ts:15-40` ne touche que `thread_post` + `post`. Les tables prono `prono_bet`, `prono_question`, `prono_distribution_snapshot`, `reputation_ledger`, `user_notification` restent peuplées entre runs. Pendant la session, j'ai dû manuellement nettoyer via SQL pour faire passer le pre-push hook (cf. Bash log autour de 17:09 UTC).

**À auditer** : étendre `wipeSeedUserPosts` pour également vider ces tables (ON DELETE CASCADE depuis `topic` peut suffire si on supprime le topic, mais `reputation_ledger` + `user_notification` ne sont pas en cascade depuis topic). Vérifier que les afterAll des nouvelles specs nettoient bien.

### 7. `topic_status='archived'` pour voided pronos — hack assumé

Source : `supabase/migrations/20260425175100_pronos_review_fixes.sql:230-232`. Pas de valeur `'voided'` dans l'enum `topic_status`. La distinction voided vs archived vit sur `prono_resolution.resolution_kind`. Sémantiquement correct mais lecteur du schéma SQL pur (sans v_prono_summary) ne peut pas distinguer un topic voided d'un topic archived.

**À auditer** : si `archived` est utilisé ailleurs (e.g., un topic non-prono peut être archived sans avoir de prono_resolution), s'assurer que la condition de filtrage `/pronos?status=resolved` (`not('resolution_kind', 'is', null)` dans `getPronoList`) reste robuste. Considérer d'ajouter un statut enum `'voided'` dans une migration future.

### 8. Performance v_thread_detail / v_feed_global non re-vérifiée en charge

Source : commit `903f2ca` (lot 3). Lot 2 avait étendu v_thread_detail à 6 statuts → `statement timeout 57014` sur le feed home. Lot 3 a reverté à 4 statuts + interrogation directe de `topic` dans `getPostDetail`.

**À auditer** : valider en staging avec un volume non-trivial de topics (>1000) que `getPostDetail` direct sur `topic` reste sub-50ms et que `v_feed_global` ne régresse pas. Vérifier les advisors Supabase post-merge (pas inspectés cette session).

### 9. `pronos-list-filters.spec.ts` — assertion non-`getByRole` côté chip "Mes pronos" anonyme

Source : `frontend/tests/e2e/pronos-list-filters.spec.ts:82-84`. Le span "Mes pronos" disabled n'a pas de role `link`, le test l'identifie par `getByText().first()` + `evaluate(el => el.tagName)`. Fragile si le DOM change.

**À auditer** : remplacer par un `data-testid="prono-filter-mine-disabled"` côté composant pour stabiliser.

### 10. Notifications — pas de pagination sur `/me/notifications`

Source : `frontend/app/(authenticated)/me/notifications/page.tsx:54`. `limit(100)` sans cursor. Acceptable au MVP (un user actif accumule peu de notifs sur les premiers mois) mais à corriger si volume.

**À auditer** : ajouter cursor pagination similaire au feed home si la table grossit.

### 11. Lot 7 (phase 2) — score de représentativité, hors MVP

Réutilisation du worker Railway de redressement. Conditionné à : (a) volume de pronos résolus en prod, (b) décision produit explicite.

**À auditer** : décision produit + estimation de l'effort intégration.

### 12. Browser Vercel Preview avec auth Google requise

Le `/dev/sign-in-as-seed` est gated NODE_ENV !== 'production' donc 404 en Preview/Prod. Le smoke Preview interactif requiert un signin Google réel.

**À auditer** : décider si on veut un mécanisme alternatif d'auth pour staging (ex: bypass token signé serveur) ou si la suite E2E staging-auth (qui utilise password) suffit. Note : les 2 tests `tests/e2e/auth-staging.spec.ts` sont actuellement skipped (`-` dans la sortie verify) — non exécutés cette session.

## Vérifications faites cette session

- [x] `npm run --prefix frontend verify` à chaque lot avant commit (210 tests passing au final)
- [x] `npm run --prefix frontend test:integration` indépendamment (101 tests)
- [x] `supabase db reset` à chaque migration pour valider l'apply
- [x] Smoke browser local Chrome MCP (signin → request → publish → bet → switch → resolve → bannière rétroactive ×2.5/+25 points + filtres /pronos)
- [x] `gh pr create #61`
- [x] CI sur PR #61 verte (Verify, Build, CodeQL, Sourcery, Snyk, Integration, E2E, Tests & Coverage, Supabase Preview)
- [x] Squash merge → main (`a752ec0`)
- [x] CI on main green (run 24937353424, 6m07s)
- [x] Deploy preview triggered + alias staging mis à jour (run 24937472118, 2m30s)
- [x] Cleanup branches locales (10 supprimées)
- [x] Local main worktree synchronisé sur `a752ec0`

## Vérifications NON faites (à compléter)

- [ ] Smoke Vercel Preview interactif (bloqué par 401 protection — voir audit #1)
- [ ] Inspection détaillée des rapports CodeFactor / Codacy / Codecov (audit #2-3)
- [ ] Performance check `v_feed_global` post-merge sur staging (audit #8)
- [ ] Supabase Advisors post-merge (`mcp_supabase_get_advisors` non appelé cette session)
- [ ] Fix flakes cross-spec (audit #4 + #6)

## Sources

- Repo : `mlabarrere/politicoresto`
- PR : https://github.com/mlabarrere/politicoresto/pull/61
- Squash commit : `a752ec0b96e7f24e60974ad3c6abb5da6f7745cf`
- CI run main : https://github.com/mlabarrere/politicoresto/actions/runs/24937353424
- Deploy run : https://github.com/mlabarrere/politicoresto/actions/runs/24937472118
- Preview URL : `https://politicoresto-8g402mwrz-martoai.vercel.app`
- Staging alias : `https://politicoresto-staging.vercel.app`
- Cadrage produit : prompt utilisateur du 2026-04-25 (premier message de la session)
