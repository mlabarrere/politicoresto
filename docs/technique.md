# Documentation technique

## Vue d'ensemble

PoliticoResto est compose de deux couches:

- Frontend Next.js (`frontend/`): rendu SSR/Client, UI Catalyst via wrappers `App*`.
- Backend Supabase (`supabase/`): schema SQL, RLS, vues de lecture, RPC d'ecriture.

## Architecture frontend

### Stack

- Next.js 15 App Router
- React 19
- Tailwind CSS v4
- Catalyst UI kit (local) + wrappers applicatifs
- Vitest + Playwright

### Organisation

- `app/`: routes App Router.
- `components/app/`: primitives UI partagees obligatoires (`AppButton`, `AppCard`, etc.).
- `components/catalyst/`: primitives Catalyst encapsulees.
- `lib/data/public` et `lib/data/authenticated`: lectures centralisees.
- `lib/actions`: server actions de mutation.

### Principes de code

- Server Components par defaut.
- Aucune logique metier critique dans React.
- Pas d'import direct `components/catalyst/*` hors wrappers `components/app/*`.
- Contrat de donnees centralise dans `lib/data/*`.

## Architecture backend (Supabase)

### Socle

- Migrations SQL versionnees (`supabase/migrations`).
- RLS active sur les tables publiques sensibles.
- RPC pour les mutations complexes.
- Vues de lecture pour le frontend thin client.

### Objets runtime majeurs

- Vues: `v_feed_global`, `v_thread_detail`, `v_thread_posts`, `v_post_comments`, `v_post_poll_summary`.
- Bridge compat (si requis): `v_feed_global_post`, `v_post_detail`, `v_posts`.
- RPC: `create_thread`, `create_post`, `create_comment`, `react_post`, `create_post_poll`, `submit_post_poll_vote`.

## Contrat front/back

Le contrat de donnees utilise en production est documente dans `docs/front-back-contract.md`.

Regle de release: toute evolution frontend qui ajoute/renomme une vue ou RPC doit etre livree avec migration SQL associee et verification environment cible.

## Deploiement

### Frontend

- Vercel project root: `frontend/`
- Build command: `npm run build`
- Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Supabase

- Projet cible: `<SUPABASE_PROD_PROJECT_REF>` (PoliticoResto)
- Migration appliquee uniquement via migrations versionnees ou pipeline outille.

## Observabilite et diagnostic

- Logs serveur Next.js pour actions/routes API.
- Diagnostics Supabase via `get_advisors` (security/performance).
- En cas de drift schema cache: corriger la migration/source de contrat, pas masquer durablement au frontend.
