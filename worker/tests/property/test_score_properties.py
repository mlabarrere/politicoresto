"""Property-based tests — confidence score invariants."""

from __future__ import annotations

import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from weighting.score import compute_confidence


@pytest.mark.property
@given(
    n=st.integers(min_value=1, max_value=5000),
    cov=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
    pc=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
)
@settings(max_examples=200, deadline=None)
def test_score_always_in_0_100(n: int, cov: float, pc: float) -> None:
    s, band, comp = compute_confidence(
        np.ones(n), covered_share=cov, min_political_coverage=pc
    )
    assert 0 <= s <= 100
    assert band in ("indicatif", "correctable", "robuste")
    for v in comp.as_dict().values():
        assert 0.0 <= v <= 1.0


@pytest.mark.property
@given(n=st.integers(min_value=100, max_value=10_000))
@settings(max_examples=50, deadline=None)
def test_score_monotonic_in_n(n: int) -> None:
    """Holding everything else constant, larger n → score non-decreasing."""
    s_small, _, _ = compute_confidence(
        np.ones(n), covered_share=1.0, min_political_coverage=1.0
    )
    s_large, _, _ = compute_confidence(
        np.ones(n + 500), covered_share=1.0, min_political_coverage=1.0
    )
    assert s_large >= s_small
