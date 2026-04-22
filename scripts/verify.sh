#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/verify.sh — pre-push verification gate.
#
# This script is the ONE source of truth for "is this ready to push?".
# CI (`.github/workflows/ci.yml`) calls this same script — no divergence.
#
# Steps (cheap → expensive, so early failures are fast):
#   1. prettier --check     — formatting gate
#   2. eslint               — Vercel Style Guide + project rules, max-warnings=0
#   3. auth grep guards     — forbidden patterns our ESLint can't catch
#   4. typecheck            — tsc --noEmit
#   5. unit tests           — vitest run
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root/frontend"

step() { printf '\n\033[1;34m[verify]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[verify]\033[0m %s\n' "$*" >&2; exit 1; }

step "1/5 prettier --check"
./node_modules/.bin/prettier --check . || fail "prettier found formatting issues — run 'prettier --write .'"

step "2/5 eslint (max-warnings=0)"
./node_modules/.bin/eslint . --max-warnings=0 || fail "eslint failed"

step "3/5 auth guard greps"
# Forbidden patterns the Vercel guide / ESLint can't cleanly express.
#
#   a) @supabase/auth-helpers-nextjs is the legacy auth lib; banned by Session 2.
#   b) createClient / createBrowserClient / createServerClient outside the
#      sanctioned 4 factories in lib/supabase/ signals ad-hoc client creation.
#   c) auth.getSession() in server contexts — reads cookie without verification.

auth_helpers_hits=$(grep -rEn "@supabase/auth-helpers-nextjs" --include='*.ts' --include='*.tsx' --include='package.json' --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null || true)
if [ -n "$auth_helpers_hits" ]; then
  printf '%s\n' "$auth_helpers_hits" >&2
  fail "legacy @supabase/auth-helpers-nextjs detected — use @supabase/ssr only"
fi

# Flag actual client factory CALLS outside lib/supabase/, not just imports —
# type imports from @supabase/ssr are fine. Callback route is the documented
# exception: it creates a createServerClient with a custom cookie bridge that
# writes to a specific NextResponse (see app/auth/callback/route.ts header
# + .claude/skills/authentication/reference/supabase-auth-nextjs.md).
adhoc_clients=$(grep -rEn "createBrowserClient\(|createServerClient\(|createClient\(" --include='*.ts' --include='*.tsx' app components lib 2>/dev/null | grep -v "^lib/supabase/" | grep -v "^app/auth/callback/route.ts" | grep -v "tests/" || true)
if [ -n "$adhoc_clients" ]; then
  printf '%s\n' "$adhoc_clients" >&2
  fail "Supabase client created outside lib/supabase/ — use one of the four canonical factories"
fi

# getSession() calls are only allowed in @supabase internal code (node_modules)
# and inside our own auth-user.ts / middleware.ts — currently NONE of our code
# uses it. Flag any occurrence in app code.
getsession_hits=$(grep -rEn "auth\.getSession\(\)" --include='*.ts' --include='*.tsx' app lib components 2>/dev/null || true)
if [ -n "$getsession_hits" ]; then
  printf '%s\n' "$getsession_hits" >&2
  fail "auth.getSession() is forbidden in server contexts — use auth.getClaims()"
fi

printf '  [ok] no forbidden auth patterns\n'

step "4/5 typecheck"
npm run -s typecheck || fail "typecheck failed"

step "5/5 unit tests"
npm run -s test:unit || fail "unit tests failed"

printf '\n\033[1;32m[verify]\033[0m all checks passed\n'
