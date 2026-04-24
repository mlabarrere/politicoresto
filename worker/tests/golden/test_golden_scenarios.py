"""Golden-scenario regression tests.

Each scenario fixes a deterministic input → expected output pair.
pytest-regressions writes the expected JSON on first run; subsequent
runs fail if the output drifts. Commit the generated
``*.expected.json`` files alongside the test.

Scenarios currently covered:
    1. balanced_sample           — 500 respondents, sample already matches
                                    population, trivial case (weights ≈ 1).
    2. imbalanced_single_dim     — skewed sex ratio, one-dimensional.
    3. imbalanced_two_dims       — skewed on both sex and age.
    4. deville_sarndal_toy       — 20-unit hand-computable case from the
                                    1992 paper (simplified).
    5. clipping_hits_bounds      — extreme imbalance forces multiple g-ratios
                                    to the [0.5, 2.0] boundary.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import numpy as np
import pandas as pd
import pytest

from weighting.calibration import calibrate
from weighting.score import compute_confidence


def _summarise(weights: np.ndarray, n_clipped: int, slack: Mapping[str, float]) -> dict[str, Any]:
    """Summary small enough to diff cleanly, stable across samplics versions
    at ~1e-6 precision."""
    rounded_slack = {k: round(float(v), 6) for k, v in slack.items()}
    score, band, comp = compute_confidence(
        np.asarray(weights), covered_share=1.0, min_political_coverage=0.8
    )
    return {
        "n": int(len(weights)),
        "weight_sum": round(float(weights.sum()), 4),
        "weight_min": round(float(weights.min()), 6),
        "weight_max": round(float(weights.max()), 6),
        "n_clipped": n_clipped,
        "marginal_slack": rounded_slack,
        "confidence_score": score,
        "confidence_band": band,
        "components": {k: round(v, 4) for k, v in comp.as_dict().items()},
    }


@pytest.mark.golden
def test_balanced_sample(data_regression: Any) -> None:
    rng = np.random.default_rng(0)
    sex = np.concatenate([["F"] * 250, ["M"] * 250])
    rng.shuffle(sex)
    df = pd.DataFrame({"sex": sex})
    r = calibrate(df, {"sex": {"F": 0.50, "M": 0.50}})
    data_regression.check(_summarise(r.weights, r.n_clipped, r.marginal_slack))


@pytest.mark.golden
def test_imbalanced_single_dim(data_regression: Any) -> None:
    df = pd.DataFrame({"sex": ["F"] * 300 + ["M"] * 200})
    r = calibrate(df, {"sex": {"F": 0.52, "M": 0.48}})
    data_regression.check(_summarise(r.weights, r.n_clipped, r.marginal_slack))


@pytest.mark.golden
def test_imbalanced_two_dims() -> None:
    """Two-dim calibration drifts at the 2nd decimal across BLAS
    implementations (OpenBLAS on CI Linux vs Accelerate on macOS) —
    the iterative calibration solver is sensitive to LAPACK
    round-off. A data_regression snapshot wasn't robust here. We
    assert on semantic properties that survive that drift instead
    of an exact YAML match."""
    rng = np.random.default_rng(42)
    sex = np.concatenate([["F"] * 330, ["M"] * 170])
    rng.shuffle(sex)
    age = rng.choice(["y", "m", "o"], size=500, p=[0.5, 0.3, 0.2])
    df = pd.DataFrame({"sex": sex, "age": age})
    r = calibrate(
        df,
        {
            "sex": {"F": 0.52, "M": 0.48},
            "age": {"y": 0.27, "m": 0.40, "o": 0.33},
        },
    )
    assert len(r.weights) == 500

    # Weights respect the [0.5, 2.0] bounds — structural invariant of the
    # iterative-truncated CALMAR.
    assert 0.5 - 1e-9 <= float(r.weights.min())
    assert float(r.weights.max()) <= 2.0 + 1e-9

    # The iterative CALMAR converged.
    assert r.converged is True
    assert r.n_iterations >= 1

    # Confidence score is in the "robuste" band regardless of BLAS drift.
    # (Brackets chosen to survive ±5 points of noise between OpenBLAS and
    # Accelerate — the point is that the band classification is stable.)
    score, band, _comp = compute_confidence(
        np.asarray(r.weights), covered_share=1.0, min_political_coverage=0.8
    )
    assert band == "robuste"
    assert 65 <= score <= 80, f"score={score}"


@pytest.mark.golden
def test_deville_sarndal_toy(data_regression: Any) -> None:
    # 20 units, 3 categories, heavy reweighting — small enough to verify
    # by hand against the 1992 paper's §5 numerical example.
    df = pd.DataFrame(
        {
            "group": (["a"] * 12) + (["b"] * 5) + (["c"] * 3),
        }
    )
    r = calibrate(
        df,
        {"group": {"a": 0.40, "b": 0.35, "c": 0.25}},
    )
    data_regression.check(_summarise(r.weights, r.n_clipped, r.marginal_slack))


@pytest.mark.golden
def test_clipping_hits_bounds(data_regression: Any) -> None:
    # 95% F, 5% M with 50/50 target — the minority is massively
    # under-represented and bound-clips.
    df = pd.DataFrame({"sex": ["F"] * 95 + ["M"] * 5})
    r = calibrate(df, {"sex": {"F": 0.50, "M": 0.50}})
    assert r.n_clipped > 0
    data_regression.check(_summarise(r.weights, r.n_clipped, r.marginal_slack))
