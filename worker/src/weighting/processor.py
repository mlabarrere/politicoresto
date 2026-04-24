"""Batch-processor core: reusable from any HTTP or CLI entrypoint.

Extracted from the Vercel function so the same logic runs under:

* Railway FastAPI app (production, phase 3e)
* Local ``python -m weighting.worker`` long-poll (dev + rollback)
* Unit tests

Contract::

    result = process_batch()
    # {"processed": N, "failed": M, "dead_lettered": K, "polls": [...]}

No HTTP concern lives here — callers wrap with their own auth check.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from weighting.pipeline import PipelineInputError, run
from weighting.settings import load_settings
from weighting.supabase_client import (
    QueueMessage,
    SupabaseClient,
    SupabaseRPCError,
)

log = logging.getLogger("weighting.processor")


def is_authorized(headers: dict[str, str]) -> bool:
    """Shared-secret bearer check.

    Accepts ``authorization: Bearer <WEIGHTING_CRON_SECRET>``. The
    historical ``x-vercel-cron: 1`` header is still honoured so the
    same handler can sit behind a scheduled Vercel/Railway cron if we
    ever need a safety-net sweep.
    """
    if headers.get("x-vercel-cron") == "1":
        return True
    expected = os.environ.get("WEIGHTING_CRON_SECRET")
    if not expected:
        return False
    return headers.get("authorization", "") == f"Bearer {expected}"


def _dedupe(messages: list[QueueMessage]) -> dict[str, list[int]]:
    """Group message ids by ``poll_id`` — one pipeline run per poll."""
    buckets: dict[str, list[int]] = {}
    for m in messages:
        pid = str(m.payload.get("poll_id", "")).strip()
        if not pid:
            log.warning("missing poll_id", extra={"msg_id": m.msg_id})
            continue
        buckets.setdefault(pid, []).append(m.msg_id)
    return buckets


def process_batch() -> dict[str, Any]:
    """Read pgmq, dedupe, run pipeline, archive / dead-letter.

    Idempotent: safe to call concurrently (pgmq visibility timeout
    prevents double-processing of the same message).
    """
    settings = load_settings()
    processed: list[str] = []
    failed: list[str] = []
    dead_lettered: list[str] = []

    with SupabaseClient(settings) as client:
        messages = client.read_queue()
        if not messages:
            return {"processed": 0, "polls": []}

        groups = _dedupe(messages)
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
