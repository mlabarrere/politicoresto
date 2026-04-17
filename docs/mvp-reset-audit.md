# MVP Reset Audit Snapshot (historique)

Statut: document historique.
Date d'origine: 2026-04-14.

Reference canonique actuelle:

- `docs/metier.md`
- `docs/technique.md`
- `docs/front-back-contract.md`

## Snapshot historique

Date: 2026-04-14
Project: PoliticoResto
Mode: Controlled reset to forum MVP

## Route Contracts (Frontend Runtime)
- Keep: `/`, `/category/[slug]`, `/thread/[slug]`, `/auth/login`, `/auth/callback`, `/me`, optional `/me/settings`
- Delete from runtime: `/threads`, `/leaderboard`, `/profile/[username]`, `/me/reputation`

## DB Contracts Used By Frontend
- `create_thread`
- `create_post`
- `create_comment`
- `rpc_update_thread_post`
- `rpc_delete_thread_post`
- `rpc_update_comment`
- `rpc_delete_comment`
- Read models: `v_feed_global`, `v_thread_detail`, `v_thread_posts`, `v_post_comments`, `v_public_profiles`

## KEEP
- Auth wiring: middleware + server/browser clients + Google OAuth callback flow
- Thread/comment write path and ownership RPCs
- Feed and thread page core rendering
- Minimal profile private area (`/me`, `/me/settings`)

## SIMPLIFY
- Home and thread loaders (drop leaderboard/poll/prediction drift)
- Navigation and copy (forum language only)
- Profile pages (remove reputation/vault-heavy positioning)
- Unit/e2e tests aligned to MVP route set

## DELETE
- Routes: `/threads`, `/leaderboard`, `/profile/[username]`, `/me/reputation`
- Components: leaderboard/profile/poll UI not required for MVP
- Actions/tests tied to poll-only UI path

## UNCERTAIN
- Destructive DB object removals inside historical migrations are deferred
- Strategy used: add forward cleanup migration (revoke/deprecate non-MVP execute grants), avoid risky auth/RLS/core-refresh edits
