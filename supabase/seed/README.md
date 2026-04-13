# Supabase Seed Notes

## Current files

- `minimal_reference_data.sql`
- `minimal_ux_seed.sql`
- `massive_showcase_seed.sql`

## Current preproduction state

The preproduction project audited on 2026-04-03 already contains:

- a full minimal UX corpus
- a larger showcase corpus with `196` `showcase-topic-*` topics
- enough density to evaluate homepage, topic, space, territory, profile, cards, and reputation screens

## `massive_showcase_seed.sql`

The repository now contains a deterministic `massive_showcase_seed.sql`.

Its purpose is to reproduce the large editorial layer already observed in preproduction:

- `showcase-topic-*` topics
- dense posts
- dense submissions
- pending and resolved outcomes

It assumes the minimal layer has already established:

- territories
- baseline spaces
- taxonomy terms
- a usable set of public profiles

## Recommended next step

If strict end-to-end reproducibility is required from an empty project, the next refinement is to make the showcase file also generate the larger public profile corpus currently present in shared preproduction.
