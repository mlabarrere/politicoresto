# Audit de performance — 2026-04-20

Écrit après l'épisode « la grille de vote est leeeente ». L'objectif est
factuel : mesurer et identifier les bottlenecks réels avant de conclure
quoi que ce soit sur la stack.

## TL;DR

- **Supabase n'est PAS le coupable.** Les requêtes SQL s'exécutent en
  0.5–5 ms (mesures locales, voir § 2).
- **Le coupable, c'est le réseau.** Chaque `supabase.*` depuis Vercel =
  1 aller-retour HTTP (~100–200 ms selon région).
- **Le vrai problème, c'étaient les doublons.** Pour un click sur la
  grille, on faisait **3× `auth.getUser()`** (middleware + action +
  data-loader) là où 1 seul est nécessaire. Économies déjà appliquées
  au fur et à mesure des PR #21 et suivantes.
- **Le nombre de tables (15) n'est pas anormal.** L'inventaire est
  propre, pas de legacy monstrueuse.
- **La vraie friction résiduelle = `revalidatePath("/me")`** qui
  re-fetch TOUTE la page après chaque click. Recommandation : passer à
  une revalidation plus ciblée OU tolérer la latence puisque l'état
  client est déjà à jour.

## 1. Inventaire DB (schéma `public`)

| Objet | Compte |
|-------|-------|
| Tables | 15 |
| Vues | 9 |
| Fonctions / RPCs | 82 |
| Policies RLS | 30 |
| Index | 51 |
| Triggers | 11 |

Tables : `app_profile`, `election`, `election_result`, `political_entity`,
`post`, `post_poll`, `post_poll_option`, `post_poll_response`,
`post_poll_snapshot`, `post_poll_target_distribution`, `profile_vote_history`,
`reaction`, `thread_post`, `topic`, `user_private_political_profile`.

**Verdict** : 15 tables pour un produit qui fait forum + sondages + vote history,
c'est raisonnable. Pas de bloat évident.

## 2. Latence SQL pure (local, Postgres 15)

Mesures `EXPLAIN ANALYZE` :

| Query | Rows | Execution | Total (avec planning + psql) |
|-------|------|-----------|-------------------------------|
| `select * from election order by held_on desc` | 17 | **0.6 ms** | 5.7 ms |
| `select * from election_result order by rank` | 109 | **0.4 ms** | 3.1 ms |
| UPSERT `profile_vote_history` (mesuré via `\timing`) | 1 | ~5 ms | ~10 ms |

→ Postgres n'est **jamais** le bottleneck à ce volume.

## 3. Dissection d'un click sur la grille de vote

### AVANT les fixes (reference — PR #20 initiale)

```
click
 ├─ middleware.auth.getUser()              ~200 ms   (round-trip Supabase Auth)
 ├─ action.auth.getUser()                  ~200 ms   (redondant)
 ├─ rpc_upsert_vote_history                 ~50 ms
 └─ revalidatePath -> /me re-render
     ├─ middleware.auth.getUser()          ~200 ms   (sur GET /me du refetch)
     ├─ getAccountWorkspaceData:
     │    ├─ auth.getUser()                ~200 ms   (redondant avec middleware)
     │    └─ 7 parallel queries             ~150 ms  (bounded by slowest)
     └─ getVoteHistoryEditorData:
          └─ 3 parallel queries             ~150 ms
 ─────────────────────────────────────────────────
 Total perçu : ~1 150 ms (dont ~800 ms d'aller-retours `auth.getUser` redondants)
```

### APRÈS fixes (PR #21 + courant)

```
click
 ├─ middleware                              0 ms    (skip sur POST server action)
 ├─ action : rpc_upsert_vote_history       ~50 ms
 └─ revalidatePath -> /me re-render
     ├─ middleware.auth.getUser()          ~200 ms  (sur GET /me, necessaire)
     ├─ getAccountWorkspaceData:
     │    ├─ auth.getSession()              ~0 ms    (lecture cookie, plus REST)
     │    └─ 6 parallel queries            ~150 ms
     └─ getVoteHistoryEditorData:
          └─ 3 parallel queries            ~150 ms
 ─────────────────────────────────────────────────
 Total perçu : ~550 ms  (dont 350 ms de re-render de toute la page)
```

