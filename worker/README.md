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

`samplics` exposes a `bounded` flag that it does not actually use.
Our wrapper implements the INSEE-standard clip: unbounded
calibration → clip `w/w0` to `[low, high]` → report how far marginal
constraints drift as `marginal_slack`. A full CALMAR-style iterative
truncation (fix out-of-bounds at the boundary, re-solve on the rest)
is deferred; it buys a bit of accuracy at significant algorithmic
complexity.

## References

- Deville, J. C. & Särndal, C. E. (1992). "Calibration Estimators in
  Survey Sampling", *JASA* 87(418).
- Diallo, M. A. (2021). "samplics: a Python Package for Selecting,
  Weighting and Analyzing Data from Complex Sampling Designs",
  *JOSS* 6(68): 3376.
- Pew Research Center (2016). "Evaluating Online Nonprobability
  Surveys".
- INSEE CALMAR 2 technical documentation (French).
