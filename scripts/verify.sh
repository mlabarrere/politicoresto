#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/verify.sh — pre-push verification gate.
#
# Runs the same pipeline CI will run. MUST pass before any `git push`.
#
# Current steps:
#   1. typecheck     (tsc --noEmit)
#   2. unit tests    (vitest run)
#
# Session 3 will extend this with: eslint, prettier --check, knip, supabase db
# lint. Do not add them here without wiring the matching CI job.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root/frontend"

step() { printf '\n\033[1;34m[verify]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[verify]\033[0m %s\n' "$*" >&2; exit 1; }

step "1/2 typecheck"
npm run -s typecheck || fail "typecheck failed"

step "2/2 unit tests"
npm run -s test:unit || fail "unit tests failed"

printf '\n\033[1;32m[verify]\033[0m all checks passed\n'
