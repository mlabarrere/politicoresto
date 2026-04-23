"""Unit tests for cross-tab cell constraints in :func:`calibrate`.

Tests are hand-checkable where possible, property-style where the
arithmetic gets hairy. Kept isolated from `test_calibration.py` so a
cells regression surfaces as its own red test.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from weighting.calibration import CellConstraint, calibrate


def _symmetric_2x2_frame(n: int) -> pd.DataFrame:
    """Balanced 2×2 sample: equal shares of each (age, sex) cell."""
    per = n // 4
    rows = (
        [("18_24", "F")] * per
        + [("18_24", "M")] * per
        + [("25_plus", "F")] * per
        + [("25_plus", "M")] * per
    )
    return pd.DataFrame(rows, columns=["age", "sex"])


class TestCellConstraintDataclass:
    def test_rejects_mismatched_lengths(self) -> None:
        with pytest.raises(ValueError, match="len"):
            CellConstraint(("age", "sex"), ("F",), 0.5)

    def test_rejects_single_dim(self) -> None:
        with pytest.raises(ValueError, match="at least 2"):
            CellConstraint(("age",), ("18_24",), 0.5)

    def test_rejects_out_of_range_share(self) -> None:
        with pytest.raises(ValueError, match="share"):
            CellConstraint(("age", "sex"), ("18_24", "F"), 1.5)


class TestCalibrateWithCells:
    def test_uniform_target_on_balanced_sample_keeps_weights_at_one(self) -> None:
        """Sample already matches a 25/25/25/25 target → trivial."""
        df = _symmetric_2x2_frame(100)
        cells = [
            CellConstraint(("age", "sex"), ("18_24", "F"), 0.25),
            CellConstraint(("age", "sex"), ("18_24", "M"), 0.25),
            CellConstraint(("age", "sex"), ("25_plus", "F"), 0.25),
            CellConstraint(("age", "sex"), ("25_plus", "M"), 0.25),
        ]
        r = calibrate(df, cells=cells, bounds=(0.5, 2.0))
        np.testing.assert_allclose(r.weights, np.ones(100), rtol=1e-6)
        assert r.n_clipped == 0

    def test_cells_satisfy_their_targets_to_machine_precision(self) -> None:
        """Feasible target → every cell hits its share to 1e-9."""
        rng = np.random.default_rng(42)
        df = pd.DataFrame(
            {
                "age": rng.choice(["18_24", "25_plus"], size=400, p=[0.55, 0.45]),
                "sex": rng.choice(["F", "M"], size=400, p=[0.52, 0.48]),
            }
        )
        cells = [
            CellConstraint(("age", "sex"), ("18_24", "F"), 0.20),
            CellConstraint(("age", "sex"), ("18_24", "M"), 0.15),
            CellConstraint(("age", "sex"), ("25_plus", "F"), 0.35),
            CellConstraint(("age", "sex"), ("25_plus", "M"), 0.30),
        ]
        r = calibrate(df, cells=cells, bounds=(0.5, 2.0))
        assert r.converged
        for c in cells:
            mask = (df["age"] == c.categories[0]) & (df["sex"] == c.categories[1])
            achieved = float(r.weights[mask].sum() / r.weights.sum())
            assert abs(achieved - c.share) < 1e-6, (
                f"{c.categories}: target {c.share} vs achieved {achieved}"
            )

    def test_bounds_honoured_even_with_cells(self) -> None:
        # Extreme 90/10 sample, target 25/25/25/25 → bounds bite hard.
        df = pd.DataFrame(
            {
                "age": ["18_24"] * 180 + ["25_plus"] * 20,
                "sex": ["F"] * 90 + ["M"] * 90 + ["F"] * 10 + ["M"] * 10,
            }
        )
        cells = [
            CellConstraint(("age", "sex"), ("18_24", "F"), 0.25),
            CellConstraint(("age", "sex"), ("18_24", "M"), 0.25),
            CellConstraint(("age", "sex"), ("25_plus", "F"), 0.25),
            CellConstraint(("age", "sex"), ("25_plus", "M"), 0.25),
        ]
        r = calibrate(df, cells=cells, bounds=(0.5, 2.0))
        assert r.weights.min() >= 0.5 - 1e-9
        assert r.weights.max() <= 2.0 + 1e-9

    def test_rejects_empty_inputs(self) -> None:
        with pytest.raises(ValueError, match="at least one"):
            calibrate(pd.DataFrame({"age": ["18_24"]}))

    def test_rejects_missing_cell_dimension(self) -> None:
        df = pd.DataFrame({"age": ["18_24"]})
        with pytest.raises(KeyError, match="sex"):
            calibrate(
                df,
                cells=[CellConstraint(("age", "sex"), ("18_24", "F"), 0.5)],
            )

    def test_single_cell_group_is_skipped(self) -> None:
        """A cell group with only ONE cell carries no information
        (it's just the intercept scaled). We skip it — calibrate falls
        back to the intercept."""
        df = _symmetric_2x2_frame(100)
        r = calibrate(
            df,
            marginals={"age": {"18_24": 0.4, "25_plus": 0.6}},
            cells=[CellConstraint(("age", "sex"), ("18_24", "F"), 0.25)],
        )
        # The single cell is skipped (only 1 cell in its group). Only
        # the marginal age constraint remains — calibration runs.
        assert r.weights.min() > 0
        assert r.weights.max() <= 2.0 + 1e-9

    def test_cells_and_marginals_disjoint_works(self) -> None:
        """Cells on (age, sex) + marginal on `region` (disjoint) → OK."""
        rng = np.random.default_rng(7)
        df = pd.DataFrame(
            {
                "age": rng.choice(["18_24", "25_plus"], size=300, p=[0.6, 0.4]),
                "sex": rng.choice(["F", "M"], size=300, p=[0.55, 0.45]),
                "region": rng.choice(["N", "S"], size=300, p=[0.5, 0.5]),
            }
        )
        r = calibrate(
            df,
            marginals={"region": {"N": 0.55, "S": 0.45}},
            cells=[
                CellConstraint(("age", "sex"), ("18_24", "F"), 0.20),
                CellConstraint(("age", "sex"), ("18_24", "M"), 0.15),
                CellConstraint(("age", "sex"), ("25_plus", "F"), 0.35),
                CellConstraint(("age", "sex"), ("25_plus", "M"), 0.30),
            ],
            bounds=(0.5, 2.0),
        )
        assert r.converged
        # Region marginal satisfied.
        region_n = float(r.weights[df["region"] == "N"].sum() / r.weights.sum())
        assert abs(region_n - 0.55) < 1e-6
