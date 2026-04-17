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
