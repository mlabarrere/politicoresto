"""Random panel generator for stress testing R-vs-Python parity.

Each scenario models a PoliticoResto-shaped synthetic poll panel:

* realistic demographic dimensions (age_bucket, sex, region, csp,
  education, past_vote_pr1_2022 — the canonical 6);
* a poll with 2-5 options and a self-selected vote distribution that
  diverges from the marginal targets (so calibration has real work to
  do);
* random population targets per active dimension;
* random bounds, spanning loose `[0.05, 20]` to tight `[0.5, 2]`.

The seed is the only input. All randomness flows from it, so any
failure is perfectly reproducible: set ``STRESS_SEED=<n>`` and re-run.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Final

import numpy as np
import pandas as pd

# ── PoliticoResto canonical dimensions ────────────────────────────────

AGE_BUCKETS: Final[list[str]] = ["18_24", "25_34", "35_49", "50_64", "65_plus"]
SEXES: Final[list[str]] = ["F", "M", "other"]
REGIONS: Final[list[str]] = [
    "ile_de_france", "nord", "grand_est", "ouest", "sud_ouest", "sud_est",
]
CSPS: Final[list[str]] = [
    "agriculteurs",
    "artisans_commercants_chefs",
    "cadres_professions_intellectuelles",
    "professions_intermediaires",
    "employes",
    "ouvriers",
    "retraites",
    "sans_activite",
]
EDUCATIONS: Final[list[str]] = ["none", "bac", "bac2", "bac3_plus"]
PAST_VOTES: Final[list[str]] = [
    "Macron", "Le Pen", "Melenchon", "Zemmour",
    "Pecresse", "Jadot", "other_candidate", "abstention",
]

DIMENSIONS: Final[dict[str, list[str]]] = {
    "age_bucket":         AGE_BUCKETS,
    "sex":                SEXES,
    "region":             REGIONS,
    "csp":                CSPS,
    "education":          EDUCATIONS,
    "past_vote_pr1_2022": PAST_VOTES,
}


@dataclass(frozen=True)
class Scenario:
    """One random panel + its calibration setup.

    Either ``marginals`` is populated (1D calibration) or ``cells``
    (cross-tab 2D calibration) — ``kind`` says which.
    """

    scenario_id: str
    seed: int
    n: int
    kind: str                                       # "marginals" | "cells"
    respondents: pd.DataFrame                       # columns: active dims + 'poll_answer'
    marginals: dict[str, dict[str, float]]          # target shares per dim — may be empty when kind="cells"
    # Cross-tab cells: list of (dimensions, categories, share).
    cells: list[tuple[tuple[str, ...], tuple[str, ...], float]]
    bounds: tuple[float, float]
    poll_options: list[str]                         # ordered: ["opt_a", "opt_b", ...]
    notes: str = ""
    # Optional extras for reporting / reproduction.
    sample_shares: dict[str, dict[str, float]] = field(default_factory=dict)
    vote_shares_sampled: dict[str, float] = field(default_factory=dict)


# ── Dirichlet helpers ─────────────────────────────────────────────────


def _dirichlet_shares(rng: np.random.Generator, k: int, concentration: float) -> np.ndarray:
    """Draw a random ``k``-simplex. Larger concentration → more uniform."""
    alpha = np.full(k, float(concentration))
    return rng.dirichlet(alpha)


def _categorical_draw(
    rng: np.random.Generator,
    categories: list[str],
    probs: np.ndarray,
    n: int,
) -> np.ndarray:
    """Draw ``n`` labels from ``categories`` with the given probabilities.

    Every category is guaranteed at least one draw when that's possible
    (calibration is undefined when a target category has zero sample
    mass). For ``n >= len(categories)`` this is achieved by forcing the
    first ``len(categories)`` draws to be one of each; for smaller
    ``n`` we fall back to pure sampling.
    """
    draws = rng.choice(categories, size=n, replace=True, p=probs)
    if n >= len(categories):
        # Overwrite the first k draws so every category appears at
        # least once. Safe because n >= k.
        for i, c in enumerate(categories):
            draws[i] = c
        rng.shuffle(draws)
    return draws


# ── Scenario builder ──────────────────────────────────────────────────


def _choose_active_dimensions(
    rng: np.random.Generator,
) -> list[str]:
    """Pick between 1 and 4 demographic dimensions for this scenario.

    Capping at 4 keeps the linear system manageable in R and Python;
    real PoliticoResto calibrations use 4-5 dimensions at most.
    """
    k = int(rng.integers(low=1, high=5))  # 1..4 inclusive
    return list(rng.choice(list(DIMENSIONS.keys()), size=k, replace=False))


def _choose_bounds(rng: np.random.Generator) -> tuple[float, float]:
    """Pick random bounds ``(low, high)`` with low < 1 < high.

    Weighted toward loose bounds so the generator doesn't produce a
    flood of infeasible scenarios. Tight bounds still appear ~25 % of
    the time so clipping-logic paths are exercised.
    """
    profile = rng.random()
    if profile < 0.25:
        # Tight INSEE-default bounds.
        return 0.5, 2.0
    if profile < 0.55:
        return 0.25, 4.0
    if profile < 0.8:
        return 0.1, 10.0
    # Very loose — linear math without effective truncation.
    return 0.05, 20.0


def _build_respondents(
    rng: np.random.Generator,
    active_dims: list[str],
    n: int,
    target_shares: dict[str, np.ndarray],
) -> tuple[pd.DataFrame, dict[str, dict[str, float]]]:
    """Draw a sample biased AWAY from targets but bounded in divergence.

    Sample probabilities = softmax(log(target) + N(0, σ)) with σ drawn
    from [0.1, 0.5]. This keeps every sample category share within a
    small factor of the target, so calibration remains feasible at
    the default [0.5, 2.0] bounds the vast majority of the time while
    still producing visible divergence for calibration to correct.
    """
    cols: dict[str, np.ndarray] = {}
    sample_shares: dict[str, dict[str, float]] = {}

    sigma = float(rng.uniform(0.1, 0.5))
    for dim in active_dims:
        categories = DIMENSIONS[dim]
        k = len(categories)
        target = target_shares[dim]
        noise = rng.normal(0.0, sigma, size=k)
        logits = np.log(np.clip(target, 1e-9, 1.0)) + noise
        shifted = logits - logits.max()  # numerical stability
        sample_probs = np.exp(shifted)
        sample_probs = sample_probs / sample_probs.sum()
        labels = _categorical_draw(rng, categories, sample_probs, n)
        cols[dim] = labels
        counts = pd.Series(labels).value_counts(normalize=True)
        sample_shares[dim] = {cat: float(counts.get(cat, 0.0)) for cat in categories}

    df = pd.DataFrame(cols)
    return df, sample_shares


def _build_poll_vote(
    rng: np.random.Generator,
    n: int,
) -> tuple[list[str], np.ndarray, dict[str, float]]:
    """Pick 2-5 poll options and draw a vote per respondent."""
    n_opts = int(rng.integers(low=2, high=6))
    options = [f"opt_{chr(ord('a') + i)}" for i in range(n_opts)]
    vote_probs = _dirichlet_shares(rng, n_opts, concentration=1.5)
    votes = _categorical_draw(rng, options, vote_probs, n)
    counts = pd.Series(votes).value_counts(normalize=True)
    shares = {opt: float(counts.get(opt, 0.0)) for opt in options}
    return options, votes, shares


def build_scenario(seed: int, scenario_id: str) -> Scenario:
    """Deterministic random scenario from a seed.

    Coin-flips between a 1D marginals calibration and a 2D cross-tab
    cells calibration. Both flavours are covered ~50/50 across a batch.
    """
    rng = np.random.default_rng(seed)

    n = int(rng.integers(low=50, high=2001))  # 50..2000
    active_dims = _choose_active_dimensions(rng)
    bounds = _choose_bounds(rng)

    # Random TARGET marginals for each active dim.
    target_shares_arr: dict[str, np.ndarray] = {}
    marginals_all: dict[str, dict[str, float]] = {}
    for dim in active_dims:
        categories = DIMENSIONS[dim]
        shares = _dirichlet_shares(rng, len(categories), concentration=3.0)
        target_shares_arr[dim] = shares
        sorted_cats = sorted(categories)
        alpha_first = sorted_cats[0]
        non_ref = [c for c in sorted_cats if c != alpha_first]
        marginals_all[dim] = {
            cat: float(shares[categories.index(cat)])
            for cat in (non_ref + [alpha_first])
        }

    respondents, sample_shares = _build_respondents(
        rng, active_dims, n, target_shares_arr
    )
    poll_options, votes, vote_shares_sampled = _build_poll_vote(rng, n)
    respondents = respondents.assign(poll_answer=votes)

    # Note: cells-based scenarios are covered by the deterministic grid
    # bank (see tests/external_benchmark/test_grid_bank.py). The random
    # stress test stays marginals-only to keep the R-oracle side simple —
    # reproducing R's `~dim1:dim2` interaction formula requires aligning
    # reference-category drops across main effects + interactions, which
    # is curated case-by-case in the grid bank rather than generated.
    kind = "marginals"
    notes = f"kind={kind} n={n} dims={active_dims} bounds={bounds} n_opts={len(poll_options)}"

    return Scenario(
        scenario_id=scenario_id,
        seed=seed,
        n=n,
        kind=kind,
        respondents=respondents,
        marginals=marginals_all,
        cells=[],
        bounds=bounds,
        poll_options=poll_options,
        notes=notes,
        sample_shares=sample_shares,
        vote_shares_sampled=vote_shares_sampled,
    )


def build_batch(master_seed: int, count: int) -> list[Scenario]:
    """Derive ``count`` scenarios from a single master seed.

    Each scenario uses a child seed ``(master_seed, i)`` — SHA256-hashed
    to an int so consecutive scenarios are not correlated.
    """
    import hashlib

    scenarios: list[Scenario] = []
    for i in range(count):
        h = hashlib.sha256(f"{master_seed}/{i}".encode()).digest()
        child_seed = int.from_bytes(h[:8], "big")
        scenarios.append(build_scenario(child_seed, scenario_id=f"stress-{i:03d}"))
    return scenarios
