"""Survey reweighting pipeline for PoliticoResto polls.

Deville-Särndal calibration (JASA 1992) with linear-truncated bounds,
implemented on top of the peer-reviewed ``samplics`` library.
"""

from .calibration import CalibrationResult, calibrate
from .estimation import PollEstimate, estimate_shares
from .score import ConfidenceBand, ConfidenceComponents, compute_confidence

__all__ = [
    "CalibrationResult",
    "ConfidenceBand",
    "ConfidenceComponents",
    "PollEstimate",
    "calibrate",
    "compute_confidence",
    "estimate_shares",
]
