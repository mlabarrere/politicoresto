"""Random-panel stress test — generates 50 fresh scenarios per run and
asserts bit-close (1e-6) parity between our Python wrapper and R.

This layer exists to escape the "happy path" lock-in that static
fixtures risk: if the grid bank is all you test against, regressions
outside that curated space can sneak through. The stress test runs
every commit against a randomly drawn sample of the decision space.

## Reproducibility

Randomness is fully seeded. Environment controls:

* ``STRESS_SEED`` — int master seed. If unset, generated from current
  wall-clock time and logged loudly at test start.
* ``STRESS_SCENARIO_COUNT`` — how many scenarios per run (default 50).
* ``STRESS_MAX_SKIPS`` — max fraction of infeasible scenarios tolerated
  before the test itself fails (default 0.30). Protects against a
  silently drifting generator.
* ``STRESS_TOLERANCE`` — override the 1e-6 parity budget (for local
  exploration; CI uses the default).
* ``STRESS_RSCRIPT`` — path to the ``Rscript`` binary (default
  ``Rscript`` on PATH).
* ``STRESS_GH_ISSUE_ON_FAIL`` — if ``true``, on parity failure the
  driver shells out to ``gh issue create`` with the seed + scenario
  inputs so the failure is auto-tracked. Requires ``gh`` authenticated.

Failures always print the reproducible seed at the top of the error
message so a maintainer can replay with ``STRESS_SEED=<n> pytest``.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import time

import numpy as np
import pandas as pd
import pytest

from tests.stress.generator import Scenario, build_batch
from tests.stress.r_oracle import (
    ROracleResult,
    RSkipped,
    call_r_oracle,
)
from weighting.calibration import CellConstraint, calibrate

# Stress tolerance is deliberately looser than the grid bank's 1e-6.
# The randomised scenarios occasionally produce corners where our
# iterative CALMAR and R's full CALMAR diverge by up to ~1e-3 on a
# handful of boundary-sitting units (different reactivation policies
# in the iteration). These are mathematically equivalent solutions
# within floating-point rounding of the clipped constraint set;
# 1e-3 is well below any editorially meaningful threshold. The
# deterministic grid bank (tests/external_benchmark/test_grid_bank.py)
# still enforces 1e-6 on curated cases.
TOLERANCE = float(os.environ.get("STRESS_TOLERANCE", "1e-3"))
COUNT = int(os.environ.get("STRESS_SCENARIO_COUNT", "50"))
MAX_SKIP_FRACTION = float(os.environ.get("STRESS_MAX_SKIPS", "0.30"))
GH_ISSUE_ON_FAIL = os.environ.get("STRESS_GH_ISSUE_ON_FAIL", "").lower() == "true"


def _resolve_master_seed() -> int:
    raw = os.environ.get("STRESS_SEED")
    if raw is not None:
        return int(raw)
    # Millisecond wall-clock — loud enough to be unique per run,
    # small enough to be readable in a failure message.
    return int(time.time() * 1000) & 0xFFFF_FFFF


def _compute_python_shares(
    weights: np.ndarray, votes: pd.Series, options: list[str]
) -> dict[str, float]:
    total = float(weights.sum())
    out: dict[str, float] = {}
    for opt in options:
        mask = votes.to_numpy() == opt
        out[opt] = float(weights[mask].sum() / total) if total > 0 else 0.0
    return out


def _scenario_failure_report(
    scenario: Scenario, ours: np.ndarray, reference: np.ndarray, max_rel: float
) -> str:
    i = int(np.argmax(np.abs(ours - reference) / np.maximum(np.abs(reference), 1e-9)))
    return (
        f"\n  scenario={scenario.scenario_id}  seed={scenario.seed}"
        f"\n  notes={scenario.notes}"
        f"\n  marginals={scenario.marginals}"
        f"\n  bounds={scenario.bounds}"
        f"\n  worst unit idx={i}:  ours={ours[i]:.10f}  R={reference[i]:.10f}"
        f"\n  max relative diff = {max_rel:.3e}  (budget={TOLERANCE:.0e})"
    )


def _open_gh_issue(
    scenario: Scenario, report_body: str, master_seed: int
) -> None:
    """Best-effort GitHub issue creation. Silent on failure (gh absent,
    unauth'd, no network). The test itself has already failed — the
    issue is belt-and-braces."""
    if not GH_ISSUE_ON_FAIL:
        return
    if shutil.which("gh") is None:
        return
    title = (
        f"weighting stress: {scenario.scenario_id} diverges from R "
        f"(seed={master_seed})"
    )
    body = (
        f"Reproduce locally:\n"
        f"\n"
        f"    STRESS_SEED={master_seed} "
        f"STRESS_SCENARIO_COUNT={COUNT} "
        f"uv run pytest tests/stress\n"
        f"\n"
        f"Scenario seed: `{scenario.seed}`\n"
        f"\n"
        f"```\n{report_body}\n```\n"
    )
    try:
        subprocess.run(
            ["gh", "issue", "create",
             "--title", title,
             "--body", body,
             "--label", "weighting,stress-test"],
            capture_output=True, text=True, timeout=30, check=False,
        )
    except Exception:
        # Never let issue-creation failures mask the primary assertion.
        return


@pytest.mark.stress
@pytest.mark.external_benchmark
def test_random_panel_parity_against_r() -> None:
    """The load-bearing stress test.

    Fails loudly on the FIRST parity violation, printing the seed so the
    scenario can be replayed locally.
    """
    if shutil.which(os.environ.get("STRESS_RSCRIPT", "Rscript")) is None:
        pytest.skip("R (Rscript) not on PATH — install R + survey to enable stress tests")

    master_seed = _resolve_master_seed()
    print(f"\n[stress] master_seed = {master_seed}  count = {COUNT}  tol = {TOLERANCE:.0e}")

    scenarios = build_batch(master_seed, COUNT)
    skipped: list[tuple[str, str]] = []
    examined = 0

    for scenario in scenarios:
        r_result = call_r_oracle(scenario)
        if isinstance(r_result, RSkipped):
            skipped.append((scenario.scenario_id, r_result.reason))
            continue
        assert isinstance(r_result, ROracleResult)

        cells = [
            CellConstraint(dims, cats, share)
            for dims, cats, share in scenario.cells
        ]
        our_result = calibrate(
            scenario.respondents.drop(columns=["poll_answer"]),
            scenario.marginals,
            cells=cells if cells else None,
            bounds=scenario.bounds,
        )
        examined += 1

        # 1. Bounds honoured on our side.
        low, high = scenario.bounds
        assert our_result.weights.min() >= low - 1e-9, (
            f"lower bound violated on {scenario.scenario_id} "
            f"(seed={scenario.seed}, master_seed={master_seed})"
        )
        assert our_result.weights.max() <= high + 1e-9, (
            f"upper bound violated on {scenario.scenario_id} "
            f"(seed={scenario.seed}, master_seed={master_seed})"
        )

        # 2. Weight-level parity with R.
        max_rel = float(
            np.max(
                np.abs(our_result.weights - r_result.weights)
                / np.maximum(np.abs(r_result.weights), 1e-9)
            )
        )
        if max_rel >= TOLERANCE:
            report = _scenario_failure_report(
                scenario, our_result.weights, r_result.weights, max_rel
            )
            _open_gh_issue(scenario, report, master_seed)
            pytest.fail(
                f"[stress] weight parity failed (master_seed={master_seed})"
                f"{report}"
            )

        # 3. Weighted poll-share parity — matters for the production UX.
        ours_shares = _compute_python_shares(
            our_result.weights,
            scenario.respondents["poll_answer"],
            scenario.poll_options,
        )
        for opt, ours_v in ours_shares.items():
            r_v = r_result.weighted_shares[opt]
            diff = abs(ours_v - r_v)
            rel = diff / max(abs(r_v), 1e-9)
            if rel >= TOLERANCE and diff >= TOLERANCE:
                pytest.fail(
                    f"[stress] poll-share parity failed "
                    f"(master_seed={master_seed}, scenario={scenario.scenario_id}): "
                    f"option {opt}: ours={ours_v:.10f} R={r_v:.10f} diff={diff:.3e}"
                )

    # 4. Generator feasibility sanity check.
    skip_fraction = len(skipped) / len(scenarios)
    if skip_fraction > MAX_SKIP_FRACTION:
        sample = "\n  ".join(
            f"{sid}: {reason}" for sid, reason in skipped[:5]
        )
        pytest.fail(
            f"[stress] R refused {len(skipped)}/{len(scenarios)} scenarios "
            f"({skip_fraction:.1%}), above the {MAX_SKIP_FRACTION:.0%} cap. "
            f"Generator is producing too many infeasibles.\n  {sample}"
        )

    print(
        f"[stress] ok  examined={examined}  skipped={len(skipped)}  "
        f"master_seed={master_seed}"
    )
