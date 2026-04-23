"""Weighted share estimation + normal-approximation 95% CI.

For each poll option:

* Raw share = ``count / n``
* Corrected (weighted) share = ``Σ_i w_i * [option_i == o] / Σ_i w_i``
* 95% CI = ``share ± 1.96 * sqrt(share * (1 - share) * deff / n)``

The ``deff`` term inflates the variance to reflect the loss of
precision from unequal weights — a standard Kish adjustment.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

Z95: float = 1.959963984540054  # two-sided normal at 95%


@dataclass(frozen=True)
class OptionEstimate:
    option_id: str
    response_count: int
    raw_share: float
    corrected_share: float
    ci95_low: float
    ci95_high: float


@dataclass(frozen=True)
class PollEstimate:
    n_respondents: int
    n_effective: float
    deff: float
    options: list[OptionEstimate]


def estimate_shares(
    option_choices: list[str],
    weights: npt.NDArray[np.float64],
    all_options: list[str],
) -> PollEstimate:
    """Compute raw + corrected shares with 95% CI for every option.

    ``option_choices[i]`` is the option picked by respondent ``i``.
    ``all_options`` lists every option in the poll in display order
    (so options with zero votes still appear in the output).
    """
    if len(option_choices) != len(weights):
        raise ValueError("option_choices and weights must have the same length")
    n = len(option_choices)
    if n == 0:
        raise ValueError("estimate_shares: no respondents")
    if weights.sum() <= 0:
        raise ValueError("estimate_shares: weights sum to zero or negative")

    s = float(weights.sum())
    sq = float(np.sum(weights**2))
    n_eff = (s * s) / sq if sq > 0 else 0.0
    deff = n / n_eff if n_eff > 0 else float("inf")

    out: list[OptionEstimate] = []
    choices = np.asarray(option_choices)
    for option_id in all_options:
        mask = choices == option_id
        count = int(mask.sum())
        raw = count / n
        corrected = float(weights[mask].sum() / s)

        # Normal-approx 95% CI with deff correction.
        if deff == float("inf") or corrected * (1 - corrected) <= 0:
            ci_lo = ci_hi = corrected
        else:
            se = float(np.sqrt(corrected * (1 - corrected) * deff / n))
            ci_lo = max(0.0, corrected - Z95 * se)
            ci_hi = min(1.0, corrected + Z95 * se)

        out.append(
            OptionEstimate(
                option_id=option_id,
                response_count=count,
                raw_share=raw,
                corrected_share=corrected,
                ci95_low=ci_lo,
                ci95_high=ci_hi,
            )
        )

    return PollEstimate(
        n_respondents=n,
        n_effective=n_eff,
        deff=deff,
        options=out,
    )
