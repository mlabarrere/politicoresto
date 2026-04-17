# UI Audit and Replacement Plan - Catalyst Unification

Statut: majoritairement applique, a maintenir en continu.

## Scope couvert

- Homepage
- Category page
- Polls list
- Shared layout and interaction primitives

## Matrice de convergence

| Existant | Cible | Action |
|---|---|---|
| `components/ui/button` + variantes locales | `AppButton` | Fusionne |
| `components/ui/input` + inputs libres | `AppInput` | Fusionne |
| `components/ui/textarea` + textareas libres | `AppTextarea` | Fusionne |
| `components/ui/select` | `AppSelect` | Fusionne |
| `components/ui/tabs` | `AppTabs` | Remplace |
| classes `app-card`/`soft-*` | `AppCard` | Supprime |
| `components/ui/alert` + etats locaux | `AppBanner`/`AppEmptyState` | Fusionne |
| `components/ui/sheet` + drawers locaux | `AppDrawer`/`AppModal` | Standardise |
| barres filtres ad hoc | `AppFilterBar` | Fusionne |
| cartes feed divergentes | `AppFeedItem` | Unifie |
| headers ad hoc | `AppPageHeader` | Remplace |

## Guardrails

- Interdit: imports directs `components/catalyst/*` hors wrappers.
- Interdit: nouvelles primitives `components/ui/*` legacy.
- Obligation: toute UI partagee passe par `components/app/*`.
