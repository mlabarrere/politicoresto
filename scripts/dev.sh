#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/dev.sh — one-command local dev boot.
#
#   ./scripts/dev.sh           # boot stack + vercel dev
#   ./scripts/dev.sh --reset   # also run `supabase db reset` (drops local data)
#
# Idempotent: safe to re-run. Skips steps already satisfied.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RESET=0
for arg in "$@"; do
  case "$arg" in
    --reset) RESET=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/dev.sh [--reset]

  (no args)   Boot Supabase stack (if needed), then `vercel dev`.
  --reset     Also run `supabase db reset` (drops local data, re-seeds).

Idempotent: safe to re-run. Skips steps already satisfied.
EOF
      exit 0 ;;
  esac
done

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

info()  { printf '\033[1;34m[dev]\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33m[dev]\033[0m %s\n' "$*" >&2; }
fatal() { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; exit 1; }

# 1. Required CLIs --------------------------------------------------------
for bin in docker supabase vercel node npm; do
  command -v "$bin" >/dev/null 2>&1 || fatal "missing CLI: $bin"
done

# 2. Docker daemon --------------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  fatal "Docker daemon is not running. Start Docker Desktop and retry."
fi

# 3. Supabase local stack -------------------------------------------------
if supabase status >/dev/null 2>&1; then
  info "Supabase stack already running"
else
  info "Starting Supabase stack (first boot pulls images, may take a few min)"
  supabase start
fi

# 4. Apply migrations + seed ---------------------------------------------
if [[ "$RESET" -eq 1 ]]; then
  info "Resetting DB (applying migrations + seed.sql)"
  supabase db reset
else
  info "Skipping db reset (pass --reset to force)"
fi

# 5. Env vars -------------------------------------------------------------
if [[ ! -f frontend/.env.local ]]; then
  warn "frontend/.env.local not found"
  warn "  → cp frontend/.env.local.example frontend/.env.local"
  warn "  → fill NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY with the anon key from \`supabase status\`"
  exit 1
fi

# 6. vercel dev -----------------------------------------------------------
info "Starting vercel dev on http://localhost:3000"
info "  Studio   : http://127.0.0.1:54323"
info "  Inbucket : http://127.0.0.1:54324"
cd frontend
exec vercel dev
