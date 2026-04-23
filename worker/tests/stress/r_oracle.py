"""Subprocess driver that feeds a :class:`Scenario` to R's
``survey::calibrate`` and parses the weights back.

R is treated as an external oracle. The Python test asserts that our
wrapper's output matches R within ``1e-6`` relative tolerance. On R-
side failure (infeasible system, non-convergence, singular matrix),
the driver returns a :class:`RSkipped` so the pytest driver can count
and cap skip rates rather than failing on every infeasible roll of
the dice.
"""

from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from tests.stress.generator import Scenario

RSCRIPT = os.environ.get("STRESS_RSCRIPT", "Rscript")
SCRIPT = Path(__file__).parent / "scripts" / "stress_oracle.R"


@dataclass(frozen=True)
class ROracleResult:
    """Successful R oracle output."""

    weights: np.ndarray
    weighted_shares: dict[str, float]


@dataclass(frozen=True)
class RSkipped:
    """R refused this scenario (infeasible or non-convergent)."""

    reason: str


class ROracleError(RuntimeError):
    """R exited non-zero or produced unparseable JSON — a bug, not a skip."""


def _scenario_to_request(scenario: Scenario) -> dict[str, Any]:
    # Serialize the respondents as a list-of-dicts for the R side.
    respondents = [
        {col: (None if (v := row[col]) is None else str(v))
         for col in scenario.respondents.columns}
        for _, row in scenario.respondents.iterrows()
    ]
    cells_payload = [
        {
            "dimensions": list(dims),
            "categories": list(cats),
            "share": share,
        }
        for dims, cats, share in scenario.cells
    ]
    return {
        "scenario_id": scenario.scenario_id,
        "respondents": respondents,
        "marginals": scenario.marginals,
        "cells": cells_payload,
        "bounds": list(scenario.bounds),
        "poll_options": list(scenario.poll_options),
    }


def call_r_oracle(scenario: Scenario, *, timeout_s: float = 30.0) -> ROracleResult | RSkipped:
    """Run the R oracle for a single scenario.

    Raises :class:`ROracleError` on subprocess / JSON failure (= real
    bug). Returns :class:`RSkipped` when R declines the scenario.
    """
    request = json.dumps(_scenario_to_request(scenario))
    try:
        proc = subprocess.run(
            [RSCRIPT, "--vanilla", str(SCRIPT)],
            input=request,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            check=False,
        )
    except subprocess.TimeoutExpired as e:
        raise ROracleError(f"R oracle timed out on {scenario.scenario_id}") from e

    if proc.returncode != 0:
        raise ROracleError(
            f"R oracle exited {proc.returncode} on {scenario.scenario_id}\n"
            f"stderr: {proc.stderr}\nstdout: {proc.stdout}"
        )

    try:
        payload = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        raise ROracleError(
            f"R oracle returned non-JSON stdout on {scenario.scenario_id}:\n"
            f"{proc.stdout[:500]}"
        ) from e

    if not payload.get("ok", False):
        return RSkipped(reason=str(payload.get("reason", "unknown")))

    weights = np.asarray(payload["r_weights"], dtype=np.float64)
    shares = {k: float(v) for k, v in payload["r_weighted_shares"].items()}
    if weights.shape != (scenario.n,):
        raise ROracleError(
            f"R oracle returned {weights.shape[0]} weights, expected {scenario.n}"
        )
    return ROracleResult(weights=weights, weighted_shares=shares)
