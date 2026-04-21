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

## Local development

Target: clean clone → running app in under 10 minutes.

### Prerequisites

- Docker Desktop running
- Node.js ≥ 20.19 (CI uses 20 LTS; local 25.x is fine — watch drift)
- CLIs: `supabase` (2.x), `vercel`, `gh`

### First-time setup

```bash
# 1. Install deps
cd frontend && npm install && cd ..

# 2. Copy env template and fill in the anon key after `supabase start`
cp frontend/.env.local.example frontend/.env.local

# 3. Boot the local stack (Postgres + Auth + Storage + Inbucket + Studio)
supabase start
# → copy the printed "anon key" into NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
#   in frontend/.env.local

# 4. Apply migrations + seed (creates test@example.com / password123)
supabase db reset

# 5. Run the app
./scripts/dev.sh        # or: npm run --prefix frontend dev:full
```

After that, daily boot is just `./scripts/dev.sh` (idempotent; add `--reset` to
re-apply migrations + seed).

### Local service URLs

| Service   | URL                       | Purpose                                  |
| --------- | ------------------------- | ---------------------------------------- |
| App       | http://localhost:3000     | `vercel dev`                             |
| API       | http://127.0.0.1:54321    | PostgREST + GoTrue + Realtime + Storage  |
| Studio    | http://127.0.0.1:54323    | Supabase admin UI                        |
| Inbucket  | http://127.0.0.1:54324    | Captures all outbound auth emails locally |
| Postgres  | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Direct `psql` |

### Seed test user

Available immediately after `supabase db reset`:

- Email: `test@example.com`
- Password: `password123`

Email confirmation is disabled locally (`supabase/config.toml` → `[auth.email]`),
so the user signs in without any Inbucket click-through. Any additional
signups you perform locally also bypass confirmation.

### Reading logs locally

Once Phase 3 (`lib/logger.ts`) lands, `LOG_PRETTY=true` in `.env.local` streams
human-readable logs to the `vercel dev` terminal via `pino-pretty`. Until then,
`console.*` calls surface raw in the same terminal.

### Pre-push verification

```bash
npm run --prefix frontend verify     # typecheck + unit tests
```

A tracked pre-push Git hook runs the same pipeline automatically. **Activate
it once per clone:**

```bash
git config core.hooksPath .githooks
```

Session 3 will extend `verify` with lint, format, knip, and a matching CI job.
Do not push without a green `verify`.

### Schema baseline

The full schema lives in `supabase/migrations/20260402193700_remote_baseline.sql`
(pulled from staging on 2026-04-21). Subsequent migrations are incremental
on top of that baseline. `supabase db reset` from a clean clone produces
a fully working local DB with 27 public tables + all RLS + all RPCs.

**Important for CI / remote push:** the baseline migration reflects schema
that already exists on staging/prod. Before the next `supabase db push` to
those environments, run:

```bash
supabase migration repair --status applied 20260402193700
```

…on staging and prod, so the CLI does not try to re-apply it.

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

- Frontend: `frontend/README.md`
- Règles projet (humains + agents): `CLAUDE.md`
- Skills Claude Code: `.claude/skills/` (local-dev, logging, authentication, supabase-migration, nextjs-component)
- Docs canoniques: `docs/metier.md`, `docs/technique.md`, `docs/front-back-contract.md`, `docs/runbook-prod.md`, `docs/testing-strategy.md`
