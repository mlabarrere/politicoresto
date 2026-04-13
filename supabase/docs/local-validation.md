# Local validation

## Prerequisites
- Supabase CLI installed locally.
- PostgreSQL client tooling available (`psql` or `supabase db` commands).
- A local Supabase stack initialized for this repository.

## Expected repository layout
- `supabase/migrations/00000000000000_init_v1.sql`
- `supabase/tests/*.sql`
- `supabase/seed/minimal_reference_data.sql`

## Recommended flow
1. Start the local Supabase stack.
2. Reset the database so the monolithic migration is replayed from scratch.
3. Apply `supabase/seed/minimal_reference_data.sql` if you want a compact France sample beyond the macro seeds.
4. Run the pgTAP suite in lexical order.

## Example commands
```powershell
supabase start
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed/minimal_reference_data.sql
Get-ChildItem supabase/tests/*.sql | Sort-Object Name | ForEach-Object {
  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f $_.FullName
}
```

## What to validate
- The migration applies on a fresh database without manual edits.
- The auth provisioning trigger creates `app_profile`, `user_visibility_settings`, and `user_private_political_profile`.
- RLS blocks direct reads of sensitive tables from non-owners.
- RPC paths are used for prediction submission, post creation, consent capture, moderation reporting, and topic resolution.
- Territorial rollup views return rows after applying the France sample seed.

## Notes
- Google and Facebook OAuth provider setup remains a Supabase dashboard task.
- The migration seeds only macro territories plus taxonomy primitives. The France-wide exhaustive territorial import should be layered separately.
