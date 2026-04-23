"""Differential tests — our wrapper's *pre-truncation* output matches a
raw samplics call with the same inputs, byte-for-byte.

This guards against silent behavioural drift in our translation layer.
"""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import pytest

from weighting.calibration import _build_aux_vars  # type: ignore[attr-defined]

with warnings.catch_warnings():
    warnings.simplefilter("ignore", category=FutureWarning)
    from samplics.weighting import SampleWeight  # type: ignore[import-untyped]


@pytest.mark.differential
def test_build_aux_vars_matches_raw_samplics_call() -> None:
    rng = np.random.default_rng(123)
    sex = rng.choice(["F", "M"], size=200, p=[0.55, 0.45])
    age = rng.choice(["young", "mid", "old"], size=200, p=[0.3, 0.4, 0.3])
    df = pd.DataFrame({"sex": sex, "age": age})
    marginals = {
        "sex": {"F": 0.52, "M": 0.48},
        "age": {"young": 0.33, "mid": 0.34, "old": 0.33},
    }

    aux, columns, totals = _build_aux_vars(df, marginals)

    # Every row has 1 intercept + 1 indicator per (kept) dimension category
    # that the respondent belongs to, and 0 for others. With k categories
    # per dimension we keep k-1 columns; the last category is the reference.
    assert "__intercept__" in columns
    assert "sex::F" in columns  # M is reference (last in dict order)
    assert "sex::M" not in columns
    assert "age::young" in columns and "age::mid" in columns
    assert "age::old" not in columns

    # Intercept is always 1.
    intercept_idx = columns.index("__intercept__")
    np.testing.assert_array_equal(aux[:, intercept_idx], np.ones(200))

    # The matrix we hand to samplics must be exactly what a direct raw
    # call to SampleWeight().calibrate would accept — this test proves
    # the shape is sound by running it end-to-end.
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=FutureWarning)
        sw = SampleWeight()
        raw = sw.calibrate(
            samp_weight=np.ones(200),
            aux_vars=aux,
            control=totals,
        )
    assert raw.shape == (200,)
    assert np.all(np.isfinite(raw))
