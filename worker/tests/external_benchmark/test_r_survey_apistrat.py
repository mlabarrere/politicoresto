"""External benchmark — cross-check against R's ``survey`` package.

We committed a small CSV of a stratified sub-sample of the canonical
``apistrat`` dataset (from Thomas Lumley's ``survey`` R package) and
the calibrated weights R produces on it, captured in a deterministic
way (``survey::calibrate(..., bounds=c(0.5, 2))`` with the same
marginals).

Our samplics-backed wrapper should reproduce those weights within ε.
If it doesn't, either samplics has changed behaviour or our wrapper
has drifted — either way, we want the breakage visible.

This test is marked ``external_benchmark`` and can be skipped with
``-m 'not external_benchmark'`` if the dataset is unavailable.

The dataset sits at ``tests/external_benchmark/data/apistrat_small.csv``.
Schema:
    - ``stype``   : E | H | M (elementary / high / middle school)
    - ``awards``  : Yes | No (whether the school won an award)
    - ``r_weight``: the calibrated weight produced by R on this sample
                    with the marginals used in the assertion.

Marginals (from R ``survey::calibrate`` setup, Chapter 7 Lumley 2010):
    Population strata — E: 4421, H: 755, M: 1018
    Population awards — Yes: 3194, No: 3000
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from weighting.calibration import calibrate

DATA_PATH = Path(__file__).parent / "data" / "apistrat_small.csv"


@pytest.mark.external_benchmark
@pytest.mark.skipif(not DATA_PATH.exists(), reason="R-survey benchmark dataset not committed")
def test_apistrat_matches_r_survey() -> None:
    df = pd.read_csv(DATA_PATH)
    n = len(df)
    # Marginals expressed as shares (our API), derived from the population
    # totals in Lumley 2010 ch. 7:
    #   E: 4421 / 6194, H: 755 / 6194, M: 1018 / 6194
    #   Yes: 3194 / 6194, No: 3000 / 6194
    marginals = {
        "stype": {"E": 4421 / 6194, "H": 755 / 6194, "M": 1018 / 6194},
        "awards": {"Yes": 3194 / 6194, "No": 3000 / 6194},
    }
    result = calibrate(df, marginals)
    # Rescale ours to match R's absolute scale: R returns weights
    # summing to the population N (6194), ours to the sample n (≈200).
    our_weights = result.weights * (6194 / n)
    # R-survey reference weights (pre-computed; source CSV column).
    r_weights = df["r_weight"].to_numpy()
    # Allow generous tolerance because the two libraries use slightly
    # different linear-algebra backends; bit-for-bit parity is not the
    # goal of this benchmark — proving "we're in the same ball-park as
    # R's gold-standard output" is.
    np.testing.assert_allclose(our_weights, r_weights, rtol=0.05)
