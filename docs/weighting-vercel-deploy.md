# Vercel Python Function — Weighting Worker (phase 3e)

Le worker de redressement tourne en **Vercel Python Function** déclenchée par un **Supabase Database Webhook** sur chaque INSERT dans `survey_respondent_snapshot` (chaque vote). Pas de Railway, pas de long-poll, pas de Vercel Cron (qui exige le plan Pro pour une granularité < 1 j) : architecture **event-driven**, serverless, même repo, même deploy, même auth que le front. Latence vote → corrigé ≈ 1-2 s.

## Architecture

```
┌──────────┐  INSERT survey_respondent_snapshot + pgmq.send({poll_id})
│  Client  │──────────────────────────────────────────────┐
└──────────┘                                              ▼
                                              ┌────────────────────┐
                                              │  pgmq.q_weighting  │
                                              └────────────────────┘
                                                        ▲
                                                        │  (drained by handler)
┌────────────────────────────────────────┐              │
│ Supabase Database Webhook              │              │
│  • event: AFTER INSERT                 │              │
│  • table: survey_respondent_snapshot   │              │
│  • header: authorization: Bearer …     │              │
└────────────┬───────────────────────────┘              │
             │  HTTP POST (per vote, debounced)         │
             ▼                                          │
┌───────────────────────────────────────────────┐       │
│ Vercel Python 3.12 function                   │───────┘
│ /api/weighting/process                        │
│                                               │
│  1. verify Bearer secret                      │
│  2. read queue (service-role RPC)             │
│  3. dedupe by poll_id (burst collapse)        │
│  4. pipeline.run(poll_id)                     │
│     └─ calibrate → estimate → score           │
│  5. upsert survey_poll_estimate               │
│  6. archive or dead-letter                    │
└───────────────────────────────────────────────┘
```

## Fichiers

| Chemin | Rôle |
|---|---|
| `frontend/api/weighting/process.py` | Entry point Vercel |
| `frontend/requirements.txt` | Deps Python — parité avec `worker/pyproject.toml` |
| `frontend/vercel.json` | `functions` + `crons` |
| `worker/src/weighting/*.py` | Code partagé — bundled dans la fonction via `includeFiles` |

La fonction importe le package `weighting` depuis `worker/src` grâce au `includeFiles: "../worker/src/weighting/**"` dans `vercel.json` + un `sys.path.insert` dans `process.py`.

## Déploiement Vercel — checklist

### 1. Env vars

À configurer dans Vercel Project Settings → Environment Variables, scope `Production` + `Preview` :

| Variable | Source |
|---|---|
| `SUPABASE_URL` | Supabase Project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project → Settings → API → `service_role` (secret !) |
| `WEIGHTING_CRON_SECRET` | Random 32-byte string, pour triggers manuels. `openssl rand -hex 32` |

### 2. Supabase Database Webhook

Une fois la fonction Vercel déployée, créer le webhook dans **Supabase
Dashboard → Database → Webhooks → Create a new hook** :

| Champ | Valeur |
|---|---|
| Name | `weighting_worker_trigger` |
| Table | `public.survey_respondent_snapshot` |
| Events | `INSERT` (uniquement) |
| Type | HTTP Request |
| Method | POST |
| URL | `https://<app>.vercel.app/api/weighting/process` |
| HTTP Headers | `authorization: Bearer <WEIGHTING_CRON_SECRET>` |
| Timeout (ms) | 5000 |

Supabase fait un POST par vote. Le handler dédupe par `poll_id` dans le
batch : un burst de 50 votes simultanés → **1 seul** `pipeline.run`.
La queue pgmq sert de tampon natif pour cette dédup.

La fonction accepte aussi le header `x-vercel-cron: 1` pour un éventuel
sweep programmé côté Pro — non utilisé en MVP.

### 3. Déploiement local pour tester

```bash
cd frontend
vercel dev
# Vercel simule la fonction à http://localhost:3000/api/weighting/process

# Test manuel :
curl -X POST http://localhost:3000/api/weighting/process \
  -H "authorization: Bearer $WEIGHTING_CRON_SECRET"
```

### 4. Déploiement production

```bash
vercel deploy --prod
```

### 5. Observabilité

Les logs Python vont dans Vercel → Project → Functions → `api/weighting/process` → Logs. Filtrer par niveau WARN/ERROR.
Les erreurs webhook côté Supabase : Dashboard → Database → Webhooks → {hook} → Recent deliveries.

## Contraintes techniques

- **Cold start** : 1-3 s avec scipy. Acceptable — un cold start sur le premier vote après idle ; les votes suivants hit du warm.
- **Max duration** : 60 s (Hobby & Pro). Nos pipelines tournent < 10 s typiquement.
- **Memory** : 1024 MB alloués dans `vercel.json`. Bundle samplics + scipy + pandas tient en ~500 MB RAM.
- **Bundle size** : ~150 MB deps + ~50 KB code worker. Sous la limite 250 MB Vercel.
- **Webhook timeout Supabase** : 5 s. Si la fonction n'a pas répondu à temps, Supabase ne retry pas — mais comme le message reste dans pgmq, la prochaine invocation reprendra le travail.

## Migration depuis Railway

**Avant** (phase 3, Railway) :
- `python -m weighting.worker` tournait en boucle sur Railway.
- Long-poll `pgmq.read()` toutes les 2 s.
- Archive message à la main.

**Après** (phase 3e, Vercel + Supabase webhook) :
- Chaque vote déclenche la fonction via webhook Supabase.
- Fonction fait le même travail **une fois** puis rend la main.
- Même code pipeline (`worker.src.weighting.pipeline.run`), même Supabase client.
- `worker/src/weighting/worker.py` (long-poll) reste dans le repo pour `supabase start` local + les tests d'intégration. La version Vercel est le canal de production.

## Différences de comportement

- **Latence vote → corrigé** : ~1-2 s (webhook + cold start amorti). Avant : ~30 s (long-poll interval).
- **Idle cost** : ~0 $ (pas de process always-on, pas de cron). Avant : ~5-20 $/mois Railway.
- **Peak cost** : un vote = une invocation (dédupliquée dans le batch via pgmq). Négligeable en dessous du million de votes/mois.
- **Hobby compatibility** : le plan Hobby n'autorise que du cron journalier ; le webhook Supabase contourne cette limite proprement.

## Rollback

Si la fonction Vercel pose problème en prod :
1. Désactiver le webhook Supabase (`Disable` dans le Dashboard).
2. Relancer temporairement le worker Railway : `cd worker && uv run python -m weighting.worker`.

Le code `worker.py` reste dans le repo précisément pour cette bascule.
