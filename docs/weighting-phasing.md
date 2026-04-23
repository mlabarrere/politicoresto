# Weighting worker — phasing

4 phases, one PR per phase, phase-gate review by the founder before the next starts. Everything local-first. Worker code lives in a new top-level `worker/` folder in this repo until phase 4; a standalone `politicoresto-weighting-worker` repo only happens after v1 proves locally.

**Commit discipline:** conventional commits. No `.skip`, no `fixme`, no mocks of the system under test.
**Go/no-go gate at the end of each phase:** the founder confirms acceptance criteria before phase N+1 opens.

---

## Phase 1 — Schema, snapshot, queue, seed (est. 5–7 days)

### Scope
Everything that writes a weighted input and enqueues a recompute request. No Python math yet.

### Deliverables
1. **Migration 1 — legacy wipe** `20260424xxxxxx_wipe_debug_users.sql`
   - Deletes every row in `auth.users` on **prod only** except an explicit preserve-list (founder account + `test@example.com`). Cascades down.
   - Staging is kept as-is for now (it's a sandbox).
   - **Destructive — green-lighted once per K-2(a); re-confirmed verbally before run.**
2. **Migration 2 — demographic columns** on `user_private_political_profile`: `sex`, `csp`, `education` (all nullable). Check constraints per the architecture.
3. **Migration 3 — reference tables**: `survey_ref_marginal`, `survey_ref_cell`, `region_by_postal`. RLS + public read.
4. **Migration 4 — snapshot + weights + estimate**: 3 tables per §2.3–2.5 of the architecture, RLS, indexes, FKs.
5. **Migration 5 — pgmq queue + trigger**: `pgmq.create('weighting')`, `tg_enqueue_weighting()` trigger on snapshot insert.
6. **Migration 6 — modified `submit_post_poll_vote`** + 4 new helper functions (`derive_age_bucket`, `derive_region`, `derive_past_vote_pr1_2022`, `current_valid_reference_date`).
7. **Migration 7 — advisor fix (J-1)**: convert the 6 SECURITY DEFINER views to SECURITY INVOKER, re-verify underlying RLS. One view at a time, tested in isolation. Unblocks the advisor board.
8. **Seed script** `supabase/seed/weighting-ref.sql` + `scripts/seed-weighting-ref.py`:
   - Downloads INSEE RP 2022 national age×sex, region, CSP, education marginals (**verified against the actual CSV encoding and separator**, no assumption).
   - Downloads Ministère de l'Intérieur 2022 PR1 results.
   - Builds `region_by_postal` from geo.api.gouv.fr.
   - Emits SQL `insert` statements stamped with `as_of='2022-04-15'`.
9. **New frontend form controls** on `/me`: optional `sex`, `csp`, `education` pickers wired into `rpc_update_profile_demographics` (RPC extended). Nudge UX reuses `CompletionBanner`.
10. **Unit + integration tests** against local Supabase for all migrations and the extended RPC.

### Acceptance criteria (founder-verifiable)
- `supabase db reset` on a fresh local stack applies all 7 migrations green.
- A `curl` POST to `/api/polls/vote` after login produces:
  - 1 row in `post_poll_response`, 1 row in `survey_respondent_snapshot`, 1 message visible in `pgmq.q_weighting`.
- `select count(*) from auth.users` on prod matches the preserve-list exactly (e.g. 2).
- Supabase advisor: the 6 `security_definer_view` errors are cleared.
- `npm run verify` green.

### Risks → mitigations
- Wrong INSEE CSV parsing → **re-download and re-verify** the file before seed commit; checksum the file in the script.
- Converting `v_post_poll_summary` from definer→invoker breaks RLS → test the view against an anon session in integration suite.
- Legacy user wipe destroys something we wanted → **dry-run first** (`begin; delete…; select counts; rollback;`) + founder reviews the output.

### Rollback
Each migration has a down migration committed. For the legacy wipe: impossible to rollback user rows by design — the dry-run is our safety net.

---

## Phase 2 — Core math in Python (est. 5–7 days)

### Scope
The three math modules + their full test layers. No Supabase connection yet — pure functions, numpy/pandas arrays in, structured results out.

### Deliverables
1. `worker/pyproject.toml`, `worker/Dockerfile`, `worker/Makefile`, `worker/.gitignore`.
2. `worker/src/weighting/calibration.py` — `calibrate(respondents_df, targets, bounds=(0.5, 2.0)) → pd.Series[weight]`. Wraps `samplics.SampleWeight().calibrate()`.
3. `worker/src/weighting/score.py` — the 4 sub-scores + geometric-mean aggregate + band.
4. `worker/src/weighting/estimation.py` — weighted shares + normal-approximation 95% CI.
5. **Tests (all 5 layers enforced by `make verify`):**
   - Unit: 100% branch coverage on the three files above. Hand-calculable cases (n=10, known marginals).
   - Property: Hypothesis 200+ cases. Invariants: weights in `[0.5, 2.0]`, `sum(weights) ≈ n`, permutation-invariance, scale-invariance of shares.
   - Differential: our `calibrate()` output vs. a direct `samplics.SampleWeight()` call on the same fixture — byte-identical.
   - Golden: 10 frozen JSON scenarios via `pytest-regressions`. Hand-audited once, committed, any future drift blocks CI.
   - **External benchmark (K-5a):** one frozen INSEE or Pew published case with known calibrated output; we reproduce within ε = 1e-6.
6. `docs/weighting-score.md` with worked examples for each sub-score.

### Acceptance criteria
- `cd worker && make verify` exits 0 with all 5 layers green.
- Coverage report shows 100% branch coverage on calibration/score/estimation.
- The external benchmark test passes on first run (no tolerance massaging).
- `docs/weighting-score.md` includes a worked example the founder can replay on paper.

### Risks → mitigations
- samplics behaves unexpectedly → **document the divergence** in `docs/weighting-library-notes.md`, flag to founder, do NOT monkey-patch.
- Benchmark doesn't match → inspect INSEE's own methodology disclosure for parameter details; if irreconcilable, report and halt (this is why we validate external first).

### Rollback
Phase 2 ships pure Python — zero production impact. Rollback = don't merge.

---

## Phase 3 — Pipeline, worker, integration (est. 5–7 days)

### Scope
Wire Python to Supabase, run the full vote→snapshot→queue→estimate cycle locally.

### Deliverables
1. `worker/src/weighting/supabase_client.py` — httpx-based, service-role auth, typed via pydantic models.
2. `worker/src/weighting/snapshots.py`, `reference.py` — read modules.
3. `worker/src/weighting/pipeline.py` — orchestration for one poll_id.
4. `worker/src/weighting/worker.py` — main loop (pgmq read → dedupe 30s → pipeline → upsert → archive + dead-letter after 5 fails).
5. `pg_cron` migration (in main repo) — minute-tick job that enqueues `{poll_id, final:true}` for polls transitioning to closed.
6. **Integration tests** (`worker/tests/integration/`): local Supabase, `supabase db reset`, seed reference data, insert votes via RPC, start worker in-process, assert estimate row appears within 60s with plausible metrics.
7. Updated `v_post_poll_summary` migration with new columns + legacy mirror + SECURITY INVOKER.
8. Frontend type update (`lib/types/views.ts`): add `confidence_score`, `confidence_band`, `confidence_components`, `corrected_ci95`, `computed_with_ref_as_of`, `is_final`. Leave legacy fields. No UI changes yet.

### Acceptance criteria
- Local stack: seed 500 fake votes into a test poll, run worker once, observe:
  - 500 rows in `survey_poll_weights` with weights ∈ `[0.5, 2.0]`.
  - 1 row in `survey_poll_estimate` with `confidence_score` in a plausible band.
  - `v_post_poll_summary` row reflects the new columns.
- Integration test green, no mocks of Supabase.
- Worker gracefully handles: duplicate messages, missing snapshot (poll deleted), missing reference (pre-seed), network blip (retries).
- Dead-letter path exercised in an intentional-failure test.

### Risks → mitigations
- 30s debounce lets stale state be served briefly → acceptable; documented trade-off.
- Worker crash mid-computation → pgmq vt guarantees redelivery; upsert is idempotent.
- First real poll produces unexpected `confidence_score` → phase 4 benchmark step catches it before UI exposure.

### Rollback
Disable the trigger on `survey_respondent_snapshot` (one-line migration). The worker becomes a no-op. Frontend keeps showing raw via legacy column mirror.

---

## Phase 4 — Frontend, methodology page, v1 validation (est. 4–6 days)

### Scope
Public-facing wiring, methodology page, benchmark validation. Only phase where users see new behaviour.

### Deliverables
1. **Poll UI updates** in `components/poll/poll-results.tsx`:
   - Aggregate `confidence_score` + band badge.
   - `<details>` disclosure with the 4 sub-scores.
   - `corrected_results` rendering with 95% CI bars (only when `confidence_score ≥ 40`).
   - `<40` fallback: raw + "Résultat indicatif, échantillon insuffisant pour redressement fiable".
   - Footer line: `computed_with_ref_as_of` date + link to `/methodologie`.
2. **`/methodologie`** route (`app/methodologie/page.tsx`), French, AAPOR-aligned, **no claim of representativeness**, links to the GitHub technical docs.
3. **E2E spec** `tests/e2e/poll-weighting.spec.ts`: vote flow end-to-end, assert corrected numbers appear when `n` is sufficient (seeded via fixture).
4. **3 benchmark questions** run internally (founder reviews):
   - Self-reported turnout 2022 vs INSEE-published turnout → corrected should beat raw.
   - Self-reported PR1 2022 vote share vs Ministère de l'Intérieur → corrected should beat raw.
   - One question with known true answer (placeholder — founder picks).
5. Legacy column removal scheduled (not executed) — a `TODO` migration drafted for N+1 release.

### Acceptance criteria
- Staging smoke: founder votes on a seeded poll with 500 fake respondents, sees corrected + CI + score.
- `/methodologie` reads clean, factually correct, AAPOR-aligned.
- E2E spec green in CI.
- Benchmark results committed to `docs/weighting-v1-validation.md` — corrected distribution is **measurably closer to truth** than raw on at least 2 of the 3 cases.
- Supabase advisor: clean (J-1 complete from phase 1).

### Risks → mitigations
- Corrected numbers look worse than raw on a benchmark → **do not ship**. Investigate. May mean a bounds issue, a marginal issue, or the benchmark is a bad fit.
- User confusion on `<40` band → the copy is reviewed by founder before merge.

### Rollback
The `v_post_poll_summary` view keeps mirroring legacy columns, so the pre-phase-4 UI would still render if we revert only the poll-results component. A 1-PR revert removes the new UI without touching the pipeline.

---

## Post-v1 (not in this plan)

- Split worker into `politicoresto-weighting-worker` repo (F-1 later) + Railway deploy (F-2).
- Remove legacy mirror columns from `v_post_poll_summary`.
- Commission des Sondages registration decision (I-1 after release).
- v2 options: MRP for sub-national, additional marginals (diplôme, patrimoine), partial-vote-history weighting.
