# Documentation PoliticoResto

Documentation canonique du projet (à maintenir en priorité).

- `metier.md` — cadrage produit, parcours utilisateurs, règles métier visibles.
- `technique.md` — architecture applicative, responsabilités par couche, patterns de code.
- `front-back-contract.md` — contrat SQL consommé par le frontend et garde-fous de dérive.
- `runbook-prod.md` — exploitation, diagnostics, incidents et checklists release.
- `testing-strategy.md` — pyramide de tests, parcours critiques, standards de non-régression.
- `STAGING_SETUP.md` — procédure one-shot de setup des environnements (Vercel, Supabase, GitHub).

## Règles et conventions

- `../CLAUDE.md` — règles projet canoniques (auth, logging, SQL, Next.js 16, CI).
- `../.claude/skills/` — skills Claude Code chargés à la demande :
  - `local-dev` — boot, reset, seed de la stack locale
  - `logging` — conventions Pino, event taxonomy
  - `authentication` — `@supabase/ssr` + 4 factories + `getClaims()`
  - `supabase-migration` — workflow migration + RLS + SQL style
  - `nextjs-component` — Server/Client Components, Route Handlers, Actions

## Setup frontend

- `../frontend/README.md` — setup local, env vars, verify gate.
