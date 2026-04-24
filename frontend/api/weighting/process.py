"""Vercel Python Function — weighting worker endpoint.

Endpoint: ``/api/weighting/process``

Triggered by **Supabase Database Webhook** on INSERT into
``survey_respondent_snapshot`` (every vote). The webhook carries
``authorization: Bearer $WEIGHTING_CRON_SECRET`` so the endpoint
authenticates without relying on Vercel Cron (which is Pro-only at
the minute granularity we need).

For each invocation:

    1. Verify the bearer secret.
    2. Read up to N messages from ``pgmq.q_weighting`` via the
       ``weighting_queue_read`` RPC.
    3. Dedupe by ``poll_id`` within the batch (one pipeline run per
       unique poll — bursts collapse naturally).
    4. Run ``weighting.pipeline.run(poll_id)`` for each.
    5. Archive messages on success; dead-letter after
       ``max_retries`` failed reads.

The ``x-vercel-cron`` header is still accepted for operational
fallback if we ever add a scheduled sweep (e.g. hourly safety-net on
Pro).

The Python code shared with the old ``worker/src/weighting/`` package
lives bundled inside this function via Vercel's ``includeFiles`` (see
``vercel.json``). There is no duplication — the frontend PY function
imports directly from the worker package.

Environment variables required at deploy time:

    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    WEIGHTING_CRON_SECRET         (for manual ``curl`` triggers)

Optional :

    PGMQ_QUEUE_NAME               (default "weighting")
    PGMQ_VISIBILITY_TIMEOUT_SECONDS (default 120)
    PGMQ_BATCH_SIZE               (default 32)
    PGMQ_MAX_RETRIES              (default 5)
"""

from __future__ import annotations

import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

# Bundling: Vercel is told via `vercel.json.functions` to include the
# worker/src directory. We add it to sys.path at import-time so the
# `weighting` package resolves.
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_WORKER_SRC = _REPO_ROOT / "worker" / "src"
if str(_WORKER_SRC) not in sys.path:
    sys.path.insert(0, str(_WORKER_SRC))

# These imports must come AFTER sys.path is patched.
from weighting.pipeline import PipelineInputError, run  # noqa: E402
from weighting.settings import load_settings  # noqa: E402
from weighting.supabase_client import (  # noqa: E402
    QueueMessage,
    SupabaseClient,
    SupabaseRPCError,
)

log = logging.getLogger("weighting.vercel")
log.setLevel(logging.INFO)


def _is_authorized(headers: dict[str, str]) -> bool:
    """Check Vercel Cron signature OR shared secret.

    Vercel sets ``x-vercel-cron: 1`` on scheduled invocations. The
    invocation comes from Vercel's own infra so the edge. For manual
    triggers / local dev, we accept a bearer token matching
    ``WEIGHTING_CRON_SECRET``.
    """
    if headers.get("x-vercel-cron") == "1":
        return True
    expected = os.environ.get("WEIGHTING_CRON_SECRET")
    if not expected:
        return False
    return headers.get("authorization", "") == f"Bearer {expected}"


def _dedupe(messages: list[QueueMessage]) -> dict[str, list[int]]:
    """Group message ids by their ``poll_id``. Handles the ``final``
    payload field by propagating it to the processing call."""
    buckets: dict[str, list[int]] = {}
    for m in messages:
        pid = str(m.payload.get("poll_id", "")).strip()
        if not pid:
            log.warning("missing poll_id", extra={"msg_id": m.msg_id})
            continue
        buckets.setdefault(pid, []).append(m.msg_id)
    return buckets


def process_batch() -> dict[str, Any]:
    """Core worker logic, extracted so we can unit-test it."""
    settings = load_settings()
    processed: list[str] = []
    failed: list[str] = []
    dead_lettered: list[str] = []

    with SupabaseClient(settings) as client:
        messages = client.read_queue()
        if not messages:
            return {"processed": 0, "polls": []}

        groups = _dedupe(messages)
        # Remember each message's read_ct to decide dead-letter.
        read_ct_by_msg_id = {m.msg_id: m.read_ct for m in messages}
        final_by_poll_id = {
            str(m.payload.get("poll_id", "")): bool(m.payload.get("final"))
            for m in messages
        }

        for poll_id, msg_ids in groups.items():
            is_final = final_by_poll_id.get(poll_id, False)
            try:
                run(client, poll_id, is_final=is_final)
            except PipelineInputError as e:
                log.error(
                    "pipeline.structural_error",
                    extra={"poll_id": poll_id, "error": str(e)},
                )
                for mid in msg_ids:
                    client.dead_letter_message(
                        mid, f"PipelineInputError: {e}"
                    )
                dead_lettered.append(poll_id)
                continue
            except (SupabaseRPCError, Exception) as e:  # noqa: BLE001
                max_read_ct = max(read_ct_by_msg_id.get(mid, 0) for mid in msg_ids)
                if max_read_ct >= settings.max_retries:
                    log.error(
                        "pipeline.dead_letter",
                        extra={
                            "poll_id": poll_id,
                            "read_ct": max_read_ct,
                            "error": str(e),
                        },
                    )
                    for mid in msg_ids:
                        client.dead_letter_message(
                            mid, f"{type(e).__name__}: {e}"
                        )
                    dead_lettered.append(poll_id)
                else:
                    log.warning(
                        "pipeline.retry",
                        extra={
                            "poll_id": poll_id,
                            "read_ct": max_read_ct,
                            "error": str(e),
                        },
                    )
                    failed.append(poll_id)
                continue

            for mid in msg_ids:
                client.archive_message(mid)
            processed.append(poll_id)

    return {
        "processed": len(processed),
        "failed": len(failed),
        "dead_lettered": len(dead_lettered),
        "polls": processed,
    }


class handler(BaseHTTPRequestHandler):
    """Vercel Python Runtime entrypoint.

    The Vercel runtime instantiates this class per invocation; each HTTP
    request invokes ``do_POST`` (or ``do_GET`` for debug pings).
    """

    def _respond(self, status: int, payload: dict[str, Any]) -> None:
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_POST(self) -> None:  # noqa: N802 — required Vercel handler name
        headers = {k.lower(): v for k, v in self.headers.items()}
        if not _is_authorized(headers):
            self._respond(401, {"error": "unauthorized"})
            return
        try:
            result = process_batch()
            self._respond(200, result)
        except Exception as e:  # noqa: BLE001 — always return JSON
            log.exception("weighting.process.fatal")
            self._respond(500, {"error": str(e), "type": type(e).__name__})

    def do_GET(self) -> None:  # noqa: N802
        """Health check only. Auth still enforced."""
        headers = {k.lower(): v for k, v in self.headers.items()}
        if not _is_authorized(headers):
            self._respond(401, {"error": "unauthorized"})
            return
        self._respond(200, {"status": "ok", "service": "weighting"})
