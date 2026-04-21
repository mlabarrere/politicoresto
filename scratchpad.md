# Session 3 Final Phase — Scratchpad

## Plan

1. Close deferred: /api/\_log forwarder, knip retry, log drain decision
2. Get PR #38 green + merged → preview deploys
3. Manual smoke: 9 user stories against preview (Chrome MCP)
4. Playwright E2E specs × 9 user stories + CI job + CLAUDE.md rule
5. Close-out report

## Open questions

- E2E sign-in: project is OAuth-only. Mock via supabase admin signInWithPassword (need seed user) OR use MSW-like stub OR set cookies directly from a test helper. Probably: call supabase `exchangeCodeForSession` via a route handler with a test-only bypass.
- Vercel Preview is SSO-gated; curl blocked; E2E against preview = Chrome with existing SSO only.

## Done log

- scratchpad up
