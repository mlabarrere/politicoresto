"""Unit tests for the priority-aware dimension picker in pipeline.py.

The worker prioritizes past-vote dimensions over demographic ones
(the "vote recall weighting" pattern used by all major pollsters)
and drops low-priority dims when the panel size won't support them.
"""

from __future__ import annotations

from weighting.pipeline import (
    CANONICAL_DIMS,
    MIN_RESPONDENTS_PER_DIM,
    pick_calibration_dims,
)


class TestCanonicalOrdering:
    def test_past_vote_is_highest_priority(self) -> None:
        """Past vote lands FIRST — it's the strongest predictor."""
        assert CANONICAL_DIMS[0] == "past_vote_pr1_2022"

    def test_demographic_dims_all_present(self) -> None:
        """Full canonical six remains covered."""
        expected = {"age_bucket", "sex", "region", "csp", "education"}
        assert set(CANONICAL_DIMS) >= expected | {"past_vote_pr1_2022"}


class TestPickCalibrationDims:
    def test_small_panel_keeps_only_highest_priority(self) -> None:
        """n=10, budget=1 → only the top-priority available dim."""
        available = {"age_bucket", "sex", "past_vote_pr1_2022"}
        selected = pick_calibration_dims(
            n_respondents=10, available_in_reference=available
        )
        # budget = 10 // 10 = 1; we always keep at least 1 (the highest
        # priority). past_vote_pr1_2022 comes first in CANONICAL_DIMS.
        assert selected == ["past_vote_pr1_2022"]

    def test_larger_panel_includes_multiple(self) -> None:
        """n=100, budget=10 → all 6 dims if available."""
        available = set(CANONICAL_DIMS)
        selected = pick_calibration_dims(
            n_respondents=100, available_in_reference=available
        )
        # budget = 10, we pick up to 10 — i.e. all 6 canonical dims.
        assert selected == list(CANONICAL_DIMS)

    def test_missing_dim_is_skipped(self) -> None:
        """A dim that's not in the reference is skipped cleanly."""
        available = {"age_bucket", "sex"}  # no past_vote
        selected = pick_calibration_dims(
            n_respondents=50, available_in_reference=available
        )
        # past_vote is not available → skip. Next priority is age_bucket.
        assert "past_vote_pr1_2022" not in selected
        assert "age_bucket" in selected
        assert "sex" in selected

    def test_respects_priority_order_in_output(self) -> None:
        """Output is ordered by CANONICAL_DIMS priority, not by dict order."""
        available = {"education", "sex", "past_vote_pr1_2022"}
        selected = pick_calibration_dims(
            n_respondents=200, available_in_reference=available
        )
        # past_vote first (priority 0), sex (priority 2), education (priority 5)
        assert selected.index("past_vote_pr1_2022") == 0
        assert selected.index("sex") < selected.index("education")

    def test_tight_budget_drops_low_priority_first(self) -> None:
        """n=20, budget=2 → keep top-2 only, drop education/csp."""
        available = set(CANONICAL_DIMS)
        selected = pick_calibration_dims(
            n_respondents=20, available_in_reference=available
        )
        # budget = 20 // 10 = 2.
        assert len(selected) == 2
        # Top-2 priority: past_vote_pr1_2022, age_bucket.
        assert selected[0] == "past_vote_pr1_2022"
        assert selected[1] == "age_bucket"
        # education / csp / region / sex dropped.
        assert "education" not in selected
        assert "csp" not in selected

    def test_empty_available_returns_empty(self) -> None:
        selected = pick_calibration_dims(
            n_respondents=100, available_in_reference=set()
        )
        assert selected == []

    def test_zero_respondents_still_returns_one_dim_when_possible(
        self,
    ) -> None:
        """Edge case: n=0 should still not crash. Budget clamped to 1."""
        available = {"past_vote_pr1_2022"}
        selected = pick_calibration_dims(
            n_respondents=0, available_in_reference=available
        )
        # "Always include the highest-priority available dim" clause.
        assert selected == ["past_vote_pr1_2022"]

    def test_respondents_per_dim_rule(self) -> None:
        """Documented INSEE rule n_min ≈ 10 × k."""
        assert MIN_RESPONDENTS_PER_DIM == 10
