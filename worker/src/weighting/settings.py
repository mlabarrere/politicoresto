"""Runtime configuration for the weighting worker.

All values come from environment variables — the worker is expected to
be a 12-factor process on Railway (or whatever deploy target). Local
development reads ``worker/.env`` via ``pydantic-settings``.

The canonical example ``.env`` ships as ``worker/.env.example``.
"""

from __future__ import annotations

from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    """Typed env config for the worker process."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Supabase access (service role — never client-exposed) ──
    supabase_url: HttpUrl = Field(
        ...,
        alias="SUPABASE_URL",
        description="Supabase project API URL, e.g. http://127.0.0.1:54321 in local dev.",
    )
    supabase_service_role_key: str = Field(
        ...,
        alias="SUPABASE_SERVICE_ROLE_KEY",
        description="Supabase service-role JWT. Bypasses RLS — never ships client-side.",
        min_length=20,
    )

    # ── Queue + loop tuning ──
    pgmq_queue_name: str = Field(
        "weighting",
        alias="PGMQ_QUEUE_NAME",
        description="pgmq queue for poll_id messages. Matches the schema migration.",
    )
    dedupe_window_seconds: float = Field(
        30.0,
        alias="DEDUPE_WINDOW_SECONDS",
        description="How long to batch and dedupe messages by poll_id before processing.",
        gt=0,
        le=600,
    )
    poll_interval_seconds: float = Field(
        2.0,
        alias="POLL_INTERVAL_SECONDS",
        description="pgmq long-poll interval when the queue is idle.",
        gt=0,
        le=60,
    )
    visibility_timeout_seconds: int = Field(
        120,
        alias="PGMQ_VISIBILITY_TIMEOUT_SECONDS",
        description="How long a read-but-not-archived message stays invisible.",
        gt=0,
    )
    batch_size: int = Field(
        32,
        alias="PGMQ_BATCH_SIZE",
        description="Max messages drawn per pgmq.read call.",
        gt=0,
        le=1000,
    )
    max_retries: int = Field(
        5,
        alias="PGMQ_MAX_RETRIES",
        description="Move a message to the dead-letter queue after this many read attempts.",
        ge=1,
    )

    # ── Logging ──
    log_level: str = Field(
        "INFO",
        alias="LOG_LEVEL",
        description="structlog level: TRACE|DEBUG|INFO|WARN|ERROR.",
    )

    @property
    def supabase_url_str(self) -> str:
        """String form without trailing slash, for URL joins."""
        return str(self.supabase_url).rstrip("/")


def load_settings() -> WorkerSettings:
    """Read and validate the environment. Raises pydantic ValidationError
    if required values are missing or malformed."""
    return WorkerSettings()  # type: ignore[call-arg]
