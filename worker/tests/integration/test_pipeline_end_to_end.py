"""End-to-end integration: vote → snapshot → pgmq → worker → estimate → view.

These tests drive the full phase-3 plumbing against a running local
Supabase. They are skipped when the stack isn't up, so local runs
without `supabase start` keep passing cleanly.
"""

from __future__ import annotations

import time
import uuid

import pytest

from weighting.pipeline import run
from weighting.settings import WorkerSettings
from weighting.supabase_client import SupabaseClient
from weighting.worker import process_once

pytestmark = pytest.mark.integration


# ───────────────────────── helpers ─────────────────────────


def _seed_poll_with_votes(
    client: SupabaseClient,
    *,
    n: int,
    full_profile_fraction: float = 0.4,
) -> dict[str, object]:
    """Seed a new public poll and ``n`` voters via direct SQL through
    the local DB. Returns the poll + option ids + the seeded user ids.

    Uses psql over the local db URL so we don't have to expose the
    service-role client's INSERTs here.
    """
    import subprocess

    seed_user = "00000000-0000-0000-0000-000000000001"
    poll_id = str(uuid.uuid4())
    topic_id = str(uuid.uuid4())
    opt_a = str(uuid.uuid4())
    opt_b = str(uuid.uuid4())

    sql = f"""
        do $$
        declare
          v_u uuid;
          v_full int := 0;
        begin
          -- Private profile on the seed user.
          insert into public.user_private_political_profile(
            user_id, date_of_birth, postal_code, sex, csp, education
          ) values (
            '{seed_user}', '1990-06-15', '75001', 'F', 'employes', 'bac2'
          ) on conflict (user_id) do update
            set date_of_birth=excluded.date_of_birth,
                postal_code=excluded.postal_code, sex=excluded.sex,
                csp=excluded.csp, education=excluded.education;

          insert into public.topic(id, slug, title, description, created_by, space_id,
                                   topic_status, visibility, open_at, close_at)
          values ('{topic_id}', 'int-{poll_id[:8]}', 'int test', 'desc',
                  '{seed_user}', null, 'open', 'public',
                  now(), now()+interval '30 days');
          insert into public.thread_post(id, thread_id, created_by, content, type)
            values ('{poll_id}', '{topic_id}', '{seed_user}', 'int body', 'poll');
          insert into public.post_poll(post_item_id, question, deadline_at,
                                       poll_status, created_by)
            values ('{poll_id}', 'Q?', now()+interval '1 day', 'open', '{seed_user}');
          insert into public.post_poll_option(id, post_item_id, label, sort_order, is_active)
            values ('{opt_a}', '{poll_id}', 'A', 1, true),
                   ('{opt_b}', '{poll_id}', 'B', 2, true);

          for i in 1..{n} loop
            v_u := gen_random_uuid();
            insert into auth.users(id, email, encrypted_password, email_confirmed_at,
                                   aud, role)
              values (v_u, 'int-{poll_id[:8]}-'||i||'@e.com', 'x', now(),
                      'authenticated', 'authenticated');
            insert into public.app_profile(user_id, display_name)
              values (v_u, 'User '||i);
            -- Give a fraction a real profile so coverage isn't all zero.
            if random() < {full_profile_fraction} then
              insert into public.user_private_political_profile(
                user_id, date_of_birth, postal_code, sex, csp, education
              ) values (
                v_u,
                (date '1960-01-01') + (random() * 365*60)::int,
                lpad((random()*99999)::int::text, 5, '0'),
                (array['F','M','other'])[1 + (random()*3)::int],
                (array['agriculteurs','employes','cadres_professions_intellectuelles',
                       'retraites','professions_intermediaires','ouvriers'])
                  [1 + (random()*6)::int],
                (array['none','bac','bac2','bac3_plus'])[1 + (random()*4)::int]
              );
              v_full := v_full + 1;
            end if;
            perform set_config(
              'request.jwt.claims',
              json_build_object('sub', v_u::text, 'role', 'authenticated')::text,
              true
            );
            perform set_config('role', 'authenticated', true);
            if i % 2 = 0 then
              perform public.submit_post_poll_vote('{poll_id}', '{opt_a}');
            else
              perform public.submit_post_poll_vote('{poll_id}', '{opt_b}');
            end if;
            perform set_config('role', 'postgres', true);
          end loop;
          raise notice 'full_profile_voters=%', v_full;
        end $$;
    """
    db_url = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    proc = subprocess.run(
        ["psql", db_url, "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0 or "ERROR" in proc.stderr.upper():
        raise RuntimeError(
            f"psql seed failed: rc={proc.returncode}\n"
            f"stderr:\n{proc.stderr}\nstdout:\n{proc.stdout}"
        )
    return {
        "poll_id": poll_id,
        "topic_id": topic_id,
        "option_a": opt_a,
        "option_b": opt_b,
    }


def _cleanup_poll(poll_id: str, topic_id: str) -> None:
    import subprocess

    db_url = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    subprocess.run(
        ["psql", db_url, "-c",
         f"delete from public.thread_post where id = '{poll_id}'; "
         f"delete from public.topic where id = '{topic_id}';"],
        capture_output=True, text=True, check=False,
    )


def _purge_queue() -> None:
    """Empty the weighting queue so tests don't see stale messages
    from prior runs. pgmq.purge_queue truncates the underlying table."""
    import subprocess

    db_url = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    subprocess.run(
        ["psql", db_url, "-c", "select pgmq.purge_queue('weighting');"],
        capture_output=True, text=True, check=False,
    )


@pytest.fixture(autouse=True)
def _isolate_queue() -> None:
    """Fresh queue state per test."""
    _purge_queue()


# ───────────────────────── tests ─────────────────────────


def test_pipeline_writes_estimate_for_seeded_poll(
    client: SupabaseClient, settings: WorkerSettings
) -> None:
    """The direct `pipeline.run(poll_id)` path — no worker loop."""
    handles = _seed_poll_with_votes(client, n=100, full_profile_fraction=0.7)
    poll_id = handles["poll_id"]
    try:
        outcome = run(client, poll_id)  # type: ignore[arg-type]
        assert outcome.poll_id == poll_id
        assert outcome.n_respondents == 100
        assert outcome.confidence_band in ("indicatif", "correctable", "robuste")
        assert 0 <= outcome.confidence_score <= 100
        assert outcome.ref_as_of == "2021-01-01"  # INSEE RP 2021 seed

        # The view should now surface the non-zero estimate fields.
        import httpx
        view = httpx.get(
            f"{settings.supabase_url_str}/rest/v1/v_post_poll_summary",
            params={"post_item_id": f"eq.{poll_id}", "select": "*"},
            headers={
                "apikey": settings.supabase_service_role_key,
                "authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            timeout=10,
        )
        view.raise_for_status()
        rows = view.json()
        assert len(rows) == 1
        row = rows[0]
        assert row["sample_size"] == 100
        assert row["confidence_band"] == outcome.confidence_band
        assert int(row["confidence_score"]) == outcome.confidence_score
        assert row["is_final"] is False
    finally:
        _cleanup_poll(handles["poll_id"], handles["topic_id"])  # type: ignore[arg-type]


def test_worker_loop_drains_queue_and_archives(
    client: SupabaseClient, settings: WorkerSettings
) -> None:
    """Run one iteration of the worker loop against real pgmq messages."""
    handles = _seed_poll_with_votes(client, n=60, full_profile_fraction=0.5)
    poll_id = handles["poll_id"]
    try:
        # 60 snapshot inserts → 60 pgmq messages. Expect the worker to
        # dedupe them and process ONE pipeline run per poll_id.
        import subprocess
        db_url = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
        pre_depth = subprocess.run(
            ["psql", db_url, "-t", "-A", "-c",
             f"select count(*) from pgmq.q_weighting "
             f"where (message->>'poll_id')::uuid = '{poll_id}';"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        assert int(pre_depth) >= 1, f"expected queue to have messages, got {pre_depth}"

        processed = process_once(client, settings)
        assert processed >= 1, f"expected at least one poll processed, got {processed}"

        # Give the archive RPC a moment to commit visibility changes.
        time.sleep(0.1)
        post_depth = subprocess.run(
            ["psql", db_url, "-t", "-A", "-c",
             f"select count(*) from pgmq.q_weighting "
             f"where (message->>'poll_id')::uuid = '{poll_id}';"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        # Not all messages are necessarily archived in one batch
        # (batch_size cap) but at least the ones we read should be gone.
        assert int(post_depth) < int(pre_depth), (
            f"queue depth didn't drop: pre={pre_depth} post={post_depth}"
        )

        # Estimate row exists.
        import httpx
        est = httpx.get(
            f"{settings.supabase_url_str}/rest/v1/survey_poll_estimate",
            params={"poll_id": f"eq.{poll_id}", "select": "*"},
            headers={
                "apikey": settings.supabase_service_role_key,
                "authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            timeout=10,
        )
        est.raise_for_status()
        rows = est.json()
        assert len(rows) == 1
        assert rows[0]["n_respondents"] == 60
    finally:
        _cleanup_poll(handles["poll_id"], handles["topic_id"])  # type: ignore[arg-type]


def test_pipeline_rejects_poll_without_snapshots(client: SupabaseClient) -> None:
    from weighting.pipeline import PipelineInputError
    random_poll = str(uuid.uuid4())
    with pytest.raises(PipelineInputError):
        run(client, random_poll)


def test_final_flag_is_written_when_requested(
    client: SupabaseClient, settings: WorkerSettings
) -> None:
    handles = _seed_poll_with_votes(client, n=30, full_profile_fraction=0.6)
    poll_id = handles["poll_id"]
    try:
        run(client, poll_id, is_final=True)  # type: ignore[arg-type]
        import httpx
        est = httpx.get(
            f"{settings.supabase_url_str}/rest/v1/survey_poll_estimate",
            params={"poll_id": f"eq.{poll_id}", "select": "is_final"},
            headers={
                "apikey": settings.supabase_service_role_key,
                "authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            timeout=10,
        )
        rows = est.json()
        assert len(rows) == 1
        assert rows[0]["is_final"] is True
    finally:
        _cleanup_poll(handles["poll_id"], handles["topic_id"])  # type: ignore[arg-type]
