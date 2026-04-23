# Audit Findings — 2026-04-23

Scope: pre-work audit for the **survey weighting worker** (Deville-Särndal calibration, samplics).
Source of truth: live Supabase (staging + prod), live Vercel deployments, the repo on disk.

---

## 1. Supabase — production (`gzdpisxkavpyfmhsktcg`)

Region: `eu-central-1`. Postgres 17.6.1.084. Status: `ACTIVE_HEALTHY`.

### Poll-related tables (all exist, RLS enabled)

| Table | Columns of note | Rows |
|---|---|---|
| `post_poll` | `post_item_id (pk)`, `question`, `deadline_at`, `poll_status`, `created_by` | 0 |
| `post_poll_option` | `id (pk)`, `post_item_id`, `label`, `sort_order`, `is_active` | 0 |
| `post_poll_response` | `id, post_item_id, option_id, user_id, weight numeric, answered_at` — **`weight` already exists**, currently unused | 0 |

**Missing (to be created by the worker initiative):** `survey_ref_marginal`, `survey_ref_cell`, `survey_respondent_snapshot`, `survey_poll_weights`, `survey_poll_estimate`. None of the names mentioned in the legacy `technique.md` (`post_poll_target_distribution`, `post_poll_snapshot`) exist either.

### Profile tables

- `public.app_profile` (241 rows): `user_id, username, display_name, bio, avatar_url, public_territory_id, profile_status, is_public_profile_enabled, resolved_city, has_seen_completion_nudge`.
- `public.user_private_political_profile` (241 rows): `user_id, declared_partisan_term_id, declared_ideology_term_id, political_interest_level, notes_private, profile_payload jsonb, date_of_birth, postal_code`.
- `public.profile_vote_history` (0 rows): `id, user_id, election_id, election_result_id, choice_kind, confidence, notes, declared_at`.

**Demographic fields currently present:** DOB, postal_code, resolved_city, political_interest_level, declared_partisan/ideology (as term IDs), past vote per election (via `profile_vote_history`).

**Demographic fields MISSING for weighting:** `sex`, `csp` (socioprofessional category), `education`, `age_bucket` (derived from DOB), `region` (derived from postal_code → city → région via geo.api.gouv.fr, not yet stored).

Past vote: there's a `profile_vote_history` table designed for multi-election history. It points to `election_result_id`, which would require resolving "who the user voted for in presidential 2022 round 1". The table is currently empty in prod and has 13 rows in staging. The join path exists; the data doesn't.

### RPCs

- `submit_post_poll_vote(p_post_item_id uuid, p_option_id uuid) returns SETOF v_post_poll_summary` — **security definer**, inserts `post_poll_response` with `on conflict (post_item_id, user_id) do nothing`, raises `Already voted` on row_count=0, returns summary. No demographic snapshot is written. This is the function we must extend.
- `create_post_poll`, `rpc_create_poll`, `rpc_update_post_poll`, `can_read_post_poll` — poll lifecycle.
- `rpc_update_profile_demographics(p_date_of_birth, p_postal_code, p_resolved_city)` — writes DOB + postal + resolved city, enforces age ≥ 18.

### Views

- `v_post_poll_summary` — **SECURITY DEFINER** (flagged by advisor). Already exposes the full weighting contract with zero-filled placeholders: `sample_size`, `effective_sample_size`, `representativity_score`, `coverage_score`, `distance_score`, `stability_score`, `anti_brigading_score`, `raw_results`, `corrected_results`. `raw_results == corrected_results` today (no weighting), all 4 "score" columns are `0::numeric`.
- Others: `v_feed_global`, `v_thread_detail`, `v_thread_posts`, `v_post_comments`, `user_visibility_settings`.

**Consequence for frontend contract:** the frontend already fetches all weighting fields (see §3). We can land the worker without breaking the client contract — we just fill columns that currently read as 0.

### Extensions

