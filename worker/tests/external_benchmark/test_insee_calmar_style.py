"""INSEE CALMAR-style 4-dimensional calibration.

French-demographic flavoured fixture: age × sex × region × CSP,
n=1200, bounds [0.25, 4]. The sample over-represents F, 35-64, and
Île-de-France; R's ``survey::calibrate`` produces the reference
weights.

This is the most realistic scenario we benchmark against: four
simultaneous marginals is what the production PoliticoResto pipeline
will face when calibrating on INSEE RP marginals. Passing at 1e-6
here is the single strongest signal that our iterative CALMAR
implementation matches the international standard end-to-end.

NOTE on naming: the fixture is INSEE-*styled* (it mirrors the kind of
calibration INSEE's CALMAR does) but does NOT reproduce the exact
numerical example published in the CALMAR 2 user manual (Sautory,
INSEE). That would require access to the manual's PDF and is tracked
as future work in ``docs/weighting-risks.md``.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from weighting.calibration import calibrate

FIXTURE = Path(__file__).parent / "data" / "insee_calmar_style_4d.csv"


@pytest.mark.external_benchmark
@pytest.mark.skipif(
    not FIXTURE.exists(),
    reason="Run scripts/generate_insee_calmar.R to produce this fixture",
)
def test_insee_calmar_style_4d_matches_r_survey() -> None:
    df = pd.read_csv(FIXTURE)

    # Marginals ordered so R's reference category (first alphabetical)
    # lands LAST in the Python dict — same constrained system on both
    # sides.
    marginals = {
        # Reference: a18_34 (alpha-first). Python drops last.
        "age": {
            "a35_64": 0.50,
            "a65p": 0.25,
            "a18_34": 0.25,
        },
        # Reference: F (alpha-first).
        "sex": {
            "M": 0.48,
            "F": 0.52,
        },
        # Reference: est (alpha-first).
        "region": {
            "ile_de_france": 0.18,
            "nord": 0.15,
            "ouest": 0.18,
            "sud_est": 0.20,
            "sud_ouest": 0.15,
            "est": 0.14,
        },
        # Reference: cadres (alpha-first).
        "csp": {
            "employes": 0.30,
            "intermediaires": 0.20,
            "ouvriers": 0.10,
            "retraites": 0.20,
            "cadres": 0.20,
        },
    }

    respondents = df.drop(columns=["r_weight"])
    result = calibrate(respondents, marginals, bounds=(0.25, 4.0))

    # Bounds honoured.
    assert result.weights.min() >= 0.25 - 1e-9
    assert result.weights.max() <= 4.0 + 1e-9

    # Bit-close parity with R.
    r_weights = df["r_weight"].to_numpy()
    max_rel = float(np.max(np.abs(result.weights - r_weights) / np.maximum(np.abs(r_weights), 1e-9)))
    assert max_rel < 1e-6, (
        f"INSEE-style 4D: max relative weight diff vs R = {max_rel:.3e}\n"
        f"  n={len(r_weights)}, n_iter={result.n_iterations}, converged={result.converged}\n"
        f"  Python ours[:3]={result.weights[:3]}\n"
        f"  R        ref[:3]={r_weights[:3]}"
    )

    # All four marginals achieved within the same budget as unit tests.
    for dim, shares in marginals.items():
        for category, target in shares.items():
            mask = respondents[dim].to_numpy() == category
            achieved = float(result.weights[mask].sum() / result.weights.sum())
            assert abs(achieved - target) < 1e-6, (
                f"INSEE-style 4D: {dim}={category} achieved {achieved:.6f} "
                f"vs target {target:.6f}"
            )
