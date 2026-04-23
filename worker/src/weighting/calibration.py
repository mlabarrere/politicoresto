"""Deville-Särndal calibration with linear-truncated bounds.

The underlying linear calibration is delegated to ``samplics.SampleWeight``
(JOSS 2021, Diallo), validated against R's ``survey::calibrate`` package.
On top of it we apply INSEE's standard **iterative** linear-truncated
algorithm (Deville & Särndal 1992, CALMAR 2 user manual):

    1. Solve unconstrained linear calibration on every unit.
    2. Any unit whose g-ratio ``w_calibrated / w_initial`` is out of
       ``[bound_low, bound_high]`` is fixed at the boundary.
    3. Its contribution is subtracted from the constraint totals and
       the linear system is re-solved on the remaining free units.
    4. Repeat until no newly violating unit appears or ``max_iter`` is
       reached.

Bit-close parity with R ``survey::calibrate(..., bounds=...)`` is
achieved end-to-end on our test bank (see ``tests/external_benchmark``).
A cheaper one-shot ``truncation="clip"`` fallback is kept for
differential testing against the iterative path — it is **never** the
default.

**Cross-tab cells.** In addition to 1D marginals, :func:`calibrate`
accepts `cells`: a list of ``CellConstraint`` describing joint
distribution targets (e.g. "Femmes 18-24 = 5.5% du total"). Each cell
adds one indicator column to the calibration matrix. Cells and
marginals should cover DISJOINT dimensions — calibrating on
``age × sex`` cells AND ``age`` or ``sex`` marginals makes the system
linearly dependent. The wrapper does not automatically drop redundant
columns; it is the caller's responsibility.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field
from typing import Final, Literal

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
"""INSEE CALMAR default — no respondent counts for less than half or more
than double the baseline."""


@dataclass(frozen=True)
class CellConstraint:
    """A joint-distribution target for a cross-tab cell.

    Example: ``CellConstraint(("age_bucket", "sex"), ("18_24", "F"), 0.055)``
    says "5.5 % of the target population is Females aged 18-24".

    The list of dimensions must match a non-empty subset of columns
    present in the respondents frame. The categories tuple must be the
    same length as dimensions. The share is the fraction of the total
    population this cell represents.
    """

    dimensions: tuple[str, ...]
    categories: tuple[str, ...]
    share: float

    def __post_init__(self) -> None:
        if len(self.dimensions) != len(self.categories):
            raise ValueError(
                f"CellConstraint: len(dimensions)={len(self.dimensions)} "
                f"!= len(categories)={len(self.categories)}"
            )
        if len(self.dimensions) < 2:
            raise ValueError("CellConstraint: at least 2 dimensions required")
        if not (0 <= self.share <= 1):
            raise ValueError(
                f"CellConstraint: share must be in [0, 1]; got {self.share}"
            )

DEFAULT_MAX_ITER: Final[int] = 50
"""Hard cap on iterative CALMAR iterations. Real-world cases converge in
≤ 5 iterations; hitting 50 indicates an infeasible input."""

TruncationMethod = Literal["iterative", "clip"]


@dataclass(frozen=True)
class CalibrationResult:
    """Output of :func:`calibrate`.

    Attributes
    ----------
    weights:
        Calibrated weights, one per respondent, strictly within
        ``bounds``.
    bounds:
        The ``(low, high)`` pair actually applied.
    n_clipped:
        Count of respondents whose g-ratio hit a bound (= the count of
        units frozen by the iterative algorithm, or clipped by the
        one-shot fallback).
    marginal_slack:
        For each calibration constraint, the relative gap between the
        achieved weighted share and the target share. Near zero when
        iterative CALMAR converges; documents the residual drift under
        the ``"clip"`` fallback.
    truncation:
        Which truncation strategy was used — ``"iterative"`` (default,
        full Deville-Särndal) or ``"clip"`` (one-shot fallback).
    n_iterations:
        Number of outer iterations the iterative algorithm needed.
        Always ``1`` for the ``"clip"`` fallback.
    converged:
        ``True`` iff the iterative algorithm terminated before
        ``max_iter``. Always ``True`` for the ``"clip"`` fallback
        (trivially — it's a single pass).
    """

    weights: npt.NDArray[np.float64]
    bounds: tuple[float, float]
    n_clipped: int
    marginal_slack: dict[str, float] = field(default_factory=dict)
    truncation: TruncationMethod = "iterative"
    n_iterations: int = 1
    converged: bool = True


def _build_aux_vars(
    respondents: pd.DataFrame,
    marginals: dict[str, dict[str, float]],
    cells: list[CellConstraint] | None = None,
) -> tuple[npt.NDArray[np.float64], list[str], dict[str, float]]:
    """Dummy-encode the categorical dimensions in ``marginals``.

    Returns ``(aux_matrix, column_labels, target_totals_by_column)``.
    ``aux_matrix`` has shape ``(n_respondents, sum_d(k_d - 1) + 1)``.

    We drop one reference category per dimension (the LAST one in
    insertion order) to avoid the classic dummy-variable trap: without
    that, the sum of indicators per dimension equals 1 for every
    respondent, making the calibration system singular. We then prepend
    an intercept column of ones so the total sample size is calibrated
    as a constraint.

    Respondents whose category is not listed in the marginals (e.g. a
    null value handled as "unknown" upstream) contribute zeros for every
    category of that dimension — samplics treats them as out-of-frame
    for that constraint, which is the correct behaviour for non-declared
    data.
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
        kept = categories[:-1]
        dim_frame = pd.DataFrame(index=respondents.index)
        for category in kept:
            col_label = f"{dimension}::{category}"
            columns.append(col_label)
            totals[col_label] = float(shares_by_category[category]) * float(n)
            dim_frame[col_label] = (respondents[dimension] == category).astype(float)
        frames.append(dim_frame)

    # ── Cross-tab cell constraints. Each cell adds one indicator column. ──
    # For each group of cells sharing the same dimension set, drop ONE cell
    # (the alphabetically-last categories tuple) as the reference — same
    # trap as with marginals: without dropping, the sum of cells on a
    # dimension set equals the all-ones intercept.
    if cells:
        # Group cells by their dimension tuple.
        grouped: dict[tuple[str, ...], list[CellConstraint]] = {}
        for cell in cells:
            grouped.setdefault(cell.dimensions, []).append(cell)

        cell_frame = pd.DataFrame(index=respondents.index)
        for dims, group in grouped.items():
            for d in dims:
                if d not in respondents.columns:
                    raise KeyError(
                        f"calibration: cell dimension '{d}' is not a column on respondents"
                    )
            # Sort categories tuples lexicographically → drop the last.
            ordered = sorted(group, key=lambda c: c.categories)
            if len(ordered) < 2:
                continue
            kept_cells = ordered[:-1]
            for cell in kept_cells:
                col_label = (
                    "cell::" + "×".join(dims) + "::" + "|".join(cell.categories)
                )
                columns.append(col_label)
                totals[col_label] = float(cell.share) * float(n)
                mask = pd.Series(True, index=respondents.index)
                for dim, cat in zip(dims, cell.categories, strict=True):
                    mask &= respondents[dim] == cat
                cell_frame[col_label] = mask.astype(float)
        if len(cell_frame.columns) > 0:
            frames.append(cell_frame)

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


def _linear_calibrate_raw(
    initial_weight: npt.NDArray[np.float64],
    aux: npt.NDArray[np.float64],
    totals: dict[str, float],
) -> npt.NDArray[np.float64]:
    """Thin wrapper around samplics's unbounded linear calibration.

    Isolated so the iterative algorithm can re-invoke it cheaply on the
    free subset at each iteration.
    """
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=FutureWarning)
        sw = SampleWeight()
        raw = sw.calibrate(
            samp_weight=initial_weight,
            aux_vars=aux,
            control=totals,  # type: ignore[arg-type]
        )
    return np.asarray(raw, dtype=np.float64)


