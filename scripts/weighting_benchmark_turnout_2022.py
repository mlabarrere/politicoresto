"""Editorial benchmark — does our pipeline retrieve INSEE's real PR1 2022 turnout?

Creates a synthetic panel on a target Supabase (staging or local) that
mirrors the self-selection bias we expect on PoliticoResto: young, urban,
politically engaged, over-declared turnout. Asks the calibration pipeline
to correct it. Compares:

    RAW turnout (what panel self-declares)
    CORRECTED turnout (after Deville-Särndal redressement)
    TRUTH (INSEE: PR1 2022 = 73.69 % of registered voters)

If CORRECTED is measurably closer to TRUTH than RAW, the pipeline is
doing its editorial job. If not, something is wrong in calibration or
marginals, even if the math tests pass.

Usage:

    # against staging (recommended — full stack exercised)
    SUPABASE_URL=https://<staging>.supabase.co \
    SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
    python scripts/weighting_benchmark_turnout_2022.py

    # against local
    supabase start
    python scripts/weighting_benchmark_turnout_2022.py

The script is idempotent on re-runs — it wipes its own fixtures at the
end (controlled by a prefixed poll title).
"""

from __future__ import annotations

import os
import random
import sys
from dataclasses import dataclass

import httpx

INSEE_PR1_2022_TURNOUT_PCT = 73.69  # Ministère de l'Intérieur, official
# Over-declaration of PR1 turnout on a self-selected politically engaged
# panel is typically ~10-15 points above official turnout. We target 88 %
# raw, to see if calibration brings us back towards 74 %.
PANEL_SIZE = 120
PANEL_RAW_TURNOUT_RATE = 0.88

# Demographic composition of our synthetic bias: young urban men dominate,
# retirees and women under-represented. Loosely mirrors the "young urban
# politically engaged" skew documented in AAPOR / Pew.
AGE_BUCKET_DIST = {"18_24": 0.22, "25_34": 0.38, "35_49": 0.25, "50_64": 0.12, "65p": 0.03}
SEX_DIST = {"M": 0.62, "F": 0.38}
POSTAL_DIST = {
    # Paris + proche banlieue
    "75001": 0.12, "75011": 0.10, "75019": 0.08, "92100": 0.05, "93100": 0.04,
    # Grandes villes
    "69001": 0.08, "13001": 0.07, "31000": 0.06, "33000": 0.05, "44000": 0.04,
    # Reste (sous-représenté volontairement)
    "59000": 0.05, "76000": 0.04, "45000": 0.03, "67000": 0.03, "21000": 0.02,
    "03000": 0.02, "15000": 0.02, "55000": 0.02, "08000": 0.02, "04100": 0.02,
    "971-00": 0.02, "972-00": 0.01, "974-00": 0.01,
}
CSP_DIST = {
    "cadres": 0.38, "professions_intermediaires": 0.22, "employes": 0.18,
    "ouvriers": 0.06, "retraites": 0.05, "sans_activite": 0.08,
    "artisans_commercants": 0.02, "agriculteurs": 0.01,
}
EDUCATION_DIST = {"master_plus": 0.48, "bac3": 0.22, "bac2": 0.15, "bac": 0.10, "cap_bep": 0.04, "aucun": 0.01}


def _bucket_dob(bucket: str) -> str:
    """Pick a birth date that falls in the INSEE age bucket, as of 2026-01-01."""
    ranges = {
        "18_24": (18, 24), "25_34": (25, 34), "35_49": (35, 49),
        "50_64": (50, 64), "65p": (65, 85),
    }
    lo, hi = ranges[bucket]
    age = random.randint(lo, hi)
    year = 2026 - age
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return f"{year:04d}-{month:02d}-{day:02d}"


def _sample(dist: dict[str, float]) -> str:
    r = random.random()
    acc = 0.0
    for k, p in dist.items():
        acc += p
        if r <= acc:
            return k
    return next(iter(dist))


@dataclass
class Env:
    url: str
    service_key: str


def env() -> Env:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required. "
            "Get the staging/prod key from "
            "https://supabase.com/dashboard/project/<ref>/settings/api-keys"
        )
    return Env(url=url.rstrip("/"), service_key=key)


def _rpc(e: Env, fn: str, body: dict) -> httpx.Response:
    r = httpx.post(
        f"{e.url}/rest/v1/rpc/{fn}",
        headers={
            "apikey": e.service_key,
            "Authorization": f"Bearer {e.service_key}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=30.0,
    )
    return r


def main() -> None:
    random.seed(42)
    e = env()
    print(f"→ target: {e.url}")
    print(f"→ panel size: {PANEL_SIZE} synthetic voters")
    print(f"→ truth: INSEE PR1 2022 turnout = {INSEE_PR1_2022_TURNOUT_PCT} %")

    # The script is a placeholder for the real benchmark. The hard work
    # is to create users with profile_vote_history populated — which
    # requires either a service-role SQL endpoint or a set of admin
    # RPCs we haven't shipped yet. Blocked by:
    #
    #   TODO(phase-4-benchmark): ship `bench_seed_voter` and
    #   `bench_wipe_fixtures` SECURITY DEFINER RPCs on staging so this
    #   script can populate profile_vote_history + cast votes without
    #   a raw SQL endpoint. Currently PostgREST only exposes RPCs, not
    #   arbitrary SQL. We could use a Supabase Edge Function, but the
    #   simplest is two RPCs.
    #
    # Until those ship, run the benchmark via psql directly against
    # the local DB:
    #
    #   DATABASE_URL=$(supabase status -o env | grep DB_URL | cut -d'"' -f2) \
    #     psql "$DATABASE_URL" -f scripts/weighting_benchmark_turnout_2022.sql
    #
    # A SQL version is in the same file name with .sql extension.
    sys.exit(
        "benchmark script not fully wired to PostgREST — see TODO in source. "
        "Run the SQL version against local DB for a quick signal:\n"
        "  psql \"$DB_URL\" -f scripts/weighting_benchmark_turnout_2022.sql"
    )


if __name__ == "__main__":
    main()
