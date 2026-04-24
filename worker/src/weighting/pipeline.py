"""One-poll pipeline: snapshots → reference → calibrate → estimate →
confidence → upsert.

This module is the single entry point the worker loop calls per
message. It is deliberately Supabase-free at the function boundary
(`run` takes a `SupabaseClient`), so unit / integration tests can
swap in a fake or a real local-Supabase instance without patching.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Final

import numpy as np
import pandas as pd

from .calibration import CellConstraint, calibrate
from .estimation import OptionEstimate, estimate_shares
from .score import compute_confidence
from .supabase_client import PollOption, Snapshot, SupabaseClient

log = logging.getLogger("weighting.pipeline")

# Calibration dimensions ordered by PRIORITY (highest first).
#
# Rationale — "vote recall weighting" is standard practice across all
# major French pollsters (IFOP, Ipsos, Kantar, Harris). Past vote is
# the strongest predictor of current political preference, far stronger
# than age or sex alone. A female voter who backed Le Pen in 2022
# predicts her 2027 stance better than her 2027 age bracket does.
#
# Multi-election block — the more recent and the higher-turnout
# the scrutin, the more informative the signal. PR1 > PR2 > legis
# > euro is a defensible default ordering.
#
# The tuple below drives two things:
#   1. The ordering of marginal constraints in the calibration system.
#   2. The priority ranking used by ``pick_calibration_dims(n, available)``
#      when we have to drop constraints to stay feasible under our
#      panel size.
#
# Dimension name convention : ``past_vote_<election-slug-with-underscores>``.
# Pipeline.run() derives these from the snapshot's ``past_votes`` dict
# (keys = election.slug, values = candidate name | abstention | blanc | nul).
CANONICAL_DIMS: Final[tuple[str, ...]] = (
    # ── vote recall (strongest predictor) — most recent first ──
    "past_vote_presidentielle_2022_t1",
    "past_vote_presidentielle_2022_t2",
    "past_vote_legislatives_2022_t1",
    "past_vote_legislatives_2022_t2",
    "past_vote_europeennes_2019",
    "past_vote_presidentielle_2017_t1",
    "past_vote_presidentielle_2017_t2",
    "past_vote_legislatives_2017_t1",
    "past_vote_legislatives_2017_t2",
    "past_vote_europeennes_2014",
    "past_vote_presidentielle_2012_t1",
    "past_vote_presidentielle_2012_t2",
    "past_vote_legislatives_2012_t1",
    "past_vote_legislatives_2012_t2",
    # ── demographic structure (fallback when past vote is unavailable) ──
    "age_bucket",
    "sex",
    "region",
    "csp",
    "education",
)


def _past_vote_dim_name(election_slug: str) -> str:
    """Map an election slug to the calibration dimension name.

    ``presidentielle-2022-t1`` → ``past_vote_presidentielle_2022_t1``.
    Matches the `dimension` column stored in `survey_ref_marginal` by
    the seed migration (phase 3d.2).
    """
    return "past_vote_" + election_slug.replace("-", "_")

# Minimum panel sizes per extra calibration constraint — INSEE rule of
# thumb ``n_min ≈ 10 × k`` keeps the truncated linear system solvable
# with bounds [0.5, 2.0]. We apply it when picking dimensions
# dynamically: the worker drops low-priority dims when n is small.
MIN_RESPONDENTS_PER_DIM: Final[int] = 10


UNKNOWN_CATEGORY: Final[str] = "unknown"
"""Bucket label for a respondent who declined a dimension (K-1a)."""


def pick_calibration_dims(
    n_respondents: int,
    available_in_reference: set[str],
) -> list[str]:
    """Pick which dimensions to calibrate on, priority-first.

    ``available_in_reference`` is the set of dims we have marginals for
    (typically pulled from ``survey_ref_marginal`` at the relevant
    ``as_of``). We walk ``CANONICAL_DIMS`` in order, keeping any dim
    that is in the reference AND whose cumulative category count stays
    under the feasibility budget ``n_respondents / MIN_RESPONDENTS_PER_DIM``.

    Returns the ordered list of selected dimensions. Always includes
    the highest-priority available dim, even if the budget is tight —
    calibrating on something beats calibrating on nothing.
    """
    budget = max(1, n_respondents // MIN_RESPONDENTS_PER_DIM)
    selected: list[str] = []
    for dim in CANONICAL_DIMS:
        if dim not in available_in_reference:
            continue
        if selected and len(selected) >= budget:
            break
        selected.append(dim)
    return selected


@dataclass(frozen=True)
class PipelineOutcome:
    """Returned by :func:`run` for observability / integration tests."""

    poll_id: str
    n_respondents: int
    n_calibrated: int
    confidence_score: int
    confidence_band: str
    ref_as_of: str
    is_final: bool


def _build_respondents(
    snapshots: list[Snapshot], reference: dict[str, dict[str, float]]
) -> pd.DataFrame:
    """Convert snapshots to the calibrate() frame.

    Columns are the canonical dimensions present in both the reference
    and the snapshots. Missing values become UNKNOWN_CATEGORY so the
    unknown-bucket target (which we require to be present in the
    reference) can match them.

    Past-vote dimensions are drawn from ``Snapshot.past_votes`` (jsonb),
    keyed by the election slug. Missing key → UNKNOWN_CATEGORY.
    """
    active_dims = [d for d in CANONICAL_DIMS if d in reference]

    # Demographic dims are direct attributes. Past-vote dims are in the
    # ``past_votes`` jsonb; we pre-compute a slug→column mapping.
    demographic_dims = [
        d for d in active_dims if not d.startswith("past_vote_")
    ]
    past_vote_dims = [
        d for d in active_dims if d.startswith("past_vote_")
    ]

    records: list[dict[str, str]] = []
    for s in snapshots:
        row: dict[str, str] = {}
        for d in demographic_dims:
            val = getattr(s, d, None)
            row[d] = val if val is not None else UNKNOWN_CATEGORY
        for d in past_vote_dims:
            # Dim "past_vote_presidentielle_2022_t1" → slug
            # "presidentielle-2022-t1". Inverse of _past_vote_dim_name.
            slug = d[len("past_vote_"):].replace("_", "-")
            val = s.past_votes.get(slug)
            row[d] = val if val is not None else UNKNOWN_CATEGORY
        row["option_id"] = s.option_id
        records.append(row)
    return pd.DataFrame.from_records(records)


def _shape_cells(
    ref_cells: list[tuple[tuple[str, ...], tuple[str, ...], float]],
    *,
    allowed_dims: set[str] | None = None,
    respondents: pd.DataFrame | None = None,
) -> list[CellConstraint]:
    """Convert raw DB cell rows to a list of :class:`CellConstraint`.

    Skips cells whose dimensions are not all in our canonical list.
    If ``allowed_dims`` is provided, also skips cells touching a dim
    that we chose to drop for feasibility (see ``pick_calibration_dims``).
    If ``respondents`` is provided, also skips cells with zero matching
    respondents — those add infeasible constraints (the calibrator
    cannot redistribute mass to an empty stratum). This is the
    standard "structural zero" handling in CALMAR.
    """
    out: list[CellConstraint] = []
    for dims, cats, share in ref_cells:
        if not all(d in CANONICAL_DIMS for d in dims):
            continue
        if allowed_dims is not None and not all(d in allowed_dims for d in dims):
            continue
        if respondents is not None:
            mask = np.ones(len(respondents), dtype=bool)
            for dim, cat in zip(dims, cats, strict=True):
                if dim not in respondents.columns:
                    mask = np.zeros(len(respondents), dtype=bool)
                    break
                mask &= (respondents[dim] == cat).to_numpy()
            if not mask.any():
                continue
        out.append(CellConstraint(dims, cats, share))
    return out


def _shape_marginals_disjoint_from_cells(
    reference: dict[str, dict[str, float]],
    cells: list[CellConstraint],
) -> dict[str, dict[str, float]]:
    """Keep only marginals for dimensions NOT covered by any cell.

    Calibrating on both ``sex`` marginal AND ``age × sex`` cells makes
    the linear system rank-deficient (sum over age of `(age_i, F)` cells
    equals the `sex=F` marginal exactly). CALMAR convention: cells
    trump marginals for the dimensions they cover.
    """
    covered: set[str] = set()
    for cell in cells:
        for dim in cell.dimensions:
            covered.add(dim)
    pruned_ref = {dim: cats for dim, cats in reference.items() if dim not in covered}
    return _shape_marginals(pruned_ref)


def _shape_marginals(
    reference: dict[str, dict[str, float]],
) -> dict[str, dict[str, float]]:
    """Order each dim's dict so the alpha-first category lands LAST,
    matching what `calibrate()` expects (R's reference = our dropped
    last)."""
    out: dict[str, dict[str, float]] = {}
    for dim in CANONICAL_DIMS:
        if dim not in reference:
            continue
        shares = reference[dim]
        sorted_cats = sorted(shares.keys())
        if not sorted_cats:
            continue
        alpha_first = sorted_cats[0]
        non_ref = [c for c in sorted_cats if c != alpha_first]
        out[dim] = {c: shares[c] for c in non_ref + [alpha_first]}
    return out


def _coverage(
    respondents: pd.DataFrame,
    marginals: dict[str, dict[str, float]],
) -> tuple[float, float]:
    """Return (overall covered_share, min_political_coverage).

    - ``covered_share``: fraction of reference (dim, cat) cells that
      have at least one respondent.
    - ``min_political_coverage``: the minimum coverage share across
      ``past_vote_pr1_2022`` categories. When that dimension is not
      calibrated, we return 1.0 (non-penalising neutral).
    """
    n_cells = 0
    n_covered = 0
    for dim, cats in marginals.items():
        for cat in cats:
            n_cells += 1
            if dim in respondents.columns and (respondents[dim] == cat).any():
                n_covered += 1
    covered_share = n_covered / n_cells if n_cells > 0 else 1.0

    min_political = 1.0
    if "past_vote_pr1_2022" in marginals:
        counts = respondents["past_vote_pr1_2022"].value_counts(normalize=True)
        per_cat = [
            float(counts.get(c, 0.0)) for c in marginals["past_vote_pr1_2022"]
        ]
        min_political = min(per_cat) if per_cat else 1.0

    return covered_share, min_political


def _weight_top5_share(weights: np.ndarray) -> float:
    n = len(weights)
    if n == 0:
        return 0.0
    total = float(weights.sum())
    if total <= 0:
        return 0.0
    k = max(1, int(np.ceil(0.05 * n)))
    sorted_w = np.sort(weights)[::-1]
    return float(sorted_w[:k].sum() / total)


def _results_to_json(
    est_options: list[OptionEstimate],
    poll_options: list[PollOption],
    kind: str,
) -> list[dict[str, object]]:
    """Flatten a list of OptionEstimate into the JSON shape the view expects."""
    label_by_id = {o.option_id: o.label for o in poll_options}
    order_by_id = {o.option_id: o.sort_order for o in poll_options}
    out: list[dict[str, object]] = []
    for o in est_options:
        out.append(
            {
                "option_id": o.option_id,
                "option_label": label_by_id.get(o.option_id, o.option_id),
                "sort_order": order_by_id.get(o.option_id, 0),
                "response_count": o.response_count,
                "weighted_count": (
                    None if kind == "raw" else float(o.corrected_share)
                ),
                "share": (
                    round(o.raw_share * 100, 2)
                    if kind == "raw"
                    else round(o.corrected_share * 100, 2)
                ),
            }
        )
    def _sort_key(r: dict[str, object]) -> int:
        v = r["sort_order"]
        return int(v) if isinstance(v, (int, float)) else 0

    out.sort(key=_sort_key)
    return out


def _ci_to_json(est_options: list[OptionEstimate]) -> dict[str, list[float]]:
    return {o.option_id: [o.ci95_low, o.ci95_high] for o in est_options}


def run(
    client: SupabaseClient,
    poll_id: str,
    *,
    is_final: bool = False,
    bounds: tuple[float, float] = (0.5, 2.0),
) -> PipelineOutcome:
    """Compute and upsert the estimate for one poll.

    Raises on Supabase errors; the caller (worker loop) handles retries
    via pgmq visibility timeouts.
    """
    log.info("pipeline.start", extra={"poll_id": poll_id, "is_final": is_final})
    snapshots = client.fetch_snapshots(poll_id)
    if not snapshots:
        raise PipelineInputError(f"No snapshots for poll {poll_id}")

    # Snapshots all share the same ref_as_of per the trigger's stamping
    # contract. Take the most common value; warn if snapshots disagree.
    ref_as_of = _canonical_ref_as_of(snapshots)
    reference = client.fetch_reference(ref_as_of)
    if not reference:
        raise PipelineInputError(
            f"No reference data at as_of={ref_as_of}"
        )

    respondents = _build_respondents(snapshots, reference)

    # Resilience to missing data: a dim can be in the reference but have
    # zero respondents who declared anything for it (all UNKNOWN). That
    # produces a column of zeros in the aux matrix → rank-deficient
    # system → calibration crash. Drop those dims up-front.
    dims_with_signal = {
        dim for dim in reference
        if dim in respondents.columns
        and (respondents[dim] != UNKNOWN_CATEGORY).any()
    }
    if not dims_with_signal:
        log.warning(
            "pipeline.no_signal",
            extra={"poll_id": poll_id, "n": len(snapshots)},
        )
        # Fall back to intercept-only calibration: weights = 1 everywhere.
        # The corrected distribution will equal the raw; the confidence
        # score will collapse via the coverage term. That's the right
        # signal to the UI — "we couldn't correct meaningfully".

    # Priority-aware dimension pick: past_vote trumps demographics, and
    # we drop low-priority dims if the panel is small (INSEE rule
    # n_min ≈ 10 × k).
    selected_dims = pick_calibration_dims(
        n_respondents=len(snapshots),
        available_in_reference=dims_with_signal,
    )

    # Structural zeros: drop reference categories with zero respondents
    # and renormalise the remaining shares to sum to 1. Without this
    # step the linear system is infeasible — we'd be asked to assign
    # positive weight mass to a category that has no units. Standard
    # CALMAR treatment.
    reference_filtered: dict[str, dict[str, float]] = {}
    for dim in selected_dims:
        present = set(respondents[dim].unique()) if dim in respondents.columns else set()
        cats = {c: s for c, s in reference[dim].items() if c in present}
        total = sum(cats.values())
        if total > 0:
            reference_filtered[dim] = {c: s / total for c, s in cats.items()}

    # Cross-tab cells: if present at this as_of, they replace the 1D
    # marginals for the dimensions they cover (pattern CALMAR). Cells
    # + marginals on disjoint dims only — covered by the DB seed by
    # convention. Cells keep their priority through the dim ordering
    # in CANONICAL_DIMS.
    ref_cells = client.fetch_reference_cells(ref_as_of)
    cells = _shape_cells(
        ref_cells,
        allowed_dims=set(selected_dims),
        respondents=respondents,
    )
    marginals = _shape_marginals_disjoint_from_cells(reference_filtered, cells)
    poll_options = client.fetch_poll_options(poll_id)
    if not poll_options:
        raise PipelineInputError(f"Poll {poll_id} has no active options")

    # 1. Calibrate — or skip cleanly if we have nothing to calibrate on.
    if not marginals and not cells:
        # No usable reference for this panel. Fall back to weights=1:
        # corrected == raw, confidence score will collapse via the
        # coverage component. Surfacing this gracefully is preferable
        # to raising — the UI still gets a valid (if unhelpful)
        # estimate row.
        import numpy as _np

        n = len(snapshots)
        weights_fallback = _np.ones(n, dtype=_np.float64)

        from .calibration import CalibrationResult as _CalibrationResult

        calib = _CalibrationResult(
            weights=weights_fallback,
            bounds=bounds,
            n_clipped=0,
            marginal_slack={"__no_reference__": 1.0},
            truncation="iterative",
            n_iterations=0,
            converged=False,
        )
    else:
        calib = calibrate(
            respondents.drop(columns=["option_id"]),
            marginals,
            cells=cells,
            bounds=bounds,
        )

    # 2. Estimate shares + CI.
    est = estimate_shares(
        respondents["option_id"].tolist(),
        calib.weights,
        [o.option_id for o in poll_options],
    )

    # 3. Confidence score.
    cov_share, min_pc = _coverage(respondents, marginals)
    score, band, components = compute_confidence(
        calib.weights,
        covered_share=cov_share,
        min_political_coverage=min_pc,
    )

    # 4. Build the view-shaped JSON.
    raw_results = _results_to_json(est.options, poll_options, kind="raw")
    corrected_results = _results_to_json(est.options, poll_options, kind="corrected")
    corrected_ci95 = _ci_to_json(est.options) if score >= 40 else None
    # Hide the corrected distribution when the band is 'indicatif'.
    corrected_for_view = None if score < 40 else corrected_results

    # 5. Upsert.
    client.upsert_estimate(
        params={
            "p_poll_id": poll_id,
            "p_n_respondents": len(snapshots),
            "p_n_effective": float(est.n_effective),
            "p_deff": float(est.deff) if np.isfinite(est.deff) else float("inf"),
            "p_weight_top5_share": _weight_top5_share(calib.weights),
            "p_coverage_share": float(cov_share),
            "p_min_political_coverage": float(min_pc),
            "p_confidence_score": int(score),
            "p_confidence_band": band,
            "p_confidence_components": components.as_dict(),
            "p_raw_results": raw_results,
            "p_corrected_results": corrected_for_view,
            "p_corrected_ci95": corrected_ci95,
            "p_computed_with_ref_as_of": ref_as_of,
            "p_is_final": is_final,
        }
    )
    log.info(
        "pipeline.done",
        extra={
            "poll_id": poll_id,
            "n": len(snapshots),
            "score": score,
            "band": band,
            "is_final": is_final,
        },
    )
    return PipelineOutcome(
        poll_id=poll_id,
        n_respondents=len(snapshots),
        n_calibrated=len(snapshots),
        confidence_score=int(score),
        confidence_band=band,
        ref_as_of=ref_as_of,
        is_final=is_final,
    )


def _canonical_ref_as_of(snapshots: list[Snapshot]) -> str:
    """Pick the most common ref_as_of. Warn if snapshots disagree —
    this should be impossible under the trigger's contract."""
    dates = [s.ref_as_of for s in snapshots]
    counts: dict[str, int] = {}
    for d in dates:
        counts[d] = counts.get(d, 0) + 1
    best = max(counts, key=lambda d: counts[d])
    if len(counts) > 1:
        log.warning(
            "pipeline.ref_as_of.mixed",
            extra={
                "counts": counts,
                "chosen": best,
            },
        )
    return best


class PipelineInputError(RuntimeError):
    """Raised when the pipeline cannot run for a structural reason
    (no snapshots, no reference, no options). Caller should
    dead-letter the message — re-reading won't fix it."""
