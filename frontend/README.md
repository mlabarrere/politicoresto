# Frontend politicoresto

## Objectif

Ce dossier contient le socle frontend déployable sur Vercel pour `politicoresto.com`.
Le frontend est volontairement mince:
- rendu SSR par défaut
- consommation des vues publiques et authentifiées Supabase
- consommation des RPC Supabase pour les mutations
- aucune logique métier critique recodée côté React

## Prérequis

- Node.js 20+
- npm 10+ ou équivalent
- un projet Supabase configuré
- Google configuré côté Supabase Auth si vous testez l’OAuth

## Installation

Depuis la racine du repo:

```powershell
cd frontend
npm install
```

## Variables d’environnement

Créer un fichier `.env.local` dans `frontend/` à partir de `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Ne jamais ajouter de `service_role` key dans ce projet frontend.

## Lancement local

```powershell
cd frontend
npm run dev
```

## Build local

```powershell
cd frontend
npm run typecheck
npm run build
```

## Branchement à Supabase

- Le navigateur utilise `@supabase/ssr` + `@supabase/supabase-js`.
- Le serveur Next.js utilise un client Supabase SSR basé sur cookies.
- Les lectures publiques consomment en priorité les vues publiques.
- Les lectures authentifiées consomment les vues authentifiées.
- Les mutations doivent passer par les RPC Supabase ou les primitives Auth officielles.

## Déploiement Vercel

Réglages manuels attendus:

- `Vercel Project Root Directory = frontend/`
- `Framework Preset = Next.js`
- définir les variables d’environnement du projet:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Après tout changement de variable d’environnement, un redéploiement est nécessaire.

## Supabase Auth

Configurer dans le dashboard Supabase:

- provider Google
- les redirect URLs correspondant aux URLs Vercel preview et production

## Répartition des responsabilités

### Relève du frontend
- composition des pages
- rendu SSR/Client
- navigation
- appels vers vues, tables publiques autorisées, RPC et auth Supabase
- robustesse UX en cas d’absence de données

### Relève de Supabase
- sécurité réelle
- RLS
- scoring
- modération
- règles métier
- agrégations
- workflows métier

## Monorepo

Le repo racine contient au moins:

- `supabase/`
- `frontend/`

Vercel ne doit pas cibler la racine du repo pour ce projet. Il doit cibler `frontend/`.

## Documentation UI

La spécification UI exécutable de la phase 1 est disponible dans:

- `docs/ui-spec-phase-1.md`