| Needed | Status |
|---|---|
| `pgmq` 1.5.1 | available, **NOT installed** |
| `pg_cron` 1.6.4 | available, **NOT installed** |
| `pg_net` 0.20.0 | available, NOT installed |

All required extensions are available on both projects and can be enabled via `create extension`.

### Advisors (security)

- **6 × ERROR `security_definer_view`**: `v_feed_global, v_thread_detail, v_post_comments, v_thread_posts, user_visibility_settings, v_post_poll_summary`. Pre-existing. Not caused by us. Worth flagging as a separate hardening ticket but **out of scope** for the weighting initiative.
- 7 × WARN `function_search_path_mutable` (includes `can_read_post_poll`, `can_read_topic`, etc.).
- WARN `extension_in_public` for `citext`.
- WARN `auth_leaked_password_protection`.

### Migrations

Latest 5: `20260422130000_fix_poll_summary_view_security.sql`, `20260422140000_poll_vote_reject_revote.sql`, `20260423080000_post_edit_sync_topic_title.sql`, `20260423080500_poll_edit_rpc.sql`, `20260423081000_profile_demographics.sql`. Format: `YYYYMMDDHHMMSS_slug.sql`. Forward-only, idempotent (`create or replace`, `drop trigger if exists`).

---

## 2. Supabase — staging (`nvwpvckjsvicsyzpzjfi`)

Region: `eu-west-1`. Postgres 17.6.1.104. `ACTIVE_HEALTHY`. Created 2026-04-20.

**Schema is structurally identical to prod** (same tables, RPCs, views, advisors). Data differs: 2 users vs 241, 1 poll with 1 response vs 0 polls, 13 `profile_vote_history` rows vs 0.

**Diff vs prod:** staging carries almost no data. Prod has the full 241-user baseline; staging is a sandbox. No schema drift detected by eye.

---

## 3. Frontend (`frontend/`)

- Next.js `16.2.4` (exact pin), React 19.1, Tailwind v4, TypeScript, `@supabase/ssr ^0.10.2`, `@supabase/supabase-js ^2.56.0`, Pino, zod, @t3-oss/env-nextjs, @base-ui/react.
- Poll code touchpoints:
  - `app/api/polls/vote/route.ts` — POST `/api/polls/vote` → `supabase.rpc('submit_post_poll_vote', { p_post_item_id, p_option_id })`, returns a `v_post_poll_summary` row.
  - `lib/data/public/polls.ts` — reads `v_post_poll_summary` selecting **every weighting column** (`effective_sample_size, representativity_score, coverage_score, distance_score, stability_score, anti_brigading_score, raw_results, corrected_results`).
  - `lib/polls/summary.ts` — `normalizePostPollSummary` — already typed for weighted output; points carry `response_count, weighted_count, share`.
  - `lib/types/views.ts` — `PostPollSummaryView` interface matches the view 1:1.
  - Components: `components/poll/poll-card-inline.tsx`, `components/poll/poll-results.tsx`, `components/poll/poll-status-badge.tsx`, `components/forum/poll-edit-form.tsx`.
- Profile demographic touchpoints: `components/profile/demographics-form.tsx` (DOB + postal only), `lib/data/authenticated/profile-completion.ts`, `lib/actions/profile.ts`. No UI yet for sex, csp, education, past_vote_pr1.

**Key observation:** the frontend contract already anticipates weighting. Landing corrected numbers requires **no frontend breaking change** — it requires filling the existing 0-valued columns.

**Contract mismatch with the prompt:** the prompt specifies **4 sub-scores** (Kish, coverage, variability, top-5% concentration). The DB view and TS types carry **5 different sub-scores** (`representativity_score, coverage_score, distance_score, stability_score, anti_brigading_score`). This is a naming/semantic divergence we must resolve before implementation. See Question C-3.

---

## 4. Vercel

