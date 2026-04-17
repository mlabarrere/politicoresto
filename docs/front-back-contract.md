# Contrat Front/Back (Supabase)

## Objectif

Definir la source de verite des objets SQL consommes par le frontend et eviter toute derive de schema en production.

## Regles de gouvernance

- Le frontend ne reference que des objets presents dans les migrations du repo.
- Toute rupture de nommage (`post_*` vs `thread_*`) doit etre traitee par migration de compatibilite ou migration complete frontend/backend dans la meme release.
- Aucun message SQL brut ne doit atteindre l'interface utilisateur.

## Contrat lecture (public)

- Feed: `v_feed_global` (ou alias compat `v_feed_global_post`).
- Detail sujet: `v_thread_detail` (ou alias compat `v_post_detail`).
- Posts du sujet: `v_thread_posts` (ou alias compat `v_posts`).
- Commentaires: `v_post_comments`.
- Sondages: `v_post_poll_summary`.

## Contrat ecriture (auth)

- Creation sujet: `create_thread` (alias compat possible: `create_post_topic`).
- Creation post initial: `create_post` (alias compat possible: `create_post_item`).
- Creation commentaire: `create_comment` (alias compat possible: `create_post_comment`).
- Reaction: `react_post` avec `reaction_target_type` conforme (`thread_post|comment`).
- Sondage: `create_post_poll`, `submit_post_poll_vote`, `rpc_update_thread_post`.

## Invariants critiques

- Un topic publiable doit avoir un post initial.
- Un item visible dans le feed doit ouvrir une page detail resolvable.
- Les droits de lecture/ecriture sont imposes par RLS/RPC, jamais par le frontend seul.

## Checklist pre-merge

1. Lister les `.from(...)` / `.rpc(...)` impactes.
2. Verifier existence des objets SQL sur l'environnement cible.
3. Valider signature des RPC (arguments et type de retour).
4. Ajouter/mettre a jour tests unitaires + e2e des parcours critiques.

## Checklist pre-prod

1. `npm run typecheck`
2. `npm run test:unit`
3. E2E creation -> feed -> detail
4. Verification manuelle des pages: `/`, `/post/new`, `/post/[slug]`, `/me`
5. Audit Supabase advisors (security/performance)

## Incident class: schema drift

Symptomes typiques:

- `Could not find the table/function ... in the schema cache`
- objet visible en feed mais detail indisponible
- mutation reussie partiellement (topic sans post initial)

Reponse attendue:

- corriger le contrat SQL via migration versionnee
- aligner frontend dans la meme livraison
- backfill/cleanup des donnees incoherentes si necessaire
