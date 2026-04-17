# Frontend PoliticoResto

Application Next.js 15 de PoliticoResto.

## Objectif

Le frontend est un thin client:

- compose les ecrans et orchestre la navigation,
- consomme les vues/RPC Supabase,
- n'implemente pas les regles metier critiques.

## Stack

- Next.js App Router
- React 19
- Tailwind CSS v4
- Catalyst UI + wrappers `components/app/*`
- Supabase SSR client
- Vitest + Playwright

## Prerequis

- Node.js 20+
- npm 10+
- environnement Supabase configure

## Installation

```powershell
cd frontend
npm install
```

## Variables d'environnement

Fichier `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Ne jamais exposer de `service_role` dans le frontend.

## Commandes utiles

```powershell
npm run dev
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
```

## Organisation des dossiers

- `app/`: routes Next.js.
- `components/app/`: surface UI partagee obligatoire.
- `components/catalyst/`: primitives encapsulees.
- `lib/data/public`: lectures publiques.
- `lib/data/authenticated`: lectures session.
- `lib/actions`: mutations serveur.
- `tests/`: unitaires + e2e.

## Regles frontend

- Pas d'import direct `components/catalyst/*` hors wrappers.
- Pas de recreation de primitives UI existantes.
- Toute query/RPC passe par les modules `lib/data/*` ou `lib/actions/*`.
- Toute evolution front doit etre alignee avec le contrat SQL.

Voir `frontend/AGENT.md` pour les regles detaillees.

## Documentation frontend

- Index: `frontend/docs/README.md`
- Audit CTA global: `frontend/docs/create-cta-audit.md`
- Audit UI Catalyst: `frontend/docs/ui-audit-catalyst.md`
- Spec UI phase 1 (historique de conception): `frontend/docs/ui-spec-phase-1.md`

## Deploiement Vercel

- Project root directory: `frontend/`
- Framework preset: Next.js
- Variables configurees sur le projet Vercel
