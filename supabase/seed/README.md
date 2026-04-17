# Supabase Seed Notes

Statut: actif.

## Fichiers de seed principaux

- `forum_minimal_seed.sql`: jeu minimal pour valider les parcours forum.
- `polls_demo.sql`: exemples de sondages demo.

## Regles

- donnees entierement synthetiques,
- aucun claim de sondage reel,
- un seed ne doit pas contourner les invariants metier/RLS.

## Usage rapide

```powershell
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed/forum_minimal_seed.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed/polls_demo.sql
```
