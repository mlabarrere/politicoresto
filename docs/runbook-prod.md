# Runbook production

## Perimetre

Ce runbook couvre l'exploitation de PoliticoResto sur Vercel + Supabase.

## Environnements

- Frontend prod: Vercel project `politicoresto` (root `frontend/`).
- Backend prod: Supabase project `<SUPABASE_PROD_PROJECT_REF>`.

## Release checklist

### Avant push

1. `npm run typecheck`
2. `npm run build`
3. valider les changements doc/contrat SQL

### Avant promotion prod

1. appliquer migrations Supabase requises **avant** le déploiement
   frontend — le frontend Pronostics consomme `v_prono_summary`,
   `v_prono_leaderboard`, `v_prono_user_history`, `v_prono_admin_queue`
   et appelle `rpc_request_prono`, `rpc_publish_prono`, `rpc_reject_prono`,
   `rpc_place_bet`, `rpc_remove_bet`, `rpc_resolve_prono`, `rpc_add_option`.
   Vercel passera en erreur si ces objets n'existent pas encore.
2. verifier objets SQL critiques (views + RPC)
3. lancer tests unitaires/e2e critiques

### Apres deploiement

1. verifier statut deployment Vercel = `READY`
2. smoke tests manuels:
   - homepage `/`
   - creation `/post/new`
   - detail `/post/[slug]`
   - profil `/me`
   - liste pronos `/pronos`
   - classement pronos `/pronos/leaderboard`
   - explication mécanique `/pronos/comment-ca-marche`

## Incidents frequents

### 1) Erreur schema cache (`table/function not found`)

Actions:

1. identifier l'objet manquant.
2. verifier si migration existe deja mais non appliquee.
3. appliquer migration de compatibilite.
4. redeployer frontend si un fallback a ete supprime.

### 2) Creation reussie mais detail post indisponible

Actions:

1. verifier que le topic a un post initial.
2. verifier lien slug/id expose dans le feed.
3. corriger atomiquement la chaine create topic + create post.

### 3) Feed partiel ou vide

Actions:

1. verifier `v_feed_global` et/ou alias `v_feed_global_post`.
2. verifier que les policies de lecture autorisent les rows publiques.
3. verifier regressions recentes dans mappings frontend.

## Logs et observabilite

- Logs serveur Next.js: erreurs de server actions et API routes.
- Vercel build logs: erreurs compilation/runtime.
- Supabase advisors: security/performance regressions.

## Rollback

### Frontend

- rollback deployment Vercel vers dernier deployment `READY`.

### Backend

- eviter rollback destructif.
- preferer migration corrective additive (`create or replace`, alias compat).

## Contact points internes

- Owner frontend: equipe UI
- Owner SQL/RLS: equipe data/platform
- Toute correction de contrat front/back doit etre co-validee par les deux.
