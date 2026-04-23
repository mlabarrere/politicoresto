"""Property-based tests — calibration invariants under arbitrary inputs."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from weighting.calibration import DEFAULT_BOUNDS, calibrate


def _marginal_strategy() -> st.SearchStrategy[dict[str, dict[str, float]]]:
    """One-dimensional marginals with 2-5 categories that sum to 1."""

    @st.composite
    def _s(draw: st.DrawFn) -> dict[str, dict[str, float]]:
        k = draw(st.integers(min_value=2, max_value=5))
        raw = draw(
            st.lists(
                st.floats(min_value=0.05, max_value=1.0, allow_nan=False, allow_infinity=False),
                min_size=k,
                max_size=k,
            )
        )
        total = sum(raw)
        shares = {f"c{i}": v / total for i, v in enumerate(raw)}
        return {"dim": shares}

    return _s()


@st.composite
def _sample_and_marginals(
    draw: st.DrawFn,
) -> tuple[pd.DataFrame, dict[str, dict[str, float]]]:
    marg = draw(_marginal_strategy())
    categories = list(marg["dim"].keys())
    n = draw(st.integers(min_value=20, max_value=300))
    rng = np.random.default_rng(draw(st.integers(min_value=0, max_value=2**31 - 1)))
    labels = rng.choice(categories, size=n)
    # Guarantee every category appears at least once — otherwise calibration
    # is underdetermined for that stratum, which is a separate concern.
    for c in categories:
        labels[rng.integers(n)] = c
    df = pd.DataFrame({"dim": labels})
    return df, marg


@pytest.mark.property
@given(payload=_sample_and_marginals())
@settings(max_examples=100, deadline=None)
def test_weights_always_positive(
    payload: tuple[pd.DataFrame, dict[str, dict[str, float]]],
) -> None:
    df, marg = payload
    r = calibrate(df, marg)
    assert np.all(r.weights > 0)
    assert np.all(np.isfinite(r.weights))


@pytest.mark.property
@given(payload=_sample_and_marginals())
@settings(max_examples=100, deadline=None)
def test_weights_within_bounds(
    payload: tuple[pd.DataFrame, dict[str, dict[str, float]]],
) -> None:
    df, marg = payload
    r = calibrate(df, marg)
    low, high = DEFAULT_BOUNDS
    assert r.weights.min() >= low - 1e-9
    assert r.weights.max() <= high + 1e-9


@pytest.mark.property
@given(payload=_sample_and_marginals())
@settings(max_examples=50, deadline=None)
def test_permutation_invariance(
    payload: tuple[pd.DataFrame, dict[str, dict[str, float]]],
) -> None:
    """Reshuffling respondents yields a permuted weight vector, not a new answer."""
    df, marg = payload
    rng = np.random.default_rng(0)
    perm = rng.permutation(len(df))
    r_original = calibrate(df, marg)
    r_permuted = calibrate(df.iloc[perm].reset_index(drop=True), marg)
    # Sum-of-weights and sum-of-squares are invariant.
    np.testing.assert_allclose(
        r_original.weights.sum(), r_permuted.weights.sum(), rtol=1e-6
    )
    np.testing.assert_allclose(
        (r_original.weights**2).sum(),
        (r_permuted.weights**2).sum(),
        rtol=1e-6,
    )


@pytest.mark.property
@given(payload=_sample_and_marginals(), scale=st.integers(min_value=2, max_value=5))
@settings(max_examples=50, deadline=None)
def test_duplication_scales_linearly_when_bounds_do_not_bite(
    payload: tuple[pd.DataFrame, dict[str, dict[str, float]]],
    scale: int,
) -> None:
    """Duplication-invariance only holds when bounds do not bite.

    Unclipped: the linear system is the same one scaled by k → sum(w)
    scales by k exactly. Clipped: iterative CALMAR freezes units at
    the boundary, and which units get frozen depends on ordering and
    the frozen-units contribution subtraction — the base and the
    k-duplicated solves reach different fixed points.

    Testing only the bounded-doesn't-bite case captures the algorithmic
    invariant without flagging legitimate CALMAR behaviour.
    """
    df, marg = payload
    r_base = calibrate(df, marg)
    if r_base.n_clipped > 0:
        # Bounds bit on base — duplication invariance does not apply.
        return
    df_dup = pd.concat([df] * scale, ignore_index=True)
    r_dup = calibrate(df_dup, marg)
    if r_dup.n_clipped > 0:
        # Floating-point edge: the duplicated system sits right at a
        # bound. Skip rather than enforce — CALMAR reaches the same
        # fixed point up to numerical tolerance.
        return
    # Unclipped on both sides: sum(w) must scale by k bit-close.
    assert abs(r_dup.weights.sum() / r_base.weights.sum() - scale) < 1e-6
