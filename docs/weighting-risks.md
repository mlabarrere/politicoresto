# Weighting worker — risk register

Top 10 risks for the v1 initiative. Re-reviewed at every phase gate.

| # | Risk | Prob | Impact | Mitigation | Owner | Re-evaluate when |
|---|---|---|---|---|---|---|
| R1 | samplics behaves differently from R `survey` on our bounded-linear setting, silently producing off-target weights | med | high | Phase-2 **differential** and **external-benchmark** tests against a published INSEE/Pew case reproduce within ε=1e-6 before ANY pipeline work. Divergence halts the phase, does not get patched. | Worker | Phase 2 gate |
| R2 | INSEE CSV encoding/separator assumptions are wrong, corrupting reference data | high | high | Seed script re-downloads and checksums the source file. Loader fails loudly on row-count mismatch. No hardcoded column order. | Worker | Phase 1 seed run |
| R3 | Confidence score < 40 on every real poll (tiny user base) — UX looks perpetually "indicatif", user loses trust | high | med | Expected early behaviour; `/methodologie` frames it honestly. As panel grows, band shifts up organically. Not a bug. | Founder (comms) | Post-launch metrics |
| R4 | Corrected results diverge from truth more than raw on a benchmark — methodology is worse than nothing | low | critical | **Phase 4 acceptance criterion**: at least 2/3 external benchmarks must show corrected beating raw. Failing this halts release. | Founder | Phase 4 gate |
| R5 | Unknown-bucket target (K-1a) is wrong → respondents with missing fields get mis-weighted | med | med | Target is seeded from INSEE's own non-response rates, documented line-by-line in the seed script. Reviewable, versionable. Fall back to excluding incomplete respondents (K-1d) if the bucket proves unstable. | Worker | Phase 4 benchmarks |
| R6 | `submit_post_poll_vote` transaction now touches 3+ tables → higher lock contention, slower votes | med | low | Indexes on snapshot `(poll_id)`; the RPC is still a single tx, single INSERT per table. Measured in phase 3 integration with 500-row fixture. | Worker | Phase 3 load test |
| R7 | Wiping the 241 legacy users cascades into data we wanted to keep (e.g. election_result relations) | low | high | Dry-run the wipe inside `begin…rollback`, diff before/after counts per table, founder reviews. Preserve-list explicit. | Founder | Phase 1 pre-merge |
| R8 | pgmq queue grows unbounded under a vote surge, blowing through Supabase compute | low | med | Worker polls every 2s, dedupes by poll_id. Monitor queue depth via a `/healthz` Prometheus-style metric. Add alert at depth > 500 post-launch. | Worker | Post-launch |
| R9 | Converting 6 SECURITY DEFINER views to INVOKER (J-1) breaks RLS assumptions on unrelated reads (`v_feed_global`, `v_thread_detail`, etc.) | med | high | One view converted at a time, each behind its own migration with an integration test run against an anon session, authed session, and an impersonated foreign-session. If a view doesn't cleanly flip, revert that migration in isolation. | Worker | Phase 1 per-migration |
| R10 | Methodology page misreads French legal obligations (Commission des Sondages, AAPOR alignment) — accusation of misleading political polling | low | critical | I-1 decision deferred; page explicitly disclaims representativeness, frames data as a "consultation non représentative". Founder reviews copy before release. Legal opinion sought post-v1 before any expansion. | Founder | Phase 4 pre-merge |

## Triggers for re-evaluation

- New applied migration on prod → re-run advisors, re-check R9.
- Any benchmark regression (phase 4 and beyond) → re-open R4, R5.
- Growth of active voter base > 10x → re-open R3, R8.
- Major samplics release (0.7+, or successor `svy`) → re-open R1.
