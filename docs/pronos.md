# Pronostics — architecture

Spec produit complète : voir le prompt cadrage 2026-04-25 et `docs/metier.md`.
Ce document décrit la plomberie technique : schéma SQL, RPC, vues, frontend,
mécanique de scoring.

## Cycle de vie

```
[demande utilisateur]
    │
    ▼
topic.topic_status = 'pending_review'   (banniere "📋 Demande en attente")
    │
    ├── modo refuse  ─►  'rejected'    (banniere "🚫 Demande refusée" + raison)
    │
    └── modo publie  ─►  'open'        (paris ouverts, banniere disparaît)
                          │
                          ▼
                'resolved' ou 'voided' via rpc_resolve_prono
```

Conserve les enums ENUM `topic_status` valeurs : `pending_review`,
`open`, `locked`, `resolved`, `archived`, `removed`, `rejected`.

## Schéma

| Table                            | Rôle                                                              |
|----------------------------------|--------------------------------------------------------------------|
| `prono_question`                 | 1:1 avec `topic`. Question texte, `requested_by`, `betting_cutoff_at`, `allow_multiple`. |
| `prono_option`                   | N options par question. `is_catchall` (option "Autre" auto-ajoutee), `is_late` (ajoutee post-publication). |
| `prono_bet`                      | Pari (question, option, user). UNIQUE(question, option, user). `bet_at` = horodatage de la dernière action. À la résolution, `multiplier`, `smoothed_share`, `is_winner`, `is_pruned` peuplés. |
| `prono_distribution_snapshot`    | Append-only, capture la part de chaque option à chaque mutation de pari. Service-role only — pas de grant client. |
| `prono_resolution`               | 1:1 avec `prono_question`. `resolution_kind ∈ {resolved, voided}`, `winning_option_ids[]`, `void_reason`, `resolution_note`. |
| `reputation_ledger`              | Event log generique. Pronos écrit `event_type = 'prediction_accuracy'`, `reference_entity_type = 'prono_question'`, `delta = points`, `metadata = {option_id, multiplier, smoothed_share, bet_at}`. |
| `user_notification`              | Spine notifications in-app. Self-only RLS. Triggers : `prono_published`, `prono_rejected`, `prono_resolved`, `prono_voided`, `prono_option_added`. |

RLS : `prono_question`, `prono_option`, `prono_resolution` lisibles publics
quand le topic est lisible (via `can_read_topic`). `prono_bet` = self-only
tant que le prono est ouvert ; public dès `prono_resolution` créée. Les
écritures passent toutes par RPC SECURITY DEFINER (jamais d'INSERT direct
client).

## RPC

Toutes en `SECURITY DEFINER`, `search_path = public, pg_temp`. Mapping
des erreurs :
- `28000` — auth required
- `42501` — forbidden (non-modo)
- `22023` — invalid argument
- `P0002` — not found

| RPC                    | Acteur     | Effet                                                              |
|------------------------|------------|--------------------------------------------------------------------|
| `rpc_request_prono`    | auth user  | Crée topic `pending_review` + thread_post `'market'` + question + options + "Autre". |
| `rpc_publish_prono`    | modo       | Topic → `open`. Notif `prono_published` au demandeur.               |
| `rpc_reject_prono`     | modo       | Topic → `rejected` (locked_reason = raison). Notif `prono_rejected`.|
| `rpc_place_bet`        | auth user  | UPSERT pari. Si `allow_multiple=false`, supprime les autres paris du user. Capture distribution snapshot. |
| `rpc_remove_bet`       | auth user  | DELETE pari. Capture distribution.                                 |
| `rpc_add_option`       | modo       | Insère option avec `is_late=true`. Notif `prono_option_added` à chaque parieur. |
| `rpc_resolve_prono`    | modo       | Atomic. Voir mécanique ci-dessous.                                |

## Mécanique de scoring

À la résolution (`p_resolution_kind = 'resolved'`), pour chaque
`prono_bet` non-pruné :

