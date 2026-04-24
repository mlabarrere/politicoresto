# Railway — Weighting Worker deploy (phase 3e)

Le worker de redressement tourne en **service Railway** (FastAPI +
uvicorn, Python 3.12), déclenché par un **Supabase Database Webhook**
sur chaque INSERT dans `survey_respondent_snapshot`. Architecture
event-driven, latence vote → corrigé ≈ 1-2 s.

**Pourquoi pas Vercel ?** Le bundle Python (scipy + samplics + pandas
+ numpy ≈ 600 MB) dépasse la limite Lambda Vercel de 500 MB. Railway
n'a pas cette contrainte et accepte les workloads Python ML sans
broncher.

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
│ Railway service: weighting-worker             │───────┘
│ FastAPI — POST /process, GET /health          │
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
| `worker/src/weighting/http_app.py` | FastAPI app — `GET /health`, `POST /process` |
| `worker/src/weighting/processor.py` | Core batch logic (dedupe + pipeline + archive) |
| `worker/src/weighting/*.py` | Pipeline calibration (inchangé) |
| `worker/pyproject.toml` | Runtime + dev deps (fastapi, uvicorn ajoutés) |
| `worker/railway.toml` | Service config (start command, healthcheck) |

## Déploiement

### 1. Env vars Railway

Le service `weighting-worker` du projet `content-imagination` a besoin de :

| Variable | Source | Secret |
|---|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API | non |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → `sb_secret_…` | **oui** |
| `WEIGHTING_CRON_SECRET` | `openssl rand -hex 32` | **oui** — shared avec Supabase webhook |
| `PGMQ_QUEUE_NAME` | `weighting` (default) | non |
| `PGMQ_BATCH_SIZE` | `32` (default) | non |
| `PGMQ_MAX_RETRIES` | `5` (default) | non |

Push via CLI :

```bash
railway variables --service weighting-worker \
  --set "SUPABASE_URL=..." \
  --set "SUPABASE_SERVICE_ROLE_KEY=sb_secret_..." \
  --set "WEIGHTING_CRON_SECRET=$(openssl rand -hex 32)"
```

### 2. Deploy

```bash
# depuis la racine du repo
railway up worker --path-as-root --service weighting-worker --detach
```

`--path-as-root` fait que Railway n'indexe QUE `worker/` (sinon Railpack
voit tout le repo et ne détecte pas correctement Python). Le
`railway.toml` de `worker/` fournit la start command et le
healthcheck.

### 3. Domaine public

```bash
railway domain --service weighting-worker   # → génère weighting-worker-<hash>.up.railway.app
```

### 4. Seeder `public.weighting_worker_config`

Le trigger `weighting_worker_trigger` (migration `20260424170000`) lit
l'URL et le secret dans une table `public.weighting_worker_config`.
C'est ce qui fait pointer chaque environnement Supabase vers SON
propre worker Railway. Sans cette ligne, le trigger est un no-op
silencieux (voting continue de marcher, mais l'estimate n'est jamais
calculée).

```sql
-- côté staging (à exécuter une fois via MCP ou SQL Editor)
insert into public.weighting_worker_config (id, url, secret) values
  (1,
   'https://weighting-worker-staging-production.up.railway.app/process',
   '<WEIGHTING_CRON_SECRET>')
on conflict (id) do update
  set url = excluded.url,
      secret = excluded.secret,
      updated_at = now();

-- côté prod — même commande, URL différente
insert into public.weighting_worker_config (id, url, secret) values
  (1,
   'https://weighting-worker-production.up.railway.app/process',
   '<WEIGHTING_CRON_SECRET>')
on conflict (id) do update
  set url = excluded.url,
      secret = excluded.secret,
      updated_at = now();
```

Le secret est le même que la var Railway `WEIGHTING_CRON_SECRET`
exposée à la fonction. La table a RLS `for all using (false)` donc
seul service_role / superuser peut la lire/écrire — c'est pourquoi le
seed passe par MCP ou SQL Editor et pas par l'UI app.

#### Rotation du secret

1. Générer un nouveau secret : `openssl rand -hex 32`
2. `railway variables --service weighting-worker --set "WEIGHTING_CRON_SECRET=..."` (et staging)
3. Mettre à jour `weighting_worker_config.secret` sur les 2 envs Supabase (SQL ci-dessus)
4. Railway redémarre le service automatiquement à la MAJ de vars

Supabase envoie un POST par vote. Le handler dédupe par `poll_id`
dans le batch — un burst de 50 votes = 1 `pipeline.run`. pgmq sert
de tampon natif pour cette dédup.

### 5. Observabilité

```bash
railway logs --service weighting-worker            # runtime logs
railway logs --service weighting-worker --build    # build logs
```

Côté Supabase : Dashboard → Database → Webhooks → `weighting_worker_trigger`
→ Recent deliveries (statuts 2xx / 5xx, latences).

## Test local

```bash
cd worker
uv sync
uv run uvicorn weighting.http_app:app --host 0.0.0.0 --port 8080

# sanity
curl http://localhost:8080/health
# → {"status":"ok"}

# manual fire (needs a running Supabase + WEIGHTING_CRON_SECRET exported)
curl -X POST http://localhost:8080/process \
  -H "authorization: Bearer $WEIGHTING_CRON_SECRET"
```

## Contraintes techniques

- **Cold start** : quasi-nul en mode always-on (service Railway reste
  chaud). Si on active le mode Serverless (scale-to-zero), premier
  vote après idle ≈ 5-10 s.
- **Concurrence** : 1 worker uvicorn par défaut. pgmq `visibility_timeout`
  empêche le double-processing.
- **Memory** : 1 GB alloué (suffisant pour scipy + samplics sur des
  polls jusqu'à ~10k répondants).
- **Timeout webhook Supabase** : 5 s. Si le pipeline prend plus long,
  Supabase ne retry pas — mais le message reste dans pgmq, le prochain
  webhook reprend le travail.

## Rollback

Si le service Railway tombe en panne :

1. Désactiver le webhook dans Supabase Dashboard.
2. Lancer temporairement le worker long-poll localement :
   ```bash
   cd worker && uv run python -m weighting.worker
   ```

Le code `worker.py` (long-poll) reste dans le repo précisément pour
cette bascule et pour les tests d'intégration locaux.

## Historique

- **Phase 3** : long-poll sur Railway (`python -m weighting.worker`).
- **Phase 3e (tentative)** : Vercel Python Function + cron — abandonnée
  quand on a découvert (a) que Hobby interdit les crons `* * * * *`,
  puis (b) que le bundle Python dépasse la limite Lambda 500 MB.
- **Phase 3e (actuel)** : Railway FastAPI + Supabase Database Webhook.
  Event-driven, bundle illimité, coût ~5-10 $/mois.