**Gain** : ~600 ms par click. Reste du gras identifiable ci-dessous.

## 4. Gras encore présent

### (a) `revalidatePath("/me")` re-fetch toute la page

Le click sur une tuile de vote invalide **tout** `/me`. Pourtant seul
`profile_vote_history` a changé. Les 6 autres queries (profile, visibility,
drafts, posts, comments, parent-titles) se relancent pour rien.

**Options** :
1. **Garder `revalidatePath` tel quel**. Le re-render se fait sur le serveur
   pendant qu'on est déjà sur la page. L'utilisateur perçoit ~350 ms.
2. **Passer à `revalidateTag`** sur tag dédié `vote-history`. Nécessite que
   `getVoteHistoryEditorData` utilise `fetch` taggé. Plus d'ingénierie.
3. **Supprimer `revalidatePath` et gérer l'état côté client**. Le click est
   instant (~50 ms RPC) + on injecte la nouvelle ligne dans l'état React.
   Simple et rapide, mais remet de l'état local qu'on venait de tuer.

Recommandation : **(1) pour l'instant**. 350 ms après un click est acceptable
une fois le ripolinage optimiste enlevé. Réévaluer si le reste de l'app
présente le même pattern sur des interactions plus fréquentes.

### (b) `auth.getUser()` restant dans le middleware

Le middleware appelle `auth.getUser()` sur chaque GET vers `/me` (~200 ms).
C'est nécessaire : c'est le seul gate-keeper qui redirige un visiteur
non-auth vers `/auth/login` avant même de charger la page.

**Alternative** : utiliser `auth.getClaims()` (disponible en Supabase JS v2.45+)
qui valide le JWT **localement** avec la clé publique — pas de round-trip.
À évaluer dans une PR dédiée.

### (c) N+1 sur les parent-titles des commentaires

`getAccountWorkspaceData` fait un dernier appel séquentiel après le
`Promise.all` : `v_thread_posts.in(parentPostIds)`. Ça ajoute un round-trip
~100 ms sur la section comments. Contournable via une vue jointe.

Priorité basse : n'affecte que `/me?section=comments`.

### (d) `auth.getUser()` encore dans `account.ts` (4 call sites)

`upsertAccountIdentityAction`, `upsertPrivateProfileAction` (via RPC mais
avec getUser avant), `deactivateAccountAction`, `deleteAccountAction`.

Ces actions sont rares (edit profil, désactivation). Impact minimal sur
l'UX. On les laisse en l'état — le pattern sera propagé si un problème
se remarque.

## 5. Coût Supabase lui-même

- **Latence HTTP REST** : mesurée à 80–150 ms depuis Vercel (région) vers
  Supabase (autre région). Presque entièrement du TLS + routing, pas du
  compute Postgres.
- **Prix** : plan actuel largement sous-dimensionné pour le trafic
  probable (MVP). Pas un sujet à date.
- **Fiabilité** : pas d'incident observé.

Pas d'argument tangible pour changer de stack.

## 6. Recommandations opérationnelles

1. **Ne plus répliquer `auth.getUser()`** côté data-loader (fait). Préférer
   `getSession()` (cookie read, 0 ms) quand le middleware a déjà gardé la
   route.
2. **Ne plus faire `auth.getUser()` dans une Server Action** si le RPC est
   `SECURITY DEFINER` et check `auth.uid()` (fait pour vote-history).
3. **Toute nouvelle data-fetching au niveau `/me`** doit passer par une
   vue ou un RPC dédié, pas par une accumulation de `from().select()`.
4. **Auditer `getClaims()` Supabase** pour le middleware — potentiel gain
   de ~200 ms sur chaque navigation `/me`.
5. **Ne JAMAIS masquer une latence avec `useOptimistic`** : diagnostiquer
   le vrai coupable (règle CLAUDE.md).

## 7. Ce qu'on NE fait PAS

- Pas de cache Redis / KV : prématuré, les queries sont rapides.
- Pas de changement de stack : Supabase est adapté, le problème était la
  redondance applicative.
- Pas d'edge-runtime : Next + Supabase fonctionnent, et passer certains
  routes en edge casserait `cookies()` et `createServerClient` SSR.
