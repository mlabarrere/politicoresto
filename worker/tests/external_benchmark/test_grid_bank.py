"""Parametrised grid bank — ~45 R-survey cross-check scenarios.

Every scenario listed in ``data/grid/index.yaml`` gets one pytest
invocation. Each scenario carries its respondent frame + R reference
weights in ``data/grid/<id>.csv`` and its Python marginal dict in the
YAML index. The assertion is uniform: our wrapper must reproduce R's
calibrated weights at ``rtol < 1e-6`` AND honour the requested bounds.

The bank is designed to cover the decision space the worker will meet
in production:

* ``n`` ∈ {20, 50, 100, 500, 1000, 2000}
* ``k_dims`` ∈ {1, 2, 3}
* skew from none to severe
* bounds tightness from ``[0.05, 20]`` to ``[0.5, 2]``
* edge cases: unknown bucket, near-collinear dimensions, bounds biting

Regenerate the bank with:

    Rscript worker/tests/external_benchmark/scripts/generate_grid_bank.R

The ``worker-fixtures-refresh`` GitHub Actions workflow does this on
a schedule and proposes a PR if R's output drifts from the committed
CSVs. CI itself uses the committed CSVs, no R install needed.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import yaml

from weighting.calibration import calibrate

GRID_DIR = Path(__file__).parent / "data" / "grid"
INDEX_PATH = GRID_DIR / "index.yaml"


@dataclass(frozen=True)
class Scenario:
    id: str
    notes: str
    bounds: tuple[float, float]
    marginals: dict[str, dict[str, float]]
    in_scope_mask: str | None  # filter expression for out-of-scope rows

    @property
    def csv_path(self) -> Path:
        return GRID_DIR / f"{self.id}.csv"


def _load_scenarios() -> list[Scenario]:
    if not INDEX_PATH.exists():
        return []
    raw = yaml.safe_load(INDEX_PATH.read_text())
    out: list[Scenario] = []
    for entry in raw["scenarios"]:
        bounds = tuple(float(x) for x in entry["bounds"])
        assert len(bounds) == 2
        # Preserve dict key order from YAML so reference-category-last
        # invariant is honoured (yaml.safe_load preserves insertion
        # order in Python ≥ 3.7).
        marginals = {
            dim: {cat: float(share) for cat, share in cats.items()}
            for dim, cats in entry["marginals"].items()
        }
        out.append(
            Scenario(
                id=entry["id"],
                notes=entry.get("notes", ""),
                bounds=(bounds[0], bounds[1]),
                marginals=marginals,
                in_scope_mask=entry.get("in_scope_mask"),
            )
        )
    return out


SCENARIOS = _load_scenarios()


def _scenario_ids(scenarios: list[Scenario]) -> list[str]:
    return [s.id for s in scenarios]


@pytest.mark.external_benchmark
@pytest.mark.skipif(
    not SCENARIOS,
    reason="Grid bank index not generated — run scripts/generate_grid_bank.R",
)
@pytest.mark.parametrize("scenario", SCENARIOS, ids=_scenario_ids(SCENARIOS))
def test_grid_bank_matches_r_survey(scenario: Scenario) -> None:
    df = pd.read_csv(scenario.csv_path)
    r_weights_all = df["r_weight"].to_numpy()

    # For the unknown-bucket scenario, rows outside the marginals
    # carry NaN on the R side (R was called on the in-scope subset
    # only). Our wrapper accepts them naturally — it assigns a neutral
    # weight. The parity comparison ignores those rows.
    in_scope = np.isfinite(r_weights_all)
    if scenario.in_scope_mask is not None:
        assert (~in_scope).any(), "in_scope_mask declared but no NaN rows found"

    respondents = df.drop(columns=["r_weight"])
    result = calibrate(respondents, scenario.marginals, bounds=scenario.bounds)

    # Bounds honoured.
    assert result.weights.min() >= scenario.bounds[0] - 1e-9, (
        f"{scenario.id}: lower bound violated"
    )
    assert result.weights.max() <= scenario.bounds[1] + 1e-9, (
        f"{scenario.id}: upper bound violated"
    )

    # Parity — restricted to in-scope rows.
    ours = result.weights[in_scope]
    ref = r_weights_all[in_scope]
    max_rel = float(np.max(np.abs(ours - ref) / np.maximum(np.abs(ref), 1e-9)))
    assert max_rel < 1e-6, (
        f"{scenario.id}: max relative weight diff vs R = {max_rel:.3e}\n"
        f"  notes: {scenario.notes}\n"
        f"  bounds: {scenario.bounds}\n"
        f"  n={len(ref)}, n_iter={result.n_iterations}, converged={result.converged}\n"
        f"  ours[:5]={ours[:5]}, ref[:5]={ref[:5]}"
    )


def test_grid_bank_index_is_non_trivial() -> None:
    """Safety net — if the index file accidentally empties, the grid-bank
    test above silently skips. This test catches that regression."""
    if not INDEX_PATH.exists():
        pytest.skip("grid bank not generated on this host")
    assert len(SCENARIOS) >= 20, (
        f"Grid bank index shrank to {len(SCENARIOS)} scenarios — regenerate."
    )
