"""Confidence score for a reweighted poll.

A single integer in ``[0, 100]`` summarising how trustworthy the
corrected distribution is, computed as the weighted geometric mean
of four sub-scores in ``[0, 1]``:

========================= ====== =========================================
 Component                 Wght   Formula
========================= ====== =========================================
 Kish effective size       0.35   ``n_eff / (n_eff + 300)``
 Coverage of pop. cells    0.30   ``covered_share * sqrt(min_coverage)``
 Weight variability        0.20   ``1 / deff`` where ``deff = n / n_eff``
 Top-5% weight conc.       0.15   ``clip(1 - (top5 - 0.05) / 0.20, 0, 1)``
========================= ====== =========================================

Geometric mean is deliberately pessimistic: any catastrophic component
collapses the aggregate. See ``docs/weighting-architecture.md §5.1``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Literal

import numpy as np
import numpy.typing as npt

# Aggregation weights — must match docs. Changing any of these is a
# material editorial choice, not a code tweak.
W_KISH: Final[float] = 0.35
W_COVERAGE: Final[float] = 0.30
W_VARIABILITY: Final[float] = 0.20
W_CONCENTRATION: Final[float] = 0.15

# Kish saturation point — at n_eff = 300 the Kish score equals 0.5.
KISH_HALF: Final[float] = 300.0

ConfidenceBand = Literal["indicatif", "correctable", "robuste"]


@dataclass(frozen=True)
class ConfidenceComponents:
    """The four sub-scores in ``[0, 1]``, before aggregation."""

    kish: float
    coverage: float
    variability: float
    concentration: float

    def as_dict(self) -> dict[str, float]:
        return {
            "kish": self.kish,
            "coverage": self.coverage,
            "variability": self.variability,
            "concentration": self.concentration,
        }


def _kish_effective_size(weights: npt.NDArray[np.float64]) -> float:
    """Kish n_eff = (Σw)² / Σw². Equal weights → n_eff = n."""
    s = float(weights.sum())
    sq = float(np.sum(weights**2))
    return (s * s) / sq if sq > 0 else 0.0


def _score_kish(n_eff: float) -> float:
    return n_eff / (n_eff + KISH_HALF)


def _score_coverage(covered_share: float, min_political_coverage: float) -> float:
    """Penalise missing population cells.

    ``covered_share``: fraction of reference cells (age × sex × region …)
    present in the respondent sample.

    ``min_political_coverage``: minimum observed coverage across the
    PR1-2022 self-declared-vote categories. The sqrt attenuates the
    extra penalty so one low-coverage political category does not
    wholly collapse an otherwise-fine poll.
    """
    min_pc = max(0.0, min(1.0, min_political_coverage))
    covered = max(0.0, min(1.0, covered_share))
    return float(covered * np.sqrt(min_pc))


def _score_variability(n: int, n_eff: float) -> float:
    """1 / deff. deff = n / n_eff. Bounded to [0, 1]."""
    if n <= 0 or n_eff <= 0:
        return 0.0
    deff = n / n_eff
    return float(min(1.0, 1.0 / deff))


def _score_concentration(weights: npt.NDArray[np.float64]) -> float:
    """Penalise hyper-fluence of the top 5% heaviest weights.

    ``top5`` = share of total weight carried by the 5% heaviest units.
    At equal weights, top5 = 0.05 → score = 1. At top5 = 0.25, score = 0.
    Linear between, clipped to [0, 1].
    """
    n = len(weights)
    if n == 0:
        return 0.0
    total = weights.sum()
    if total <= 0:
        return 0.0
    sorted_w = np.sort(weights)[::-1]
    k = max(1, int(np.ceil(0.05 * n)))
    top5 = float(sorted_w[:k].sum() / total)
    raw = 1.0 - (top5 - 0.05) / 0.20
    return float(max(0.0, min(1.0, raw)))


def compute_confidence(
    weights: npt.NDArray[np.float64],
    *,
    covered_share: float,
    min_political_coverage: float,
) -> tuple[int, ConfidenceBand, ConfidenceComponents]:
    """Compute the aggregate confidence score, band, and components."""
    n = int(len(weights))
    n_eff = _kish_effective_size(weights)

    c = ConfidenceComponents(
        kish=_score_kish(n_eff),
        coverage=_score_coverage(covered_share, min_political_coverage),
        variability=_score_variability(n, n_eff),
        concentration=_score_concentration(weights),
    )

    aggregate = (
        max(c.kish, 0.0) ** W_KISH
        * max(c.coverage, 0.0) ** W_COVERAGE
        * max(c.variability, 0.0) ** W_VARIABILITY
        * max(c.concentration, 0.0) ** W_CONCENTRATION
    )
    score = int(round(aggregate * 100))
    score = max(0, min(100, score))

    band: ConfidenceBand
    if score < 40:
        band = "indicatif"
    elif score < 70:
        band = "correctable"
    else:
        band = "robuste"

    return score, band, c
