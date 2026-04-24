"""FastAPI app — Railway production entrypoint.

Exposed endpoints::

    GET  /health        liveness probe (no auth)
    POST /process       drain pgmq + run pipeline (Bearer auth)

Trigger wiring (production) : Supabase Database Webhook on AFTER
INSERT of ``survey_respondent_snapshot`` POSTs here with
``authorization: Bearer $WEIGHTING_CRON_SECRET``.

Run locally::

    cd worker
    uv run uvicorn weighting.http_app:app --host 0.0.0.0 --port 8080
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request

from weighting.processor import is_authorized, process_batch

log = logging.getLogger("weighting.http")
log.setLevel(logging.INFO)

app = FastAPI(title="PoliticoResto weighting worker", version="1.0")


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe — Railway healthcheck hits this."""
    return {"status": "ok"}


@app.post("/process")
async def process(request: Request) -> dict[str, object]:
    """Drain pgmq and run the weighting pipeline for each unique poll.

    Authenticated via ``authorization: Bearer $WEIGHTING_CRON_SECRET``.
    Supabase webhook delivery is idempotent on the payload, the
    handler is idempotent on the queue (pgmq visibility timeout), so
    duplicate deliveries are a no-op.
    """
    headers = {k.lower(): v for k, v in request.headers.items()}
    if not is_authorized(headers):
        raise HTTPException(status_code=401, detail="unauthorized")

    try:
        result = process_batch()
    except Exception as exc:  # noqa: BLE001 — all reported back to caller
        log.exception("process_batch failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    log.info("process_batch done", extra={"result": result})
    return result
