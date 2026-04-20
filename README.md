# PoliticoResto

Forum politique base sur un frontend Next.js (Catalyst UI) et un backend Supabase (SQL/RLS/RPC).

## Documentation canonique

- Vision metier: `docs/metier.md`
- Architecture technique: `docs/technique.md`
- Contrat Front/Back: `docs/front-back-contract.md`
- Runbook exploitation et production: `docs/runbook-prod.md`
- Strategie de tests: `docs/testing-strategy.md`
- Index documentation complet: `docs/README.md`

## Structure du repository

- `frontend/`: application Next.js 15, UI Catalyst/Tailwind v4, tests unitaires/e2e.
- `supabase/`: migrations SQL, seeds, tests SQL, documentation data.
- `docs/`: documentation transversale produit + technique.
- `Ressources/`: assets de reference (logo, kit Catalyst local).

## Demarrage rapide

### Frontend local

```powershell
cd frontend
npm install
npm run dev
```

Variables minimales (`frontend/.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Environnements

Deux projets Supabase permanents. Vercel injecte automatiquement les bonnes env vars selon le type de déploiement — aucun code conditionnel.

| Environnement      | Supabase                                       | Vercel     | Migrations                                  |
| ------------------ | ---------------------------------------------- | ---------- | ------------------------------------------- |
| Production         | projet prod                                    | Production | manuelles / via release                     |
| Preview / Staging  | `nvwpvckjsvicsyzpzjfi`                         | Preview    | auto (CI `migrate-staging.yml` sur `main`)  |
| Local dev          | `supabase start` (Docker) ou staging           | `vercel dev` | `supabase db reset`                       |

Au boot, `lib/supabase/env.ts` logge le projet actif (`[supabase/env] active project { host, environment }`) — utile pour vérifier dans les logs Vercel qu'un déploiement pointe bien sur la bonne base.

### Configuration initiale (à faire une fois)

1. **Vercel Dashboard → Settings → Environment Variables**
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://nvwpvckjsvicsyzpzjfi.supabase.co` — scope **Preview uniquement**
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = clé publishable staging — scope **Preview uniquement**
   - Vérifier que les vars prod existantes sont scopées **Production uniquement**

2. **Google Cloud Console → OAuth client** : ajouter le callback staging
   `https://nvwpvckjsvicsyzpzjfi.supabase.co/auth/v1/callback`

3. **Supabase Dashboard (staging) → Auth → Providers** : activer Google avec les mêmes `client_id` / `client_secret` que prod ; dans URL Configuration, ajouter les domaines Vercel Preview autorisés.

4. **GitHub repo → Settings → Secrets and variables → Actions** :
   - `SUPABASE_ACCESS_TOKEN` — token d'API Supabase (Account → Access Tokens)
   - `SUPABASE_STAGING_DB_PASSWORD` — password DB du projet staging

### Verification qualite

```powershell
cd frontend
npm run typecheck
npm run test:unit
npm run build
```

## Principes non negociables

- Supabase est la source de verite metier.
- Le frontend ne doit pas dupliquer les regles metier SQL.
- Toute evolution front doit etre alignee avec les migrations backend.
- Aucune erreur SQL brute ne doit etre exposee aux utilisateurs.

## Liens utiles

- Guide frontend detaille: `frontend/README.md`
- Guide backend Supabase: `supabase/docs/README.md`
- Regles agent frontend: `frontend/AGENT.md`
- Regles agent backend: `supabase/AGENT.md`
