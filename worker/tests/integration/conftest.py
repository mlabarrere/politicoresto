"""Integration-layer fixtures — require a running local Supabase stack.

Skip gracefully when the stack is down so local contributors who haven't
run ``supabase start`` aren't blocked. CI runs the integration layer in
its own job with the stack up.
"""

from __future__ import annotations

import os
import subprocess
from collections.abc import Iterator

import pytest

from weighting.settings import WorkerSettings
from weighting.supabase_client import SupabaseClient


def _local_supabase_env() -> dict[str, str]:
    raw = subprocess.run(
        ["supabase", "status", "-o", "env"],
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    if raw.returncode != 0:
        raise RuntimeError(
            f"`supabase status` returned {raw.returncode}: {raw.stderr}"
        )
    out: dict[str, str] = {}
    for line in raw.stdout.splitlines():
        line = line.strip()
        if not line or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k] = v.strip('"')
    return out


@pytest.fixture(scope="session")
def supabase_env() -> dict[str, str]:
    try:
        return _local_supabase_env()
    except (FileNotFoundError, RuntimeError) as e:
        pytest.skip(f"local Supabase stack not available: {e}")


@pytest.fixture(scope="session")
def settings(supabase_env: dict[str, str]) -> WorkerSettings:
    api_url = supabase_env.get("API_URL")
    service_key = supabase_env.get("SERVICE_ROLE_KEY") or supabase_env.get("SECRET_KEY")
    if not api_url or not service_key:
        pytest.skip("`supabase status` output missing API_URL / service role key")
    os.environ["SUPABASE_URL"] = api_url
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = service_key
    return WorkerSettings()  # type: ignore[call-arg]


@pytest.fixture
def client(settings: WorkerSettings) -> Iterator[SupabaseClient]:
    c = SupabaseClient(settings)
    yield c
    c.close()
