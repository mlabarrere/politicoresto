# Weighting worker — architecture

**Status:** design, pre-implementation. Locked by the Q&A session of 2026-04-23.
**Methodology:** Deville & Särndal (JASA 1992) calibration, linear truncated, bounds `[0.5, 2.0]`.
**Library:** [`samplics` ≥ 0.6, < 0.7](https://doi.org/10.21105/joss.03376) — peer-reviewed, validated against R `survey`.
**Contract invariant:** `v_post_poll_summary` stays backward-compatible during the transition — new columns are added, legacy columns keep mirroring for one release.

---

## 1. Data flow (end-to-end)

```
                                                                   ┌───────────────────────┐
┌────────┐  POST /api/polls/vote   ┌───────────┐  rpc (1 tx)       │ post_poll_response    │
│ Client │ ───────────────────────▶│ Next route│ ─────────────────▶│ survey_respondent_…   │
└────────┘                         └───────────┘                   │ pgmq.send('weighting')│
                                                                   └──────────┬────────────┘
                                                                              │
                                                 pgmq.read (long-poll, vt=120s)
                                                                              ▼
                                                                   ┌───────────────────────┐
                                                                   │ Worker (Python)       │
                                                                   │  • dedupe poll_id/30s │
                                                                   │  • load snapshots     │
                                                                   │  • load ref (as_of)   │
                                                                   │  • samplics calibrate │
                                                                   │  • compute 4 sub-sc.  │
                                                                   │  • upsert estimate    │
                                                                   │  • pgmq.archive       │
                                                                   └──────────┬────────────┘
                                                                              │
                                                                              ▼
                                                                   ┌───────────────────────┐
                                                                   │ survey_poll_weights   │
                                                                   │ survey_poll_estimate  │
                                                                   └──────────┬────────────┘
                                                                              │
                                                          SELECT v_post_poll_summary
                                                                              ▼
                                                                   ┌───────────────────────┐
                                                                   │ Next page SSR / SWR   │
                                                                   └───────────────────────┘
```

## 2. Schema additions

All new tables live in `public`. RLS enabled from the first migration, policies included.

### 2.1 `survey_ref_marginal`

Reference population shares per single dimension (univariate).

```sql
create table public.survey_ref_marginal (
  as_of         date        not null,
  dimension     text        not null,          -- 'age_bucket', 'sex', 'region', 'csp', 'education', 'past_vote_pr1_2022'
  category      text        not null,          -- '18_24', 'F', 'ile-de-france', 'unknown', ...
  share         numeric     not null check (share between 0 and 1),
  source_label  text        not null,          -- 'INSEE RP 2022', 'Ministère de l'Intérieur 2022 T1'
  source_url    text,
  primary key (as_of, dimension, category)
);
```

Notes: **"unknown" is a first-class category** (K-1 option a). Its target share equals INSEE's empirical non-response rate per dimension (committed as a documented number in the seed script).

### 2.2 `survey_ref_cell`

Reference shares for cross-products required by the design (e.g. `age_bucket × sex`).

```sql
create table public.survey_ref_cell (
  as_of         date        not null,
  dimensions    text[]      not null,          -- e.g. ['age_bucket','sex']
  categories    text[]      not null,          -- same length as dimensions
  share         numeric     not null check (share between 0 and 1),
  source_label  text        not null,
  source_url    text,
  primary key (as_of, dimensions, categories)
);
```

### 2.3 `survey_respondent_snapshot`

Written **atomically** with the vote by the modified `submit_post_poll_vote`.

```sql
create table public.survey_respondent_snapshot (
  id                  uuid        primary key default gen_random_uuid(),
  poll_id             uuid        not null references public.post_poll(post_item_id) on delete cascade,
  user_id             uuid        not null references auth.users(id) on delete cascade,
  option_id           uuid        not null references public.post_poll_option(id) on delete restrict,

  -- Frozen demographics (scalars for fast access)
  age_bucket          text,                    -- '18_24', …, '65_plus', or null
  sex                 text,                    -- 'F' | 'M' | 'other' | null
  region              text,                    -- INSEE region code or null
  csp                 text,                    -- INSEE CSP label or null
  education           text,                    -- 'none','bac','bac2','bac3_plus' or null
  past_vote_pr1_2022  text,                    -- candidate label / 'abstention' / 'not_eligible' / null

  -- Full profile payload for traceability (B-2)
  profile_payload     jsonb       not null default '{}'::jsonb,

  -- Reference anchoring
  ref_as_of           date        not null,    -- stamp-and-freeze (K-8)
  is_partial          boolean     not null default false,  -- true if any weighting field null

  snapshotted_at      timestamptz not null default timezone('utc', now()),
  unique (poll_id, user_id)
);

create index on public.survey_respondent_snapshot (poll_id);
create index on public.survey_respondent_snapshot (ref_as_of);

alter table public.survey_respondent_snapshot enable row level security;

-- Self-read only (users can see their own snapshots), no anon read, no user write.
create policy "snapshot_self_read" on public.survey_respondent_snapshot
  for select to authenticated
  using (user_id = auth.uid());
```

Writes come exclusively from `submit_post_poll_vote` (security definer). The worker reads via service role, which bypasses RLS.

### 2.4 `survey_poll_weights`

One row per respondent per recompute cycle — overwritten on every run.

```sql
create table public.survey_poll_weights (
  poll_id         uuid        not null references public.post_poll(post_item_id) on delete cascade,
  snapshot_id     uuid        not null references public.survey_respondent_snapshot(id) on delete cascade,
  weight          numeric     not null check (weight between 0.5 and 2.0),
  computed_at     timestamptz not null default timezone('utc', now()),
  primary key (poll_id, snapshot_id)
);

alter table public.survey_poll_weights enable row level security;
-- No public read — only worker (service role) writes, frontend never reads raw weights.
```

### 2.5 `survey_poll_estimate`

One row per poll. Upserted by the worker on every recompute; last write wins.

```sql
create table public.survey_poll_estimate (
  poll_id                 uuid        primary key references public.post_poll(post_item_id) on delete cascade,
  n_respondents           integer     not null,
  n_effective             numeric     not null,          -- Kish
  deff                    numeric     not null,
  weight_top5_share       numeric     not null,
  coverage_share          numeric     not null,
  min_political_coverage  numeric     not null,

  -- Confidence score decomposition (C-3 option c)
  confidence_score        integer     not null check (confidence_score between 0 and 100),  -- K-4(b)
  confidence_band         text        not null check (confidence_band in ('indicatif','correctable','robuste')),
  confidence_components   jsonb       not null,          -- {kish, coverage, variability, concentration}

  raw_results             jsonb       not null,          -- [{option_id, option_label, response_count, share}]
  corrected_results       jsonb,                         -- null when confidence_score < 40
  corrected_ci95          jsonb,                         -- {option_id: [lo, hi]}

  computed_with_ref_as_of date        not null,          -- I-3 + K-8
  is_final                boolean     not null default false,  -- set true on poll close
  computed_at             timestamptz not null default timezone('utc', now())
);

alter table public.survey_poll_estimate enable row level security;
create policy "estimate_public_read" on public.survey_poll_estimate
  for select to anon, authenticated using (true);
-- Writes: service role only.
```

### 2.6 `pgmq` queue

Created with `select pgmq.create('weighting');`. Messages: `{"poll_id": "<uuid>"}`. Visibility timeout 120s.

### 2.7 Trigger

```sql
create or replace function public.tg_enqueue_weighting() returns trigger as $$
begin
  perform pgmq.send('weighting', jsonb_build_object('poll_id', NEW.poll_id));
  return NEW;
end;
$$ language plpgsql security definer set search_path = public, pgmq;

drop trigger if exists trg_snapshot_enqueue on public.survey_respondent_snapshot;
create trigger trg_snapshot_enqueue
  after insert on public.survey_respondent_snapshot
  for each row execute function public.tg_enqueue_weighting();
```

## 3. RPC evolution

### 3.1 Modified `submit_post_poll_vote`

Signature unchanged. Adds the snapshot write in the same transaction.

```sql
-- Inside the existing function, between the option-validity check and the return:
insert into public.survey_respondent_snapshot (
  poll_id, user_id, option_id,
  age_bucket, sex, region, csp, education, past_vote_pr1_2022,
  profile_payload, ref_as_of, is_partial
)
select
  p_post_item_id,
  caller_id,
  p_option_id,
  derive_age_bucket(priv.date_of_birth),
  priv.sex,
  derive_region(priv.postal_code),
  priv.csp,
  priv.education,
  derive_past_vote_pr1_2022(caller_id),           -- joins profile_vote_history
  coalesce(priv.profile_payload, '{}'::jsonb),
  current_valid_reference_date(),                 -- latest `as_of` from survey_ref_marginal
  (priv.date_of_birth is null
    or priv.sex is null
    or priv.postal_code is null
    or priv.csp is null)                          -- partial if any core dim missing
from public.user_private_political_profile priv
where priv.user_id = caller_id;
```

Helper SQL functions (new, immutable where possible):
- `derive_age_bucket(dob date) → text`
- `derive_region(postal_code text) → text` (reuses the postal→city logic via a `region_by_postal` lookup table seeded from geo.api.gouv.fr)
- `derive_past_vote_pr1_2022(user_id uuid) → text` — joins `profile_vote_history` → `election_result` → `election` where `election.slug = 'pr1-2022'` (name TBD).
- `current_valid_reference_date() → date` — `max(as_of)` across `survey_ref_marginal`.

### 3.2 New fields needed on `user_private_political_profile`

Migration adds optional columns (all nullable):

```sql
alter table public.user_private_political_profile
  add column if not exists sex text check (sex is null or sex in ('F','M','other')),
  add column if not exists csp text,                  -- free text, validated against INSEE list client-side
  add column if not exists education text check (education is null or education in ('none','bac','bac2','bac3_plus'));
```

## 4. View evolution — `v_post_poll_summary`

**Additive only.** New columns land; old columns keep mirroring for one release.

New columns:
- `confidence_score integer` — the aggregate (K-4 b).
- `confidence_band text` — `'indicatif' | 'correctable' | 'robuste'`.
- `confidence_components jsonb` — `{kish, coverage, variability, concentration}` each in `[0,1]`.
- `corrected_ci95 jsonb` — per-option 95% CI, null when `confidence_score < 40`.
- `computed_with_ref_as_of date`.
- `is_final boolean`.

Legacy columns kept for one release:
- `representativity_score` ← mirror of `confidence_score`.
- `coverage_score, distance_score, stability_score, anti_brigading_score` ← mirror of `confidence_components` subfields (documented mapping on GitHub).

`raw_results` and `corrected_results` already exist. When `confidence_score < 40`, `corrected_results` returns `null` per the frontend contract (frontend already tolerates empty).

**Advisor hygiene (J-1):** the view is currently SECURITY DEFINER. We convert it to SECURITY INVOKER and rely on RLS on underlying tables, fixing the advisor error as part of this same migration.

## 5. Worker pipeline (Python, v1)

```
worker/
├── pyproject.toml        # python = "3.12", samplics = "^0.6", structlog, httpx, pydantic-settings
├── Dockerfile            # slim, non-root
├── src/weighting/
│   ├── settings.py       # pydantic-settings, env-only
│   ├── supabase_client.py# httpx + service-role
│   ├── snapshots.py      # read survey_respondent_snapshot for a poll
│   ├── reference.py      # read survey_ref_marginal + survey_ref_cell for a given as_of
│   ├── calibration.py    # wraps samplics.SampleWeight().calibrate(bounds=(0.5, 2.0))
│   ├── score.py          # Kish, coverage, variability (1/deff), concentration; geometric mean
│   ├── estimation.py     # weighted shares + normal-approx 95% CI
│   ├── pipeline.py       # orchestrates a single poll computation
│   └── worker.py         # main loop: pgmq.read → dedupe 30s → pipeline → upsert → archive
├── tests/
│   ├── unit/             # 100% branch coverage on calibration/score/estimation
│   ├── property/         # Hypothesis: weights > 0, within bounds, permutation invariance
│   ├── differential/     # our wrapper vs raw samplics
│   ├── golden/           # 10 frozen JSON scenarios via pytest-regressions
│   └── integration/      # real Supabase-local Postgres, full flow
├── fixtures/
│   ├── insee-rp-2022.csv         # to be seeded in phase 1
│   ├── pr1-2022-results.csv
│   └── external-benchmarks/      # K-5 external validation set
└── Makefile              # make verify → ruff + mypy --strict + pytest all layers
```

### 5.1 Confidence score formula

```
kish         = n_eff / (n_eff + 300)                          # 0..1
coverage     = covered_cell_share * sqrt(min_political_cov)   # 0..1
variability  = 1 / deff                                       # 0..1
concentration= clip(1 - (top5 - 0.05) / 0.20, 0, 1)           # 0..1

aggregate    = (kish**0.35 * coverage**0.30 * variability**0.20 * concentration**0.15)
confidence_score = round(aggregate * 100)  # 0..100 integer
confidence_band  = 'indicatif' if <40 else 'correctable' if <70 else 'robuste'
```

Weighted geometric mean — one catastrophic component collapses the total. Column name decisions:
- DB field `confidence_components.kish` == Pew's effective sample term.
- DB field `confidence_components.coverage` == population-cell coverage.
- DB field `confidence_components.variability` == 1/deff (inverse design effect).
- DB field `confidence_components.concentration` == top-5% weight concentration penalty.

### 5.2 Unknown-bucket handling (K-1a)

For each dimension `D` in {age_bucket, sex, region, csp, education, past_vote_pr1_2022}:
- Respondents with `D is null` are encoded as `D='unknown'`.
- `survey_ref_marginal` includes a row `(dimension=D, category='unknown', share=<INSEE non-response rate>)`.
- Calibration constraint is satisfied with "unknown" as a valid stratum.
- Documented on `/methodologie`: "Non-respondents to an optional field are counted as a separate category with the INSEE-observed non-response rate as target — they receive weights ≤ 1."

### 5.3 Triggering, dedupe, idempotency

- `pgmq.read('weighting', vt=120, qty=32)` every 2s.
- In-memory dedupe per `poll_id` across a rolling 30s window (D-2).
- Per-poll computation is **idempotent** (full recompute from snapshots, upsert on `survey_poll_estimate.poll_id`).
- On `poll_status='closed'` transition, a pg_cron job (`'* * * * *'`) enqueues a final `{poll_id, final:true}` message; worker processes with `is_final=true`.
- On fatal error: message is **not** archived, becomes visible again after vt, retries. After 5 retries → moved to dead-letter queue `weighting_dead`, logged at `error` level.

## 6. Environment variables

### Supabase
No new env vars. Service role key existing.

### Worker (Railway once split, local `.env` before)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PGMQ_QUEUE_NAME=weighting`
- `DEDUPE_WINDOW_SECONDS=30`
- `POLL_INTERVAL_SECONDS=2`
- `LOG_LEVEL=info`

### Frontend
**No new env var.** H-1 rejected — no `WEIGHTING_ENABLED` flag. Standard forward-only deploy.

## 7. Interface contracts

### 7.1 Vote submission (unchanged externally)
`POST /api/polls/vote { postItemId, optionId }` → `200 { poll: v_post_poll_summary }`. Same signature as today.

### 7.2 Queue message
`{"poll_id": "<uuid>"}` or `{"poll_id": "<uuid>", "final": true}`.

### 7.3 Worker read/write (service role)
Read: `survey_respondent_snapshot where poll_id=X`, `survey_ref_marginal/cell where as_of=<min(ref_as_of) for poll>`.
Write: overwrite `survey_poll_weights` for poll, upsert `survey_poll_estimate`.

### 7.4 View read (frontend)
Unchanged select list; new fields available:
```json
{
  "post_item_id": "uuid",
  "question": "…",
  "sample_size": 847,
  "confidence_score": 62,
  "confidence_band": "correctable",
  "confidence_components": {"kish": 0.74, "coverage": 0.65, "variability": 0.55, "concentration": 0.58},
  "raw_results": [...],
  "corrected_results": [...],
  "corrected_ci95": {"opt_a": [0.53, 0.63], ...},
  "computed_with_ref_as_of": "2022-04-15",
  "is_final": false,
  "representativity_score": 62,
  "coverage_score": 0.65, "distance_score": 0.55, "stability_score": 0.58, "anti_brigading_score": 0.74
}
```

## 8. Security

- Snapshot table: RLS self-read only, no user write. All writes via `submit_post_poll_vote` (security definer).
- `survey_poll_weights`: no public read, service-role write.
- `survey_poll_estimate`: public read, service-role write.
- `ref_*`: public read (transparency), service-role write.
- Worker uses service-role key. Never logged. Stored in Railway env vars once split; in `worker/.env` (gitignored) locally.
- No PII in logs — only `poll_id, n, n_eff, deff, score, duration_ms, ref_as_of`.

## 9. Documentation split (K-6)

- **GitHub (technical):** worker README, `/docs/weighting-*.md` in this repo — formulas, parameters, benchmark results, version history.
- **Website (public-facing):** `/methodologie` page — French, plain-language, AAPOR-aligned, with links back to the GitHub technical docs for the curious.

## 10. Open items deferred to phase 1

- Exact INSEE CSV format (encoding, separator, column names) — confirmed at seed time.
- Exact `election.slug` / `election_result` filter for `pr1-2022` — confirmed when inspecting the existing `election` rows.
- `region_by_postal` lookup table shape — confirmed when we download the geo.api.gouv.fr dump.
