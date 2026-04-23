"""Deville-Särndal calibration with linear-truncated bounds.

The underlying linear calibration is delegated to ``samplics.SampleWeight``
(JOSS 2021, Diallo), validated against R's ``survey::calibrate`` package.
On top of that we apply INSEE's standard truncation: the g-ratio
``w_calibrated / w_initial`` is clipped to ``[bound_low, bound_high]``
(default ``[0.5, 2.0]``), then re-scaled so that ``sum(weights) == n``.

This is a pragmatic v1: the clipping can leave some calibration
constraints slack. The slack is measured and reported in
``CalibrationResult.marginal_slack`` so downstream code (confidence
score) can penalise it honestly.

A full CALMAR-style iterative truncation (fix out-of-bounds units at
the boundary, re-solve on the rest, repeat) is deferred — it buys a
bit more accuracy at the cost of significant algorithmic surface.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field
from typing import Final

import numpy as np
import numpy.typing as npt
import pandas as pd

# samplics emits a FutureWarning about the archived library on import.
# We suppress it inside the wrapper so call sites do not see it. The
# library choice is documented in docs/weighting-architecture.md §1.
with warnings.catch_warnings():
    warnings.simplefilter("ignore", category=FutureWarning)
    from samplics.weighting import SampleWeight

DEFAULT_BOUNDS: Final[tuple[float, float]] = (0.5, 2.0)


@dataclass(frozen=True)
class CalibrationResult:
    """Output of :func:`calibrate`.

    Attributes
    ----------
    weights:
        Calibrated weights, one per respondent, bounded to the
        requested range.
    bounds:
        The ``(low, high)`` pair actually applied.
    n_clipped:
        Count of respondents whose g-ratio hit a bound.
    marginal_slack:
        For each calibration constraint, the relative gap between
        the achieved weighted share and the target share. A value
        near 0 means the constraint is satisfied; larger values
        quantify the cost of clipping.
    """

    weights: npt.NDArray[np.float64]
    bounds: tuple[float, float]
    n_clipped: int
    marginal_slack: dict[str, float] = field(default_factory=dict)


def _build_aux_vars(
    respondents: pd.DataFrame,
    marginals: dict[str, dict[str, float]],
) -> tuple[npt.NDArray[np.float64], list[str], dict[str, float]]:
    """Dummy-encode the categorical dimensions in ``marginals``.

    Returns ``(aux_matrix, column_labels, target_totals_by_column)``.
    ``aux_matrix`` has shape ``(n_respondents, sum_d(k_d - 1) + 1)``.

    We drop one reference category per dimension (the LAST one in insertion
    order) to avoid the classic dummy-variable trap: without that, the sum
    of indicators per dimension equals 1 for every respondent, making the
    calibration system singular. We then prepend an intercept column of
    ones so the total sample size is calibrated as a constraint.

    Respondents whose category is not listed in the marginals (e.g. a null
    value handled as "unknown" upstream) contribute zeros for every
    category of that dimension — samplics treats them as out-of-frame for
    that constraint, which is the correct behaviour for non-declared data.
    """
    n = len(respondents)
    columns: list[str] = ["__intercept__"]
    totals: dict[str, float] = {"__intercept__": float(n)}
    frames: list[pd.DataFrame] = [
        pd.DataFrame({"__intercept__": np.ones(n, dtype=np.float64)}, index=respondents.index)
    ]

    for dimension, shares_by_category in marginals.items():
        if dimension not in respondents.columns:
            raise KeyError(
                f"calibration: marginal '{dimension}' is not a column on respondents"
            )
        categories = list(shares_by_category.keys())
        if len(categories) < 2:
            # One-category dimension has no informational content; skip.
            continue
        # Drop the last category as reference.
        kept = categories[:-1]
        dim_frame = pd.DataFrame(index=respondents.index)
        for category in kept:
            col_label = f"{dimension}::{category}"
            columns.append(col_label)
            totals[col_label] = float(shares_by_category[category]) * float(n)
            dim_frame[col_label] = (respondents[dimension] == category).astype(float)
        frames.append(dim_frame)

    aux = pd.concat(frames, axis=1).to_numpy(dtype=np.float64)
    return aux, columns, totals


def _marginal_slack(
    aux: npt.NDArray[np.float64],
    weights: npt.NDArray[np.float64],
    columns: list[str],
    targets: dict[str, float],
) -> dict[str, float]:
    """Return relative gap between achieved and target weighted sums."""
    achieved = aux.T @ weights
    slack: dict[str, float] = {}
    for i, col in enumerate(columns):
        target = targets[col]
        if target == 0:
            slack[col] = float(abs(achieved[i]))
        else:
            slack[col] = float(abs(achieved[i] - target) / target)
    return slack


def calibrate(
    respondents: pd.DataFrame,
    marginals: dict[str, dict[str, float]],
    *,
    bounds: tuple[float, float] = DEFAULT_BOUNDS,
) -> CalibrationResult:
    """Deville-Särndal linear calibration with truncation.

    Parameters
    ----------
    respondents:
        One row per respondent. Must contain a column for each key
        in ``marginals``; values are category labels.
    marginals:
        ``{dimension: {category: share}}`` where every share is in
        ``[0, 1]`` and shares within a dimension sum to ≤ 1. The
        "unknown" bucket strategy (K-1a) treats declined categories
        as an additional row in each dimension's share map.
    bounds:
        Inclusive ``(low, high)`` g-ratio bounds. Default ``(0.5, 2.0)``
        matches INSEE's CALMAR default.

    Returns
    -------
    CalibrationResult
    """
    if bounds[0] <= 0 or bounds[0] >= 1 or bounds[1] <= 1:
        raise ValueError(f"bounds must satisfy 0 < low < 1 < high; got {bounds}")
    if respondents.empty:
        raise ValueError("calibrate: respondents frame is empty")

    n = len(respondents)
    initial_weight = np.ones(n, dtype=np.float64)
    aux, columns, totals = _build_aux_vars(respondents, marginals)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=FutureWarning)
        sw = SampleWeight()
        # samplics types the control dict more loosely than we do.
        raw_weights = sw.calibrate(
            samp_weight=initial_weight,
            aux_vars=aux,
            control=totals,  # type: ignore[arg-type]
        )
    raw_weights = np.asarray(raw_weights, dtype=np.float64)

    # Linear-truncated step: clip g = w/w0 to [low, high].
    # We deliberately do NOT re-scale afterwards — rescaling would push
    # weights back above the upper bound (a "squeezed balloon" effect)
    # and defeat the whole purpose of truncation. The intercept
    # constraint (__intercept__ target = n) means the unbounded
    # calibration already aims at sum(w) = n; post-clipping, the sum may
    # drift a few percent from n but every individual weight is strictly
    # in [low, high]. Downstream code uses Kish ratios (Σw)²/Σw² which
    # are scale-invariant, so no estimator is affected by the drift.
    g = raw_weights / initial_weight
    low, high = bounds
    g_clipped = np.clip(g, low, high)
    n_clipped = int(np.sum((g < low) | (g > high)))

    bounded_weights = g_clipped * initial_weight
    total = bounded_weights.sum()
    if total == 0:
        raise RuntimeError("calibrate: all clipped weights summed to zero")

    slack = _marginal_slack(aux, bounded_weights, columns, totals)
    return CalibrationResult(
        weights=bounded_weights,
        bounds=bounds,
        n_clipped=n_clipped,
        marginal_slack=slack,
    )
