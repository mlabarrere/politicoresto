# UI Audit and Replacement Plan - Catalyst Unification

## Scope
- Home page
- Category page
- Polls list
- Shared layout and interaction primitives

## Matrix
| Existing component/pattern | Usage | Catalyst target | Action |
|---|---|---|---|
| `components/ui/button` + local variants + raw buttons | CTA and interaction buttons | `CatalystButton` via `AppButton` | Replaced and consolidated |
| `components/ui/input` + raw input usage | Forms and settings | `CatalystInput` via `AppInput` | Replaced and consolidated |
| `components/ui/textarea` + raw textarea usage | Composer and settings | `CatalystTextarea` via `AppTextarea` | Replaced and consolidated |
| `components/ui/select` | Sorting/filtering/forms | `CatalystSelect` via `AppSelect` | Replaced and consolidated |
| `components/ui/tabs` | Post composer tabs | Headless UI tabs via `AppTabs` | Replaced |
| `app-card` / `soft-panel` utility classes | Cards/panels across pages | `AppCard` wrapper | Replaced, utility classes removed |
| `components/ui/alert` + local empty/screen states | Empty/error/info states | `CatalystAlert` via `AppBanner` + `AppEmptyState` | Replaced and merged |
| `components/ui/sheet` and local drawers | Mobile nav/filter/auth prompts | `CatalystDialog` via `AppDrawer`/`AppModal` | Replaced and standardized |
| ad hoc filter rows | Feed/forum/polls filters | `AppFilterBar` | Replaced and merged |
| divergent feed cards (`domain/post-card`, polls list cards) | Home/category/polls cards | `AppFeedItem` and `AppPollFeedItem` | Unified |
| ad hoc page intro blocks | Page headers/intros | `AppPageHeader` | Replaced |

## Cleanup
- Removed dead `components/ui/*` primitives no longer used (`button`, `card`, `input`, `select`, `tabs`, `textarea`, `sheet`, `alert`, `button-variants`).
- Updated tests to enforce wrapper usage and prevent regressions.