- Team: `marto` (slug `martoai`, id `team_dtQxC8zai4q50Q3TZYTpEE4H`).
- Project: `politicoresto` (id `prj_b15gNeONdFMhO92MmIbgKheBQKYw`). A second empty project `frontend` exists (no deployments) — dead, worth cleaning up separately.
- Latest production deployment (`target=production`): `dpl_9Ur4HMuL4owLc7PDLWUKdKubbAKu`, state `READY`, commit `b7ed93b` (2026-04-20).
- Recent 20 deployments all `READY`.
- `frontend/vercel.json` disables Vercel's Git integration — deploys only via GitHub Actions, as documented.
- Worker will **not** be deployed to Vercel. No Vercel env vars need to change for the worker itself; the frontend gains one boolean flag `WEIGHTING_ENABLED` (Question H-1).

Runtime log sampling skipped (deployments healthy, no user-reported poll errors, vote flow is greenfield — 0 rows).

---

## 5. Reference data

- **Nothing seeded** for survey reference data. `supabase/seed.sql` and `supabase/seed/` contain election history, parties, subjects — no population marginals.
- `profile_vote_history` table is shaped for past-vote declarations but is empty in prod (13 test rows in staging).
- `election_result` has 109 rows — actual historical results by candidate. Useful as reference for the "true" 2022 PR1 distribution but **not** for user self-declaration.
- Official INSEE sources and Ministère de l'Intérieur URLs not yet verified (deferred to phase 1 seed work).

---

## 6. GitHub

- Repo: `https://github.com/mlabarrere/politicoresto.git`.
- Default branch: `main`. CI workflows: `ci.yml`, `deploy-preview.yml`, `deploy-production.yml`, `migrate-staging.yml`, `migrate-production.yml`. `ci.yml` skips doc-only and `.claude/skills/**` changes.
- Secret naming convention observed: `SUPABASE_*`, `STAGING_*`, `PROD_*` (inferred from existing migrate-*.yml — not inspected in depth).
- **Worker repo `politicoresto-weighting-worker` does NOT exist yet** (confirmed via `gh repo view` → 404). Must be created in phase 1.
- Authenticated `gh` CLI as `mlabarrere`.

---

## 7. Gaps and open questions (feed into the question batch)

**Hard blockers before writing any code:**

1. Missing demographic fields on users: `sex`, `csp`, `education`, self-reported `past_vote_pr1_2022`. 241 existing users have **zero** of these populated. Weighting on only 2 or 3 dimensions is possible but weaker.
2. Naming/semantic divergence: the existing view exposes 5 sub-scores (`representativity, coverage, distance, stability, anti_brigading`); the prompt specifies 4 (Kish/coverage/variability/top-5). We need to decide which set is canonical.
3. No seed / no reference data loader exists. Must build from scratch.
4. `pgmq` not installed on either project.
5. `profile_vote_history` is a multi-election store pointing to `election_result_id` — richer than a single `past_vote_pr1_2022` string. Worth discussing whether the worker joins against it or we add a denormalised column.

**Soft blockers (design choices):**

6. RPC evolution strategy (modify `submit_post_poll_vote` in-place vs. v2 wrapper).
7. Partial-profile vote handling (reject vs. snapshot with flags vs. best-effort weight).
8. Worker triggering (long-poll pgmq from Railway vs. pg_cron HTTP push).
9. Debounce window (30s? 60s? on-poll-close final?).
10. Reference data governance (seed-only vs. admin UI) and versioning (`ref_as_of` date stamp).
11. Confidence-below-40 UX fallback.
12. Methodology page scope.
13. Legal/editorial posture (Commission des Sondages registration status; AAPOR-aligned language).
14. Rollback feature flag wiring.

**Environment prerequisites to confirm with the user:**

15. Railway account existence and preferred region (EU, ideally).
16. GitHub Actions secret provisioning (`SUPABASE_SERVICE_ROLE_KEY` duplicated in the worker repo, `RAILWAY_TOKEN`).
17. Whether to keep/drop the empty Vercel `frontend` project.

The consolidated numbered question batch with proposed defaults follows in the next message.
