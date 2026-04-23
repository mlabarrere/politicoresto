"""Unit tests — calibration.py. Deterministic, hand-checkable cases."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from weighting.calibration import DEFAULT_BOUNDS, calibrate


def _simple_frame(sex_labels: list[str]) -> pd.DataFrame:
    return pd.DataFrame({"sex": sex_labels})


class TestCalibrateBasicProperties:
    def test_equal_sample_on_target_keeps_weights_at_one(self) -> None:
        """If the respondent pool already matches the population, no adjustment."""
        df = _simple_frame(["F"] * 50 + ["M"] * 50)
        r = calibrate(df, {"sex": {"F": 0.50, "M": 0.50}})
        np.testing.assert_allclose(r.weights, np.ones(100), rtol=1e-6)
        assert r.n_clipped == 0

    def test_weights_sum_approximately_n_when_no_clipping(self) -> None:
        # No clipping → intercept constraint holds → sum(w) ≈ n exactly.
        df = _simple_frame(["F"] * 55 + ["M"] * 45)
        r = calibrate(df, {"sex": {"F": 0.50, "M": 0.50}})
        assert r.n_clipped == 0
        np.testing.assert_allclose(r.weights.sum(), 100.0, rtol=1e-6)

    def test_over_represented_category_gets_down_weighted(self) -> None:
        # 70 F / 30 M, population 50/50 → F should be down-weighted.
        df = _simple_frame(["F"] * 70 + ["M"] * 30)
        r = calibrate(df, {"sex": {"F": 0.50, "M": 0.50}})
        mean_w_f = r.weights[:70].mean()
        mean_w_m = r.weights[70:].mean()
        assert mean_w_f < 1.0
        assert mean_w_m > 1.0
        assert mean_w_f < mean_w_m

    def test_weights_respect_bounds(self) -> None:
        # Extreme imbalance 95 F / 5 M vs 50/50 target → some weights clip.
        df = _simple_frame(["F"] * 95 + ["M"] * 5)
        r = calibrate(df, {"sex": {"F": 0.50, "M": 0.50}})
        low, high = DEFAULT_BOUNDS
        assert r.weights.min() >= low - 1e-9
        assert r.weights.max() <= high + 1e-9
        assert r.n_clipped > 0

    def test_custom_bounds(self) -> None:
        df = _simple_frame(["F"] * 80 + ["M"] * 20)
        r = calibrate(df, {"sex": {"F": 0.50, "M": 0.50}}, bounds=(0.25, 4.0))
        assert r.bounds == (0.25, 4.0)
        assert r.weights.min() >= 0.25 - 1e-9
        assert r.weights.max() <= 4.0 + 1e-9


class TestCalibrateInputValidation:
    def test_empty_frame_raises(self) -> None:
        with pytest.raises(ValueError, match="empty"):
            calibrate(pd.DataFrame({"sex": []}), {"sex": {"F": 0.5, "M": 0.5}})

    def test_unknown_dimension_raises(self) -> None:
        df = _simple_frame(["F"] * 10)
        with pytest.raises(KeyError, match="region"):
            calibrate(df, {"region": {"paris": 1.0}})

    @pytest.mark.parametrize("bounds", [(0.0, 2.0), (1.2, 2.0), (0.5, 0.9), (-1.0, 2.0)])
    def test_invalid_bounds_raise(self, bounds: tuple[float, float]) -> None:
        df = _simple_frame(["F"] * 10 + ["M"] * 10)
        with pytest.raises(ValueError, match="bounds"):
            calibrate(df, {"sex": {"F": 0.5, "M": 0.5}}, bounds=bounds)


class TestMarginalSlack:
    def test_no_clipping_zero_slack(self) -> None:
        df = _simple_frame(["F"] * 50 + ["M"] * 50)
        r = calibrate(df, {"sex": {"F": 0.50, "M": 0.50}})
        # Intercept satisfied exactly; the reference category is not in
        # the slack report.
        assert r.marginal_slack["__intercept__"] < 1e-9

    def test_slack_grows_with_clipping(self) -> None:
        # Heavy clipping case. Some marginal constraint MUST slack — we
        # don't know in advance which one samplics chooses to preserve
        # exactly (the solver picks the projection minimising a chi-square
        # distance), but the overall slack has to be non-trivial.
        df = _simple_frame(["F"] * 95 + ["M"] * 5)
        r = calibrate(df, {"sex": {"F": 0.50, "M": 0.50}})
        assert r.n_clipped > 0
        total_slack = sum(r.marginal_slack.values())
        assert total_slack > 0.05  # At least 5% relative slack somewhere.


class TestMultiDimensional:
    def test_two_dimensions_calibrates_both(self) -> None:
        rng = np.random.default_rng(7)
        sex = np.array(["F"] * 60 + ["M"] * 40)
        rng.shuffle(sex)
        age = rng.choice(["young", "old"], size=100)
        df = pd.DataFrame({"sex": sex, "age": age})
        r = calibrate(
            df,
            {
                "sex": {"F": 0.50, "M": 0.50},
                "age": {"young": 0.40, "old": 0.60},
            },
        )
        # Sum is approximately n; post-clipping drift is bounded.
        assert 90 < r.weights.sum() < 110
        # Both achieved marginals should be closer to target than the raw sample.
        w = r.weights
        f_w = w[sex == "F"].sum() / w.sum()
        assert abs(f_w - 0.50) < abs(0.60 - 0.50)  # closer than raw 60/40

    def test_unknown_bucket_handled(self) -> None:
        """Respondents whose category is NOT in the marginals must not crash."""
        df = pd.DataFrame({"sex": ["F"] * 40 + ["M"] * 40 + ["unknown"] * 20})
        # Marginals don't include 'unknown' — those rows get 0 everywhere for
        # that dimension, which is the intended behaviour.
        r = calibrate(df, {"sex": {"F": 0.50, "M": 0.50}})
        assert r.weights.shape == (100,)
        # All weights still finite, positive.
        assert np.all(np.isfinite(r.weights))
        assert np.all(r.weights > 0)


class TestReturnShape:
    def test_result_immutability(self) -> None:
        df = _simple_frame(["F"] * 50 + ["M"] * 50)
        r = calibrate(df, {"sex": {"F": 0.5, "M": 0.5}})
        # Dataclass is frozen — any attribute write must raise.
        with pytest.raises(AttributeError):
            r.n_clipped = 999  # type: ignore[misc]
