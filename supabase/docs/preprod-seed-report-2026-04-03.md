# preprod-seed-report-2026-04-03 (historique)

Statut: document historique / diagnostic ponctuel.
Reference canonique: ../../docs/README.md et ../../docs/front-back-contract.md.

---

# Preproduction Seed Report - 2026-04-03

## Scope

- Project audited through Supabase MCP: `gzdpisxkavpyfmhsktcg`
- Goal: verify schema fitness, validate preproduction UX data coverage, and avoid duplicate or destructive seeding

## Real schema audit

Confirmed core tables:

- `app_profile`
- `space`
- `space_scope`
- `topic`
- `prediction_question`
- `prediction_option`
- `prediction_submission`
- `prediction_submission_history`
- `post`
- `poll`
- `poll_question`
- `poll_option`
- `poll_response`
- `topic_resolution`
- `topic_resolution_source`
- `territory_reference`
- `territory_closure`
- `card_family`
- `card_catalog`
- `user_card_inventory`
- `reputation_ledger`
- `home_feed_topic_cache`
- `topic_public_summary_cache`
- `topic_prediction_aggregate_cache`
- `territory_prediction_rollup_cache`

Confirmed public views:

- `v_public_profiles`
- `v_public_user_card_showcase`
- `v_poll_public_results`
- `v_my_card_inventory`
- `v_my_prediction_history`
- `v_my_reputation_summary`
- `v_territory_rollup_topic_count`
- `v_resolution_audit_trail`

Key enums confirmed:

- `topic_status`
- `visibility_level`
- `prediction_type`
- `prediction_scoring_method`
- `prediction_aggregation_method`
- `post_type`
- `post_status`
- `poll_status`
- `poll_question_type`
- `resolution_status`
- `space_type`
- `territory_level`
- `card_family_type`
- `card_rarity`
- `card_grant_reason_type`
- `reputation_event_type`

Important schema divergences from product shorthand:

- `pending_resolution` is not a `topic_status`
- `pending_resolution` is derived from `topic_resolution.resolution_status = 'pending'`
- there is no `comment` table; discursive content is carried by `post`
- homepage feed is backed by `home_feed_topic_cache`, not `v_home_feed_topics`

## Seed files present in the repo

- `supabase/seed/minimal_reference_data.sql`
- `supabase/seed/minimal_ux_seed.sql`
- `supabase/seed/massive_showcase_seed.sql`

## Real state observed in preproduction

Snapshot taken through MCP on 2026-04-03:

- public spaces: `20`
- public topics: `220`
- open topics: `87`
- locked topics: `68`
- resolved topics: `44`
- archived topics: `21`
- pending resolutions: `141`
- visible posts: `1254`
- public polls: `8`
- public profiles: `240`
- active cards: `27`
- card inventory rows: `150`
- reputation rows: `720`
- prediction submissions: `5020`
- homepage feed rows: `220`

Prediction type coverage:

- `binary`: `34`
- `date_value`: `32`
- `categorical_closed`: `32`
- `bounded_percentage`: `32`
- `bounded_volume`: `30`
- `bounded_integer`: `30`
- `ordinal_scale`: `30`

Derived lifecycle coverage in `home_feed_topic_cache`:

- `open`: `87`
- `locked`: `7`
- `pending_resolution`: `57`
- `resolved`: `48`
- `archived`: `21`

Territorial coverage in homepage feed:

- `macro`: `16`
- `country`: `24`
- `region`: `32`
- `department`: `71`
- `commune`: `77`

## Validation queries used

Main volumetry:

```sql
select
  (select count(*) from public.space where visibility='public') as public_spaces,
  (select count(*) from public.topic where visibility='public') as public_topics,
  (select count(*) from public.topic where topic_status='open') as open_topics,
  (select count(*) from public.topic where topic_status='locked') as locked_topics,
  (select count(*) from public.topic where topic_status='resolved') as resolved_topics,
  (select count(*) from public.topic where topic_status='archived') as archived_topics,
  (select count(*) from public.topic_resolution where resolution_status='pending') as pending_resolutions,
  (select count(*) from public.post where post_status='visible') as visible_posts,
  (select count(*) from public.poll where visibility='public') as public_polls,
  (select count(*) from public.app_profile where is_public_profile_enabled = true and profile_status='active') as public_profiles,
  (select count(*) from public.card_catalog where is_active = true) as active_cards,
  (select count(*) from public.user_card_inventory) as card_inventory_rows,
  (select count(*) from public.reputation_ledger) as reputation_rows,
  (select count(*) from public.prediction_submission) as submission_rows,
  (select count(*) from public.home_feed_topic_cache) as home_feed_rows;
```

Prediction type coverage:

```sql
select prediction_type, count(*) as count
from public.prediction_question
group by prediction_type
order by prediction_type;
```

Derived lifecycle coverage:

```sql
select derived_lifecycle_state, count(*) as count
from public.home_feed_topic_cache
group by derived_lifecycle_state
order by derived_lifecycle_state;
```

Territory coverage:

```sql
select primary_territory_level, count(*) as count
from public.home_feed_topic_cache
group by primary_territory_level
order by primary_territory_level;
```

Product realism samples:

```sql
select topic_slug, topic_title, space_name, primary_territory_name, prediction_type,
       derived_lifecycle_state, visible_post_count, feed_reason_label
from public.home_feed_topic_cache
order by editorial_feed_rank asc nulls last
limit 5;
```

```sql
select s.slug, s.name, count(t.id) as topic_count
from public.space s
left join public.topic t on t.space_id = s.id and t.visibility='public'
group by s.id, s.slug, s.name
order by topic_count desc, s.slug
limit 5;
```

```sql
select tr.name as territory_name, tr.territory_level, v.topic_count
from public.v_territory_rollup_topic_count v
join public.territory_reference tr on tr.id = v.territory_id
order by v.topic_count desc, tr.name
limit 5;
```

```sql
select p.display_name, tr.name as territory_name,
       coalesce(cards.card_count, 0) as visible_card_count
from public.v_public_profiles p
left join public.territory_reference tr on tr.id = p.public_territory_id
left join (
  select user_id, count(*) as card_count
  from public.v_public_user_card_showcase
  group by user_id
) cards on cards.user_id = p.user_id
order by visible_card_count desc, p.display_name
limit 5;
```

## What was actually applied

No new write query was committed on 2026-04-03.

Reason:

- the target preproduction project already contains a seeded corpus that exceeds the `minimal UX` target
- the same environment also already contains a `massive showcase` style corpus, including `196` topics with slug pattern `showcase-topic-*`
- attempting to inject a second independent corpus would duplicate content, create noise in read models, and make UX evaluation less reliable

## Interpretation

The current preproduction environment already satisfies the intended seed goals:

- homepage feed is alive
- all `prediction_type` values are represented
- public states are visible
- pending resolutions are visible
- territories are visible across levels
- public profiles are visible
- cards are visible
- reputation is non-empty
- topic, space, territory, and profile level surfaces can be evaluated credibly

## Residual risk

- the repository now contains a versioned `massive_showcase_seed.sql`, but it focuses on the massive editorial layer and expects the minimal layer to be in place first
- if the environment is reset from a truly empty state, the profile density currently visible in shared preproduction still depends on the pre-existing user corpus of that environment
- if full reproducibility is required from a clean branch, the next step is to extend the showcase seed so it also provisions the larger public profile corpus

