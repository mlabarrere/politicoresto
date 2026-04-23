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

from .calibration import calibrate
from .estimation import OptionEstimate, estimate_shares
from .score import compute_confidence
from .supabase_client import PollOption, Snapshot, SupabaseClient

log = logging.getLogger("weighting.pipeline")

# Marginals the worker calibrates against — the canonical PoliticoResto
# six. Order is significant: it decides which category becomes R's
# reference drop (= last one after the alpha sort inside `calibrate`).
CANONICAL_DIMS: Final[tuple[str, ...]] = (
    "age_bucket",
    "sex",
    "region",
    "csp",
    "education",
    "past_vote_pr1_2022",
)

UNKNOWN_CATEGORY: Final[str] = "unknown"
"""Bucket label for a respondent who declined a dimension (K-1a)."""


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
    """
    active_dims = [d for d in CANONICAL_DIMS if d in reference]
    records: list[dict[str, str]] = []
    for s in snapshots:
        row: dict[str, str] = {}
        for d in active_dims:
            val = getattr(s, d)
            row[d] = val if val is not None else UNKNOWN_CATEGORY
        row["option_id"] = s.option_id
        records.append(row)
    return pd.DataFrame.from_records(records)


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
    marginals = _shape_marginals(reference)
    poll_options = client.fetch_poll_options(poll_id)
    if not poll_options:
        raise PipelineInputError(f"Poll {poll_id} has no active options")

    # 1. Calibrate.
    calib = calibrate(
        respondents.drop(columns=["option_id"]),
        marginals,
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