def _iterative_truncation(
    aux: npt.NDArray[np.float64],
    columns: list[str],
    totals: dict[str, float],
    initial_weight: npt.NDArray[np.float64],
    bounds: tuple[float, float],
    max_iter: int,
) -> tuple[npt.NDArray[np.float64], int, bool]:
    """Iterative Deville-Särndal / CALMAR linear-truncated calibration.

    On each iteration, the linear system is solved on units that are
    still "free" (not frozen at a boundary). Units whose g-ratio leaves
    ``bounds`` are frozen at the boundary and their contribution is
    subtracted from the constraint totals for the next iteration.

    Returns ``(weights, n_iterations, converged)``.
    """
    low, high = bounds
    n = len(initial_weight)
    weights = initial_weight.copy()
    fixed = np.zeros(n, dtype=bool)
    target_vec = np.array([totals[col] for col in columns], dtype=np.float64)

    for iteration in range(1, max_iter + 1):
        free = ~fixed
        if not free.any():
            # All units pinned at a boundary. Return what we've got;
            # marginals may be far from target but bounds are honoured.
            return weights, iteration - 1, True

        # Subtract the contribution of already-frozen units from targets.
        if fixed.any():
            fixed_contribution = aux[fixed].T @ weights[fixed]
            adjusted_target = target_vec - fixed_contribution
        else:
            adjusted_target = target_vec
        adjusted_totals = {col: float(adjusted_target[i]) for i, col in enumerate(columns)}

        # Solve on the free subset. If the reduced system is infeasible
        # (singular matrix — e.g. after freezing one whole dimension,
        # the remaining aux columns for that dimension are constant)
        # we stop iterating and return the best weights seen so far.
        # This is the correct CALMAR behaviour for infeasible inputs:
        # individual bounds are always honoured; marginal_slack
        # quantifies the residual infeasibility for the caller.
        try:
            raw = _linear_calibrate_raw(
                initial_weight=initial_weight[free],
                aux=aux[free],
                totals=adjusted_totals,
            )
        except (np.linalg.LinAlgError, ValueError):
            # Previous iteration's committed weights are already in
            # `weights` for free units; leave them. Converged=False
            # signals the caller to distrust marginal constraints.
            return weights, iteration - 1, False

        g_free = raw / initial_weight[free]
        # Floating-point tolerance so units sitting exactly at a bound
        # are not re-flagged as violators next iteration.
        tol = 1e-12
        newly_low = g_free < low - tol
        newly_high = g_free > high + tol

        if not (newly_low.any() or newly_high.any()):
            # Free-subset weights are all within bounds → converged.
            weights[free] = raw
            return weights, iteration, True

        # Freeze the newly violating units at their boundary for the
        # next iteration. Provisionally commit the raw weights on
        # the still-free (non-violating) units so that if we exit via
        # max_iter we have a sensible best effort to return.
        free_idx = np.where(free)[0]
        low_idx = free_idx[newly_low]
        high_idx = free_idx[newly_high]
        weights[low_idx] = low * initial_weight[low_idx]
        weights[high_idx] = high * initial_weight[high_idx]
        ok_mask = ~(newly_low | newly_high)
        weights[free_idx[ok_mask]] = raw[ok_mask]
        fixed[low_idx] = True
        fixed[high_idx] = True

    # Did not converge within max_iter. Bounds are honoured (we froze at
    # boundary), but the linear system was not satisfied on the last
    # iteration's free subset. marginal_slack will quantify the residual.
    return weights, max_iter, False


