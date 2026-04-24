# Vercel Python Function — Weighting Worker (phase 3e)

Le worker de redressement tourne en **Vercel Python Function** déclenchée par un **Vercel Cron** toutes les minutes. Pas de Railway, pas de long-poll pgmq : architecture pull, serverless, même repo, même deploy, même auth que le front.

## Architecture

```
┌──────────┐  INSERT snapshot + pgmq.send({poll_id})
│  Client  │──────────────────────────────────────────────┐
└──────────┘                                              ▼
                                              ┌────────────────────┐
                                              │  pgmq.q_weighting  │
                                              └─────────┬──────────┘
                                                        │
                                  ┌─────────────────────┘
                                  │  HTTP POST (every minute)
                                  │  x-vercel-cron: 1
                                  ▼
┌───────────────────────────────────────────────┐
│ Vercel Python 3.12 function                   │
│ /api/weighting/process                        │
│                                               │
│  1. read queue (service-role RPC)             │
│  2. dedupe by poll_id                         │
│  3. pipeline.run(poll_id)                     │
│     └─ calibrate → estimate → score           │
│  4. upsert survey_poll_estimate               │
│  5. archive or dead-letter                    │
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

### 2. Cron secret de Vercel

Vercel signe les requêtes cron avec le header `x-vercel-cron: 1`. La fonction accepte :
- `x-vercel-cron: 1` (trusted par Vercel)
- `authorization: Bearer <WEIGHTING_CRON_SECRET>` (pour debug / tests manuels)

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
# Le cron se déclenche automatiquement selon vercel.json.crons
```

### 5. Observabilité

Les logs Python vont dans Vercel → Project → Functions → `api/weighting/process` → Logs. Filtrer par niveau WARN/ERROR.

## Contraintes techniques

- **Cold start** : 1-3 s avec scipy. Acceptable pour du cron minute.
- **Max duration** : 60 s (Vercel Pro). Nos pipelines tournent < 10 s typiquement.
- **Memory** : 1024 MB alloués dans `vercel.json`. Bundle samplics + scipy + pandas tient en ~500 MB RAM.
- **Bundle size** : ~150 MB deps + ~50 KB code worker. Sous la limite 250 MB Vercel.

## Migration depuis Railway

**Avant** (phase 3, Railway) :
- `python -m weighting.worker` tournait en boucle sur Railway.
- Long-poll `pgmq.read()` toutes les 2 s.
- Archive message à la main.

**Après** (phase 3e, Vercel) :
- Vercel Cron déclenche la fonction chaque minute.
- Fonction fait le même travail **une fois** puis rend la main.
- Même code pipeline (`worker.src.weighting.pipeline.run`), même Supabase client.
- `worker/src/weighting/worker.py` (long-poll) reste dans le repo pour `supabase start` local + les tests d'intégration. La version Vercel est le canal de production.

## Différences de comportement

- **Latence vote → corrigé** : ~1 min (tick cron) + quelques secondes. Avant : ~30 s (long-poll interval). Acceptable pour un MVP.
- **Idle cost** : ~0 $ (pas de process always-on). Avant : ~5-20 $/mois Railway.
- **Peak cost** : si 100 polls actifs simultanément, 100 invocations/minute → ~$0.01/min, ~$14/mois. Négligeable.

## Rollback

Si la fonction Vercel pose problème en prod :
1. Retirer le cron dans `vercel.json` (`crons: []`).
2. Redéployer le frontend.
3. Relancer temporairement le worker Railway : `cd worker && uv run python -m weighting.worker`.

Le code `worker.py` reste dans le repo précisément pour cette bascule.
