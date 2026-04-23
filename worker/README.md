# PoliticoResto — Weighting Worker

Background service that reweights poll results using
**Deville-Särndal calibration** (JASA 1992) with linear-truncated
bounds (`[0.5, 2.0]`, INSEE CALMAR default). Implemented on top of
[`samplics`](https://github.com/samplics-org/samplics) — peer-reviewed
in JOSS 2021, validated against R's `survey` package.

During the local-first phase this folder lives inside the main
repository. It will be extracted into its own GitHub repo + Railway
deployment once the math layer proves out in production (see
`docs/weighting-phasing.md`).

## Layout

```
worker/
├── src/weighting/
│   ├── calibration.py   # Deville-Särndal wrapper with truncation.
│   ├── score.py         # 4 sub-scores + geometric-mean aggregate.
│   ├── estimation.py    # Weighted shares + normal-approx 95% CI.
│   └── __init__.py
├── tests/
│   ├── unit/            # Deterministic, hand-checkable (48 tests).
│   ├── property/        # Hypothesis-based invariants (~500 cases).
│   ├── differential/    # Our wrapper vs. raw samplics.
│   ├── golden/          # Frozen regressions via pytest-regressions.
│   └── external_benchmark/
│                        # R `survey::calibrate` on apistrat (stub
│                        # pending committed benchmark CSV).
├── pyproject.toml
└── Makefile
```

## Quickstart

```bash
# Install (Python 3.12 via uv).
make install

# Full gate: lint + typecheck + every test layer.
make verify

# One layer at a time:
make unit       # fastest
make property   # Hypothesis
make golden     # regression set
make external   # skipped until benchmark CSV is committed
```

## Methodology (short version)

For every poll we:

1. Read frozen respondent snapshots for that poll from
   `survey_respondent_snapshot`.
2. Read reference population shares at the snapshot's `as_of` date
   from `survey_ref_marginal` / `survey_ref_cell`.
3. Call `calibration.calibrate(respondents, marginals)`. Returns
   weights strictly in `[0.5, 2.0]` plus a per-constraint
   `marginal_slack` diagnostic.
4. Call `estimation.estimate_shares(...)` for raw + corrected shares
   + 95% CI (normal approximation, deff-inflated).
5. Call `score.compute_confidence(...)` — weighted geometric mean of
   four sub-scores in `[0, 1]`:

   | Component    | Weight | Formula                                    |
   | ------------ | ------ | ------------------------------------------ |
   | Kish         | 0.35   | `n_eff / (n_eff + 300)`                    |
   | Coverage     | 0.30   | `covered_share * sqrt(min_political_cov)`  |
   | Variability  | 0.20   | `1 / deff` where `deff = n / n_eff`        |
   | Concentration| 0.15   | `clip(1 - (top5 - 0.05) / 0.20, 0, 1)`     |

   Bands: `<40 indicatif` (hide corrected), `40..69 correctable`,
   `70..100 robuste`. Geometric mean is deliberately pessimistic:
   any collapsed component collapses the aggregate.

### Linear truncation

We implement the full **Deville-Särndal / CALMAR iterative linear-
truncated algorithm** (1992 paper + INSEE CALMAR 2 user manual):

1. Solve unbounded linear calibration on every unit.
2. Any unit whose g-ratio `w/w0` is outside the bounds is fixed at
   the boundary. Its contribution is subtracted from the target
   totals and the linear system is re-solved on the free subset.
3. Repeat until no newly violating unit appears (convergence) or
   `max_iter=50` is reached (hard cap; real inputs converge in ≤ 5).

This is what R's `survey::calibrate(..., bounds=…)` does. Our
wrapper reproduces R's output at **1e-6 relative parity across a 45-
scenario grid bank** — see `tests/external_benchmark/`. The bank
covers n from 15 to 3000, 1 to 3 calibration dimensions, skew from
none to severe, and bounds from loose `[0.05, 20]` to tight
`[0.5, 2]`. Drift above 1e-6 fails CI.

A cheaper single-shot `truncation="clip"` path is preserved as a
differential-test oracle but is never the default.

### CI

Two GitHub Actions workflows (see `.github/workflows/`):

- `worker-ci.yml` — runs on every PR touching `worker/**`. Steps:
  `uv sync` → ruff → mypy --strict → pytest all layers. Uses the
  committed R benchmark CSVs; no R install needed. Fast (~2 min).
- `worker-fixtures-refresh.yml` — weekly cron + manual dispatch.
  Installs R, regenerates all fixtures via the `scripts/*.R`, runs
  pytest against them, opens a PR if the committed CSVs drift.
  Stale-fixture drift becomes a reviewable artefact, not a silent
  gap.

## References

- Deville, J. C. & Särndal, C. E. (1992). "Calibration Estimators in
  Survey Sampling", *JASA* 87(418).
- Diallo, M. A. (2021). "samplics: a Python Package for Selecting,
  Weighting and Analyzing Data from Complex Sampling Designs",
  *JOSS* 6(68): 3376.
- Pew Research Center (2016). "Evaluating Online Nonprobability
  Surveys".
- INSEE CALMAR 2 technical documentation (French).
