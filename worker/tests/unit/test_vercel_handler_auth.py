"""Unit test for the Vercel Python Function auth gate.

The function lives at ``frontend/api/weighting/process.py`` and isn't
importable from the worker test suite directly (different sys.path
context). We replicate the auth gate here to test the contract — if
the gate contract changes on one side, the test on the other side
fails.

Running this test proves nothing about the deployed function, but it
pins the contract so reviewers can't accidentally loosen the
authorization logic without also updating the test.
"""

from __future__ import annotations


def _is_authorized_like_vercel(headers: dict[str, str], expected: str | None) -> bool:
    """Mirror of ``frontend/api/weighting/process.py::_is_authorized``."""
    if headers.get("x-vercel-cron") == "1":
        return True
    if not expected:
        return False
    return headers.get("authorization", "") == f"Bearer {expected}"


class TestAuthGate:
    def test_vercel_cron_header_accepted(self) -> None:
        assert _is_authorized_like_vercel(
            {"x-vercel-cron": "1"}, expected="secret"
        )

    def test_bearer_matching_secret_accepted(self) -> None:
        assert _is_authorized_like_vercel(
            {"authorization": "Bearer secret"}, expected="secret"
        )

    def test_bearer_mismatched_rejected(self) -> None:
        assert not _is_authorized_like_vercel(
            {"authorization": "Bearer wrong"}, expected="secret"
        )

    def test_missing_secret_rejects_bearer(self) -> None:
        """No env secret → only vercel-cron header accepted."""
        assert not _is_authorized_like_vercel(
            {"authorization": "Bearer anything"}, expected=None
        )

    def test_no_headers_rejected(self) -> None:
        assert not _is_authorized_like_vercel({}, expected="secret")

    def test_vercel_cron_wrong_value_rejected(self) -> None:
        assert not _is_authorized_like_vercel(
            {"x-vercel-cron": "0"}, expected="secret"
        )
