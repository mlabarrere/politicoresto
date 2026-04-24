"""Typed HTTP client to Supabase's PostgREST surface, service-role only.

We stay at the RPC boundary — every worker-side call goes through a
``weighting_*`` SECURITY DEFINER RPC declared in the schema migrations.
No direct table access, no service-role SELECT against the tables
themselves. That keeps the attack surface small and makes the
worker's Supabase contract explicit.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from .settings import WorkerSettings

JSON = dict[str, Any]


@dataclass(frozen=True)
class Snapshot:
    """A frozen respondent profile, as stored by the atomic vote RPC.

    ``past_votes`` carries the full electoral history as a dict keyed
    by election slug — "presidentielle-2022-t1", "legislatives-2017-t2",
    "europeennes-2019" etc. Values are candidate names ("Macron",
    "Le Pen"), or procedural choices ("abstention", "blanc", "nul",
    "non_inscrit", "ne_se_prononce_pas"). Empty dict if the user never
    declared anything. Normalised dimension names for calibration are
    derived on the Python side as ``past_vote_<slug-with-underscores>``.
    """

    snapshot_id: str
    user_id: str
    option_id: str
    age_bucket: str | None
    sex: str | None
    region: str | None
    csp: str | None
    education: str | None
    past_vote_pr1_2022: str | None           # legacy scalar, kept for one release
    past_votes: dict[str, str]               # full history, keyed by election.slug
    is_partial: bool
    ref_as_of: str                           # ISO date
    snapshotted_at: str                      # ISO timestamp


@dataclass(frozen=True)
class QueueMessage:
    """One pgmq message from the weighting queue."""

    msg_id: int
    read_ct: int
    enqueued_at: str
    vt: str
    payload: JSON


@dataclass(frozen=True)
class PollOption:
    option_id: str
    label: str
    sort_order: int


class SupabaseClient:
    """Thin typed wrapper around the Supabase REST surface.

    One HTTP client per worker process. Thread-safe for the worker's
    single-thread event loop model; if we parallelise later, spin up
    one client per thread.
    """

    def __init__(self, settings: WorkerSettings) -> None:
        self._settings = settings
        self._http = httpx.Client(
            base_url=f"{settings.supabase_url_str}/rest/v1",
            headers={
                "apikey": settings.supabase_service_role_key,
                "authorization": f"Bearer {settings.supabase_service_role_key}",
                "content-type": "application/json",
            },
            timeout=httpx.Timeout(30.0, connect=5.0),
        )

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> SupabaseClient:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    # ── Queue ──

    def read_queue(self, qty: int | None = None, vt_seconds: int | None = None) -> list[QueueMessage]:
        """Read up to ``qty`` messages with a visibility timeout."""
        body = {
            "p_qty": qty or self._settings.batch_size,
            "p_vt_seconds": vt_seconds or self._settings.visibility_timeout_seconds,
        }
        rows = self._rpc("weighting_queue_read", body)
        return [
            QueueMessage(
                msg_id=int(r["msg_id"]),
                read_ct=int(r["read_ct"]),
                enqueued_at=str(r["enqueued_at"]),
                vt=str(r["vt"]),
                payload=r["message"],
            )
            for r in rows
        ]

    def archive_message(self, msg_id: int) -> None:
        self._rpc("weighting_queue_archive", {"p_msg_id": msg_id})

    def dead_letter_message(self, msg_id: int, reason: str) -> None:
        self._rpc(
            "weighting_queue_dead_letter",
            {"p_msg_id": msg_id, "p_reason": reason},
        )

    # ── Reads ──

    def fetch_snapshots(self, poll_id: str) -> list[Snapshot]:
        rows = self._rpc("weighting_fetch_snapshots", {"p_poll_id": poll_id})
        return [
            Snapshot(
                snapshot_id=r["id"],
                user_id=r["user_id"],
                option_id=r["option_id"],
                age_bucket=r["age_bucket"],
                sex=r["sex"],
                region=r["region"],
                csp=r["csp"],
                education=r["education"],
                past_vote_pr1_2022=r["past_vote_pr1_2022"],
                # past_votes jsonb from Postgres → dict on the Python side.
                # Defensive: missing key / null → empty dict.
                past_votes={
                    str(k): str(v)
                    for k, v in (r.get("past_votes") or {}).items()
                    if v is not None
                },
                is_partial=bool(r["is_partial"]),
                ref_as_of=r["ref_as_of"],
                snapshotted_at=r["snapshotted_at"],
            )
            for r in rows
        ]

    def fetch_reference(self, as_of: str) -> dict[str, dict[str, float]]:
        """Return ``{dimension: {category: share}}`` at the given as_of date."""
        rows = self._rpc("weighting_fetch_reference", {"p_as_of": as_of})
        out: dict[str, dict[str, float]] = {}
        for r in rows:
            out.setdefault(r["dimension"], {})[r["category"]] = float(r["share"])
        return out

    def fetch_reference_cells(
        self, as_of: str
    ) -> list[tuple[tuple[str, ...], tuple[str, ...], float]]:
        """Return joint-distribution targets (cross-tab cells).

        Each element is ``(dimensions, categories, share)``. Shape matches
        what the pipeline passes to :func:`calibrate` via
        ``CellConstraint``.
        """
        rows = self._rpc("weighting_fetch_reference_cells", {"p_as_of": as_of})
        return [
            (tuple(r["dimensions"]), tuple(r["categories"]), float(r["share"]))
            for r in rows
        ]

    def fetch_poll_options(self, poll_id: str) -> list[PollOption]:
        rows = self._rpc("weighting_fetch_poll_options", {"p_poll_id": poll_id})
        return [
            PollOption(
                option_id=r["option_id"],
                label=r["label"],
                sort_order=int(r["sort_order"]),
            )
            for r in rows
        ]

    # ── Write ──

    def upsert_estimate(self, *, params: JSON) -> None:
        """Upsert a computed estimate. ``params`` are the RPC args."""
        self._rpc("weighting_upsert_estimate", params)

    # ── Internals ──

    def _rpc(self, name: str, body: JSON) -> Any:
        resp = self._http.post(f"/rpc/{name}", json=body)
        if resp.status_code >= 400:
            raise SupabaseRPCError(
                f"{name} → HTTP {resp.status_code}: {resp.text}",
                name=name,
                status=resp.status_code,
                body=body,
            )
        # Empty body on void RPCs; returns JSON otherwise.
        if not resp.content:
            return None
        return resp.json()


class SupabaseRPCError(RuntimeError):
    """Supabase RPC returned a non-2xx. Preserves request context for logs."""

    def __init__(
        self,
        message: str,
        *,
        name: str,
        status: int,
        body: JSON,
    ) -> None:
        super().__init__(message)
        self.name = name
        self.status = status
        self.body = body
