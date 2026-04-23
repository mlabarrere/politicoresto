begin;

-- ─────────────────────────────────────────────────────────────
-- Weighting worker — phase 1, migration 1/4
--
-- Adds optional demographic fields on user_private_political_profile
-- required for Deville-Särndal calibration (marginals: age_bucket×sex,
-- region, csp, education, past_vote_pr1_2022).
--
-- All nullable — collected progressively via /me completion nudge,
-- never required at onboarding. Missing fields are handled by the
-- "unknown bucket" strategy at weighting time (see docs/weighting-
-- architecture.md §5.2).
--
-- age_bucket and region are NOT stored directly — they are derived
-- at snapshot time from date_of_birth and postal_code respectively.
-- ─────────────────────────────────────────────────────────────

alter table public.user_private_political_profile
  add column if not exists sex text,
  add column if not exists csp text,
  add column if not exists education text;

-- Sex: F/M/other/null. INSEE convention.
alter table public.user_private_political_profile
  drop constraint if exists user_private_political_profile_sex_check;
alter table public.user_private_political_profile
  add constraint user_private_political_profile_sex_check
  check (sex is null or sex in ('F','M','other'));

-- Education: INSEE simplified 4-level ladder.
alter table public.user_private_political_profile
  drop constraint if exists user_private_political_profile_education_check;
alter table public.user_private_political_profile
  add constraint user_private_political_profile_education_check
  check (education is null or education in ('none','bac','bac2','bac3_plus'));

-- CSP: free text, validated against the INSEE 8-category list by the
-- frontend form. We do NOT enum-constrain because the INSEE taxonomy
-- evolves (PCS 2020 replaces PCS 2003), and we want to absorb that
-- without a migration. A check-constraint against a known list lives
-- in the RPC layer when data is read for weighting.

commit;
