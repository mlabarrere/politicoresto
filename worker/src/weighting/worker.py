"""Worker entry point — long-polls the pgmq queue and runs the pipeline.

Single-threaded event loop. Each iteration:

    1. Read up to ``batch_size`` messages from ``weighting_queue_read``
       (with a visibility timeout so duplicates are held back).
    2. Dedupe by ``poll_id`` within the batch (we only need the latest
       view per poll).
    3. For each unique ``poll_id`` run the pipeline once. Archive the
       corresponding messages on success. Dead-letter after
       ``max_retries`` failed reads.
    4. When the queue is empty, sleep ``poll_interval_seconds`` and
       loop.

Entry point: ``uv run python -m weighting.worker`` (or the
``weighting-worker`` console script once packaged for Railway).
"""

from __future__ import annotations

import logging
import signal
import time
from types import FrameType
from typing import NoReturn

from .pipeline import PipelineInputError, run
from .settings import WorkerSettings, load_settings
from .supabase_client import QueueMessage, SupabaseClient, SupabaseRPCError

log = logging.getLogger("weighting.worker")


class Shutdown:
    """SIGTERM / SIGINT handler — flips a flag the loop checks."""

    requested: bool = False

    @classmethod
    def install(cls) -> None:
        def _handler(signum: int, _frame: FrameType | None) -> None:  # noqa: ARG001
            cls.requested = True
            log.info("worker.shutdown.signal", extra={"signum": signum})

        signal.signal(signal.SIGTERM, _handler)
        signal.signal(signal.SIGINT, _handler)


def _dedupe_by_poll_id(messages: list[QueueMessage]) -> list[tuple[str, list[int], QueueMessage]]:
    """Return one ``(poll_id, [msg_ids...], final_message)`` entry per
    unique poll.

    If any of the batched messages for a poll_id carries ``final=true``,
    we treat the whole group as final (closed-poll finalization takes
    precedence over regular incremental recomputes).
    """
    buckets: dict[str, list[QueueMessage]] = {}
    for m in messages:
        pid = str(m.payload.get("poll_id", "")).strip()
        if not pid:
            log.warning("worker.msg.missing_poll_id", extra={"msg_id": m.msg_id})
            continue
        buckets.setdefault(pid, []).append(m)

    out: list[tuple[str, list[int], QueueMessage]] = []
    for pid, group in buckets.items():
        ids = [g.msg_id for g in group]
        # Any final? Synthesize a QueueMessage so downstream sees it.
        is_final = any(g.payload.get("final") for g in group)
        representative = group[-1]
        if is_final:
            payload = dict(representative.payload)
            payload["final"] = True
            representative = QueueMessage(
                msg_id=representative.msg_id,
                read_ct=representative.read_ct,
                enqueued_at=representative.enqueued_at,
                vt=representative.vt,
                payload=payload,
            )
        out.append((pid, ids, representative))
    return out


def _should_dead_letter(msg: QueueMessage, settings: WorkerSettings) -> bool:
    return msg.read_ct >= settings.max_retries


def process_once(client: SupabaseClient, settings: WorkerSettings) -> int:
    """Drain one batch. Returns the number of polls processed."""
    messages = client.read_queue()
    if not messages:
        return 0

    deduped = _dedupe_by_poll_id(messages)
    log.info(
        "worker.batch.read",
        extra={"raw": len(messages), "unique_polls": len(deduped)},
    )

    processed = 0
    for poll_id, msg_ids, representative in deduped:
        is_final = bool(representative.payload.get("final"))
        try:
            run(client, poll_id, is_final=is_final)
        except PipelineInputError as e:
            log.error(
                "worker.pipeline.structural_error",
                extra={"poll_id": poll_id, "error": str(e)},
            )
            for mid in msg_ids:
                client.dead_letter_message(mid, f"PipelineInputError: {e}")
            continue
        except (SupabaseRPCError, Exception) as e:  # noqa: BLE001
            if _should_dead_letter(representative, settings):
                log.error(
                    "worker.pipeline.dead_letter",
                    extra={
                        "poll_id": poll_id,
                        "read_ct": representative.read_ct,
                        "error": str(e),
                    },
                )
                for mid in msg_ids:
                    client.dead_letter_message(
                        mid, f"{type(e).__name__}: {e}"
                    )
            else:
                log.warning(
                    "worker.pipeline.retry",
                    extra={
                        "poll_id": poll_id,
                        "read_ct": representative.read_ct,
                        "error": str(e),
                    },
                )
                # Don't archive — message becomes visible again after vt.
            continue

        for mid in msg_ids:
            client.archive_message(mid)
        processed += 1

    return processed


def main() -> NoReturn:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    Shutdown.install()
    settings = load_settings()
    log.info(
        "worker.boot",
        extra={
            "queue": settings.pgmq_queue_name,
            "poll_interval_s": settings.poll_interval_seconds,
            "supabase_url": str(settings.supabase_url),
        },
    )

    with SupabaseClient(settings) as client:
        while not Shutdown.requested:
            try:
                n = process_once(client, settings)
            except SupabaseRPCError as e:
                log.error("worker.rpc_error", extra={"name": e.name, "status": e.status})
                time.sleep(settings.poll_interval_seconds * 2)
                continue
            except Exception as e:  # noqa: BLE001 — keep the loop alive
                log.exception("worker.unexpected_error", extra={"error": str(e)})
                time.sleep(settings.poll_interval_seconds * 2)
                continue

            if n == 0:
                time.sleep(settings.poll_interval_seconds)

    log.info("worker.shutdown.clean")
    raise SystemExit(0)


if __name__ == "__main__":
    main()
