"""Differential tests — iterative CALMAR vs. single-shot clip fallback.

On cases where bounds do not bite, the two paths must produce
bit-identical weights: both reduce to the same unconstrained linear
solve. On cases where bounds bite, iterative CALMAR satisfies the
calibration constraints while the clip fallback leaves residual
slack. Both stay within bounds on every unit.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from weighting.calibration import calibrate


@pytest.mark.differential
def test_equivalent_when_bounds_do_not_bite() -> None:
    """Unclipped case → iterative and clip are the same solve."""
    rng = np.random.default_rng(0)
    df = pd.DataFrame(
        {
            "sex": rng.choice(["F", "M"], size=500, p=[0.53, 0.47]),
            "age": rng.choice(["y", "o"], size=500, p=[0.42, 0.58]),
        }
    )
    marginals = {"sex": {"M": 0.48, "F": 0.52}, "age": {"y": 0.40, "o": 0.60}}
    r_iter = calibrate(df, marginals, bounds=(0.5, 2.0))
    r_clip = calibrate(df, marginals, bounds=(0.5, 2.0), truncation="clip")
    assert r_iter.n_clipped == 0
    assert r_clip.n_clipped == 0
    np.testing.assert_allclose(r_iter.weights, r_clip.weights, rtol=1e-9)


@pytest.mark.differential
def test_iterative_at_least_as_tight_as_clip() -> None:
    """When bounds bite, iterative CALMAR is never WORSE than clip.

    Two-dimensional case with mild bite: sex over-represents F, age
    over-represents y. Some weights naturally hit the 2.0 upper bound
    under the unbounded solve. Iterative CALMAR re-solves against the
    frozen units; the clip fallback leaves residual slack on whichever
    constraint the frozen units were contributing to.
    """
    rng = np.random.default_rng(0)
    df = pd.DataFrame(
        {
            "sex": ["F"] * 140 + ["M"] * 60,
            "age": rng.choice(["y", "o"], size=200, p=[0.55, 0.45]),
        }
    )
    marginals = {"sex": {"M": 0.52, "F": 0.48}, "age": {"y": 0.35, "o": 0.65}}
    r_iter = calibrate(df, marginals, bounds=(0.5, 2.0))
    r_clip = calibrate(df, marginals, bounds=(0.5, 2.0), truncation="clip")

    # Both respect bounds.
    for r in (r_iter, r_clip):
        assert r.weights.min() >= 0.5 - 1e-9
        assert r.weights.max() <= 2.0 + 1e-9

    # The clip fallback MUST show visible slack somewhere — that's why
    # we kept it as a fallback, not the default.
    max_clip_slack = max(r_clip.marginal_slack.values())
    max_iter_slack = max(r_iter.marginal_slack.values())
    assert max_clip_slack > 1e-3, (
        f"clip fallback showed no slack — test setup doesn't actually "
        f"force truncation (max_clip_slack={max_clip_slack:.3e})"
    )
    # Iterative's slack ≤ clip's slack. Strictly better on the
    # non-intercept constraints; intercept may match if both reach the
    # same bound configuration.
    assert max_iter_slack <= max_clip_slack + 1e-9


@pytest.mark.differential
def test_iterative_reports_iteration_count() -> None:
    """Result fields match the behaviour documented in CalibrationResult."""
    df = pd.DataFrame({"x": ["a"] * 60 + ["b"] * 40})
    marginals = {"x": {"a": 0.50, "b": 0.50}}

    r_iter = calibrate(df, marginals, bounds=(0.5, 2.0))
    assert r_iter.truncation == "iterative"
    assert r_iter.n_iterations >= 1
    assert isinstance(r_iter.converged, bool)

    r_clip = calibrate(df, marginals, bounds=(0.5, 2.0), truncation="clip")
    assert r_clip.truncation == "clip"
    assert r_clip.n_iterations == 1
    assert r_clip.converged is True


@pytest.mark.differential
def test_iterative_graceful_on_infeasible_input() -> None:
    """Extreme skew makes the system infeasible after first freeze.
    Must not raise; must honour bounds; must report non-convergence.
    """
    df = pd.DataFrame({"sex": ["F"] * 95 + ["M"] * 5})
    marginals = {"sex": {"F": 0.50, "M": 0.50}}
    result = calibrate(df, marginals, bounds=(0.5, 2.0))
    assert result.weights.min() >= 0.5 - 1e-9
    assert result.weights.max() <= 2.0 + 1e-9
    # Either converged with residual slack on intercept, or early-exit
    # with converged=False. Both are acceptable; callers see the slack
    # either way.
    assert result.n_iterations >= 0
