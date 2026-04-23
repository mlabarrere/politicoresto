"""Unit tests — estimation.py."""

from __future__ import annotations

import numpy as np
import pytest

from weighting.estimation import Z95, estimate_shares


class TestEstimationBasics:
    def test_equal_weights_corrected_equals_raw(self) -> None:
        choices = ["A"] * 60 + ["B"] * 40
        w = np.ones(100)
        est = estimate_shares(choices, w, ["A", "B"])
        for o in est.options:
            assert o.raw_share == pytest.approx(o.corrected_share, abs=1e-9)

    def test_zero_option_appears_with_zero(self) -> None:
        est = estimate_shares(["A"] * 10, np.ones(10), ["A", "B", "C"])
        by_id = {o.option_id: o for o in est.options}
        assert by_id["B"].response_count == 0
        assert by_id["B"].raw_share == 0.0
        assert by_id["C"].response_count == 0

    def test_share_sum_to_unity(self) -> None:
        choices = ["A", "A", "B", "C", "C", "B", "A"]
        w = np.array([1.0, 2.0, 1.0, 1.5, 0.5, 1.0, 1.0])
        est = estimate_shares(choices, w, ["A", "B", "C"])
        s = sum(o.corrected_share for o in est.options)
        assert s == pytest.approx(1.0, abs=1e-9)

    def test_unequal_weights_shift_estimate(self) -> None:
        # 6 A-voters each weight 0.5, 4 B-voters each weight 2.0
        choices = ["A"] * 6 + ["B"] * 4
        w = np.concatenate([np.full(6, 0.5), np.full(4, 2.0)])
        est = estimate_shares(choices, w, ["A", "B"])
        by = {o.option_id: o for o in est.options}
        assert by["A"].raw_share == pytest.approx(0.6)
        assert by["A"].corrected_share == pytest.approx(3.0 / 11.0, abs=1e-9)
        assert by["B"].corrected_share == pytest.approx(8.0 / 11.0, abs=1e-9)


class TestEffectiveSizeAndDeff:
    def test_equal_weights_deff_one(self) -> None:
        est = estimate_shares(["A"] * 50 + ["B"] * 50, np.ones(100), ["A", "B"])
        assert est.n_effective == pytest.approx(100.0, abs=1e-9)
        assert est.deff == pytest.approx(1.0, abs=1e-9)

    def test_unequal_weights_deff_above_one(self) -> None:
        w = np.concatenate([np.full(50, 2.0), np.full(50, 0.5)])
        est = estimate_shares(["A"] * 100, w, ["A"])
        assert est.deff > 1.0


class TestConfidenceInterval:
    def test_ci_at_50_50_equal_weights(self) -> None:
        """Textbook: share=0.5, n=100, equal weights → ±1.96*sqrt(0.25/100) ≈ ±0.098."""
        est = estimate_shares(["A"] * 50 + ["B"] * 50, np.ones(100), ["A", "B"])
        a = next(o for o in est.options if o.option_id == "A")
        half = Z95 * np.sqrt(0.5 * 0.5 * 1.0 / 100)  # deff=1
        assert (a.corrected_share - a.ci95_low) == pytest.approx(half, rel=1e-9)
        assert (a.ci95_high - a.corrected_share) == pytest.approx(half, rel=1e-9)

    def test_ci_clips_at_zero_and_one(self) -> None:
        # All votes to A → share 1.0, CI clipped at [something, 1.0].
        est = estimate_shares(["A"] * 100, np.ones(100), ["A", "B"])
        a = next(o for o in est.options if o.option_id == "A")
        b = next(o for o in est.options if o.option_id == "B")
        assert a.ci95_high <= 1.0
        assert b.ci95_low >= 0.0

    def test_ci_widens_under_deff(self) -> None:
        # Balanced weights within each option so the corrected share stays 0.5
        # for both A and B — only deff differs between the two cases, so any
        # CI-width gap is attributable to the deff term alone.
        choices = ["A"] * 50 + ["B"] * 50
        eq_est = estimate_shares(choices, np.ones(100), ["A", "B"])
        # Unequal weights, but symmetric within each group: shares stay 0.5.
        uneq_w = np.tile([2.0, 0.5], 50)  # [2, .5, 2, .5, ...]
        uneq_est = estimate_shares(choices, uneq_w, ["A", "B"])
        eq_a = next(o for o in eq_est.options if o.option_id == "A")
        uneq_a = next(o for o in uneq_est.options if o.option_id == "A")
        assert eq_a.corrected_share == pytest.approx(uneq_a.corrected_share, abs=1e-9)
        assert (uneq_a.ci95_high - uneq_a.ci95_low) > (
            eq_a.ci95_high - eq_a.ci95_low
        )


class TestInputValidation:
    def test_empty_respondents_raises(self) -> None:
        with pytest.raises(ValueError, match="no respondents"):
            estimate_shares([], np.array([]), ["A"])

    def test_mismatched_lengths_raises(self) -> None:
        with pytest.raises(ValueError, match="same length"):
            estimate_shares(["A", "B"], np.array([1.0]), ["A", "B"])

    def test_zero_weights_raises(self) -> None:
        with pytest.raises(ValueError, match="weights sum"):
            estimate_shares(["A"], np.array([0.0]), ["A"])