1. Récupère le snapshot le plus récent ≤ `bet.bet_at` pour `(question, option)`.
2. Calcule la part lissée :
   ```
   prior        = 1.0 / count(prono_option WHERE question = ? AND is_active)
   smoothed     = (snapshot.share × snapshot.total_bets + prior × 10)
                / (snapshot.total_bets + 10)
   ```
3. Multiplicateur :
   ```
   multiplier   = min(5.0, 1.0 / max(0.05, smoothed))
   ```
4. Points (uniquement si gagnant) :
   ```
   points       = round(multiplier × 10)
   ```
5. Persist :
   - `UPDATE prono_bet SET multiplier, smoothed_share, is_winner` (toutes lignes).
   - `INSERT reputation_ledger` (gagnants seulement, points > 0).
6. `topic.topic_status = 'resolved'`.

Pour `voided` : seulement `prono_resolution` + notifs, pas de scoring.

`betting_cutoff_at` : tout `prono_bet.bet_at > cutoff` est marqué
`is_pruned = true` AVANT le scoring → exclu du calcul.

## Vues frontend

| Vue                       | Rendue par                                          |
|---------------------------|------------------------------------------------------|
| `v_prono_summary`         | `/post/[slug]`, `/pronos`, `/admin/pronos/[topicId]`. JSONB `options[]` enrichi (share, odds, bet_count, is_late). `current_user_bets[]` via `auth.uid()`. |
| `v_prono_admin_queue`     | `/admin/pronos`. Liste des `pending_review`, gardée par `is_moderator()`. |
| `v_prono_leaderboard`     | `/pronos/leaderboard`. Top 100 par précision moyenne. |
| `v_prono_user_history`    | `/me/pronos` + bannière rétroactive. Multiplier/smoothed_share/points lus depuis `prono_bet` (donc affichés pour les perdants aussi). |

Tous `security_invoker = true`.

## Frontend

- `lib/data/public/pronos.ts` : normalizer + `getPronoList`, `getPronoSummaryByTopicId`, `getPronoSummariesByTopicIds`.
- `lib/actions/pronos.ts` : 7 server actions (`requestPronoAction`, `publishPronoAction`, `rejectPronoAction`, `placeBetAction`, `removeBetAction`, `resolvePronoAction`, `addOptionAction`) + `markNotificationReadAction`.
- `components/prono/` : `prono-detail`, `prono-bet-bar` (optimistic via `useOptimistic`), `prono-aggregate-display`, `prono-card-inline`, `prono-resolution-banner` (rétroactif), `prono-option-added-banner` (chronologique).
- `lib/supabase/auth-role.ts` : `isModeratorClaim()` lit `app_metadata.app_role` du JWT pour gater `/admin/pronos*` (defence-in-depth ; RLS reste autoritative).

## Tests

- `tests/integration/pronos-rpc.int.test.ts` : RLS + cycle complet + invariants cap/floor multiplier sur winners + losers.
- `tests/integration/legacy-prediction-removed.int.test.ts` : régression schema legacy supprimé.
- `tests/e2e/prono-request.spec.ts` : request → pending banner → modo publie depuis /admin/pronos. 404 non-modo.
- `tests/e2e/prono-vote.spec.ts` : click option → optimistic UI + DB row, switch options, anonymous disabled.
- `tests/e2e/prono-resolve.spec.ts` : modo résout depuis /admin/pronos/[topicId], topic flippe `resolved`, bannière publique visible.
- `tests/e2e/prono-add-option.spec.ts` : modo ajoute une option, parieur reçoit notif + bannière chronologique sur la page publique.

## Roadmap restante

- **Lot 7 (phase 2, hors MVP)** : score de représentativité du panel
  pronos via réutilisation du worker Railway. Table `prono_panel_estimate`
  + webhook DB sur `prono_bet` insert/update. UI : encart "Fiabilité du
  panel : 62/100" sur chaque prono.
