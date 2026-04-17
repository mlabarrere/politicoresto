# Polls MVP (historique)

Statut: document historique partiellement valide.

Reference canonique actuelle:

- `docs/metier.md` (rules produit)
- `docs/front-back-contract.md` (contrat SQL)
- `docs/testing-strategy.md` (tests de non-regression)

## Snapshot historique

## Scope
- Poll attached to original post item.
- One question.
- One vote per user.
- Max deadline 48h.
- Public outputs only:
  - raw result
  - corrected estimate
  - representativity score

## SQL objects
- `post_poll`
- `post_poll_option`
- `post_poll_response`
- `post_poll_target_distribution`
- `post_poll_snapshot`
- `v_post_poll_summary`
- `create_post_poll(...)`
- `submit_post_poll_vote(...)`
- `recompute_post_poll_snapshot(...)`

## Frontend surfaces
- Feed inline block in post card.
- Post detail block.
- Poll explorer page `/polls`.
- Post composer poll mode.

## Wording guardrails
- Voluntary panel.
- Non-probabilistic sample.
- Corrected estimate can still move.
