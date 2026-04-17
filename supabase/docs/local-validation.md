# Local validation

## Prerequisites

- Supabase CLI installee.
- Outils PostgreSQL disponibles (`psql` ou `supabase db`).
- Stack Supabase locale initialisee pour ce repository.

## Structure attendue

- `supabase/migrations/*.sql`
- `supabase/tests/*.sql`
- `supabase/seed/*.sql`

## Flow recommande

1. demarrer la stack locale
2. reset base pour rejouer les migrations
3. charger un seed si necessaire
4. executer les tests SQL

## Commandes exemple

```powershell
supabase start
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed/forum_minimal_seed.sql
Get-ChildItem supabase/tests/*.sql | Sort-Object Name | ForEach-Object {
  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f $_.FullName
}
```

## Verifications minimales

- migrations rejouables from scratch sans patch manuel,
- objets SQL critiques presents (`v_feed_global`, `v_thread_detail`, `v_thread_posts`, `v_post_comments`),
- si compat active: alias `v_feed_global_post`, `v_post_detail`, `v_posts`, wrappers `create_post_*`,
- RLS bloque les lectures non autorisees,
- parcours ecriture critiques via RPC (create, react, comments, polls).

## Notes

- les providers OAuth se configurent dans le dashboard Supabase, pas en SQL,
- les migrations de compatibilite doivent rester additives et tracees.
