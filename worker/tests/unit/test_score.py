"""Unit tests — score.py. Every branch + hand-computable cases."""

from __future__ import annotations

import numpy as np
import pytest

from weighting.score import (
    KISH_HALF,
    W_CONCENTRATION,
    W_COVERAGE,
    W_KISH,
    W_VARIABILITY,
    compute_confidence,
)


def test_weights_sum_to_unity() -> None:
    """The four sub-score weights MUST sum to 1 — any drift is a bug."""
    total = W_KISH + W_COVERAGE + W_VARIABILITY + W_CONCENTRATION
    assert total == pytest.approx(1.0)


class TestKishScore:
    def test_equal_weights_gives_n_eff_equals_n(self) -> None:
        w = np.ones(300)
        s, _, comp = compute_confidence(w, covered_share=1.0, min_political_coverage=1.0)
        # n_eff = 300, kish = 300/(300+300) = 0.5
        assert comp.kish == pytest.approx(0.5, abs=1e-9)
        # With all components perfect except kish=0.5, aggregate = 0.5^0.35 ≈ 0.7846
        expected_agg = 0.5**W_KISH * 1.0 * 1.0 * 1.0
        assert s == int(round(expected_agg * 100))

    def test_kish_grows_with_n(self) -> None:
        small = compute_confidence(
            np.ones(50), covered_share=1.0, min_political_coverage=1.0
        )[2].kish
        large = compute_confidence(
            np.ones(1000), covered_share=1.0, min_political_coverage=1.0
        )[2].kish
        assert small < large
        assert 0 < small < 1
        assert 0 < large < 1

    def test_saturates_at_half_for_n_eff_equals_kish_half(self) -> None:
        w = np.ones(int(KISH_HALF))
        _, _, comp = compute_confidence(w, covered_share=1.0, min_political_coverage=1.0)
        assert comp.kish == pytest.approx(0.5, abs=1e-9)


class TestCoverageScore:
    def test_full_coverage_full_score(self) -> None:
        _, _, comp = compute_confidence(
            np.ones(500), covered_share=1.0, min_political_coverage=1.0
        )
        assert comp.coverage == pytest.approx(1.0)

    def test_zero_political_coverage_zeroes_coverage(self) -> None:
        _, _, comp = compute_confidence(
            np.ones(500), covered_share=1.0, min_political_coverage=0.0
        )
        assert comp.coverage == 0.0

    def test_half_coverage_half_score(self) -> None:
        _, _, comp = compute_confidence(
            np.ones(500), covered_share=0.5, min_political_coverage=1.0
        )
        assert comp.coverage == pytest.approx(0.5)

    def test_clips_negative_and_above_one(self) -> None:
        _, _, comp = compute_confidence(
            np.ones(500), covered_share=-0.5, min_political_coverage=2.0
        )
        assert comp.coverage == 0.0


class TestVariabilityScore:
    def test_equal_weights_score_one(self) -> None:
        _, _, comp = compute_confidence(
            np.ones(100), covered_share=1.0, min_political_coverage=1.0
        )
        assert comp.variability == pytest.approx(1.0)

    def test_unequal_weights_below_one(self) -> None:
        w = np.concatenate([np.full(50, 2.0), np.full(50, 0.5)])
        _, _, comp = compute_confidence(
            w, covered_share=1.0, min_political_coverage=1.0
        )
        # deff = n / n_eff. n_eff = (Σw)²/Σw² = (125)² / (200+12.5) = 15625/212.5 ≈ 73.5
        # deff ≈ 100/73.5 ≈ 1.36; 1/deff ≈ 0.735
        assert 0.5 < comp.variability < 0.95


class TestConcentrationScore:
    def test_equal_weights_top5_share_is_5_percent_score_one(self) -> None:
        _, _, comp = compute_confidence(
            np.ones(100), covered_share=1.0, min_political_coverage=1.0
        )
        assert comp.concentration == pytest.approx(1.0)

    def test_extreme_concentration_zeros_score(self) -> None:
        # 5 units carry 90% of the weight; top-5% share = 0.9 → score clipped 0.
        w = np.concatenate([np.full(5, 18.0), np.full(95, 0.1)])
        _, _, comp = compute_confidence(
            w, covered_share=1.0, min_political_coverage=1.0
        )
        assert comp.concentration == 0.0


class TestAggregateAndBand:
    def test_perfect_case_score_100(self) -> None:
        # Massive n, all components → 1.
        w = np.ones(10_000)
        s, band, _ = compute_confidence(w, covered_share=1.0, min_political_coverage=1.0)
        # Kish at n=10000: 10000/10300 ≈ 0.9709 → agg ≈ 0.9709^0.35 ≈ 0.9898
        assert s >= 95
        assert band == "robuste"

    def test_indicatif_band_hides_corrected(self) -> None:
        # Tiny n → score < 40.
        s, band, _ = compute_confidence(
            np.ones(5), covered_share=1.0, min_political_coverage=1.0
        )
        assert s < 40
        assert band == "indicatif"

    def test_correctable_band(self) -> None:
        s, band, _ = compute_confidence(
            np.ones(400), covered_share=1.0, min_political_coverage=1.0
        )
        # n_eff=400 → kish 0.571 → agg 0.571^0.35 ≈ 0.824, expect band correctable/robuste
        assert 40 <= s <= 100
        assert band in ("correctable", "robuste")

    def test_empty_weights_returns_zero(self) -> None:
        s, band, _ = compute_confidence(
            np.array([]), covered_share=1.0, min_political_coverage=1.0
        )
        assert s == 0
        assert band == "indicatif"


class TestBandBoundaries:
    """Verify the band-threshold mapping directly via crafted inputs."""

    @pytest.mark.parametrize(
        "n_eq,coverage,expected_band",
        [
            # Pin the aggregate to the desired band by controlling n (Kish)
            # while keeping variability=1 and concentration=1.
            (5, 1.0, "indicatif"),  # very small n
            (50, 0.3, "indicatif"),  # low coverage drags down
            (60, 1.0, "correctable"),  # mid: n_eff=60 → Kish=0.167 → agg ≈ 0.54
            (10_000, 1.0, "robuste"),  # large
        ],
    )
    def test_expected_band(self, n_eq: int, coverage: float, expected_band: str) -> None:
        w = np.ones(n_eq)
        _, band, _ = compute_confidence(
            w, covered_share=coverage, min_political_coverage=coverage
        )
        assert band == expected_band