def calibrate(
    respondents: pd.DataFrame,
    marginals: dict[str, dict[str, float]] | None = None,
    *,
    cells: list[CellConstraint] | None = None,
    bounds: tuple[float, float] = DEFAULT_BOUNDS,
    truncation: TruncationMethod = "iterative",
    max_iter: int = DEFAULT_MAX_ITER,
) -> CalibrationResult:
    """Deville-Särndal linear calibration with linear truncation.

    Parameters
    ----------
    respondents:
        One row per respondent. Must contain a column for each key in
        ``marginals`` or each dimension referenced by ``cells``.
    marginals:
        ``{dimension: {category: share}}`` where every share is in
        ``[0, 1]`` and shares within a dimension sum to ≤ 1. The
        "unknown" bucket strategy (K-1a) treats declined categories as
        an additional row in each dimension's share map.
    cells:
        Optional list of :class:`CellConstraint` for joint-distribution
        targets (e.g. age × sex). Cells and marginals must cover
        DISJOINT dimension sets — cells on ``age × sex`` already
        imply the ``age`` and ``sex`` marginals; adding those
        separately makes the linear system rank-deficient. The wrapper
        does NOT auto-drop redundant columns; it is the caller's job.
    bounds:
        Inclusive ``(low, high)`` g-ratio bounds. Default ``(0.5, 2.0)``
        matches INSEE's CALMAR default.
    truncation:
        ``"iterative"`` (default) — full Deville-Särndal / CALMAR
        truncated linear algorithm, bit-close to R ``survey::calibrate``.
        ``"clip"`` — single-shot clip-and-slack, cheaper but leaves
        calibration constraints relaxed on clipped cases. Kept for
        differential testing only.
    max_iter:
        Outer-iteration cap for ``truncation="iterative"``. Real inputs
        converge in ≤ 5; 50 is intentionally generous.

    Returns
    -------
    CalibrationResult
    """
    marginals = marginals or {}
    cells = cells or []
    if not marginals and not cells:
        raise ValueError("calibrate: at least one of marginals or cells is required")
    if bounds[0] <= 0 or bounds[0] >= 1 or bounds[1] <= 1:
        raise ValueError(f"bounds must satisfy 0 < low < 1 < high; got {bounds}")
    if respondents.empty:
        raise ValueError("calibrate: respondents frame is empty")
    if truncation not in ("iterative", "clip"):
        raise ValueError(f"truncation must be 'iterative' or 'clip'; got {truncation!r}")

    n = len(respondents)
    initial_weight = np.ones(n, dtype=np.float64)
    aux, columns, totals = _build_aux_vars(respondents, marginals, cells)

    if truncation == "clip":
        # One-shot fallback: run unbounded, clip g in place, report slack.
        raw_weights = _linear_calibrate_raw(initial_weight, aux, totals)
        g = raw_weights / initial_weight
        low, high = bounds
        g_clipped = np.clip(g, low, high)
        n_clipped = int(np.sum((g < low) | (g > high)))
        weights = g_clipped * initial_weight
        if weights.sum() == 0:
            raise RuntimeError("calibrate: all clipped weights summed to zero")
        slack = _marginal_slack(aux, weights, columns, totals)
        return CalibrationResult(
            weights=weights,
            bounds=bounds,
            n_clipped=n_clipped,
            marginal_slack=slack,
            truncation="clip",
            n_iterations=1,
            converged=True,
        )

    # Iterative path (default).
    weights, n_iterations, converged = _iterative_truncation(
        aux=aux,
        columns=columns,
        totals=totals,
        initial_weight=initial_weight,
        bounds=bounds,
        max_iter=max_iter,
    )
    if weights.sum() == 0:
        raise RuntimeError("calibrate: all weights summed to zero")

    # n_clipped = units currently at a boundary.
    low, high = bounds
    tol = 1e-9
    g = weights / initial_weight
    n_clipped = int(np.sum((g <= low + tol) | (g >= high - tol) & ~np.isclose(g, 1.0)))
    # A cleaner definition: units whose g is at either boundary.
    at_low = np.isclose(g, low, atol=tol)
    at_high = np.isclose(g, high, atol=tol)
    n_clipped = int(np.sum(at_low | at_high))

    slack = _marginal_slack(aux, weights, columns, totals)
    return CalibrationResult(
        weights=weights,
        bounds=bounds,
        n_clipped=n_clipped,
        marginal_slack=slack,
        truncation="iterative",
        n_iterations=n_iterations,
        converged=converged,
    )
